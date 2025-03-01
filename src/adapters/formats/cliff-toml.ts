import { type ResultAsync, errAsync, okAsync } from "neverthrow";
import { type TomlPrimitive, parse } from "smol-toml";
import { CWD_GIT_CLIFF_PATH } from "#/core/constants";
import { isToml } from "#/utils";
import { getTextFromFile } from "#/utils/filesystem";

/**
 * Complete cliff.toml configuration structure
 */
interface CliffToml {
    changelog: Partial<ChangelogConfig>;
    git: Partial<GitConfig>;
}

/**
 * Config structure for git section in cliff.toml
 */
interface GitConfig {
    conventionalCommits: boolean;
    filterUnconventional: boolean;
    commitParsers: CommitParser[];
    commitPreprocessors: CommitPreprocessor[];
    filterCommits: boolean;
    tagPattern: string;
    ignoreTags: string;
    topoOrder: boolean;
    sortCommits: string;
}

/**
 * Config structure for commit preprocessors in cliff.toml
 */
interface CommitPreprocessor {
    pattern: string;
    replace: string;
}

/**
 * Config structure for commit parsers in cliff.toml
 */
interface CommitParser {
    message: string;
    body: string;
    group: string;
    skip: boolean;
}

/**
 * Config structure for changelog section in cliff.toml
 */
interface ChangelogConfig {
    header: string;
    body: string;
    trim: boolean;
    footer: string;
}

/**
 * Parses the cliff.toml file located at the given path.
 *
 * @param path The path to the cliff.toml file.
 * @returns The parsed cliff.toml file.
 */
export function parseCliffToml(path: string): ResultAsync<CliffToml, Error> {
    return getTextFromFile(path)
        .map(parse)
        .mapErr((error: unknown): Error => new Error(`Failed to parse cliff.toml: ${error}`))
        .andThen((config: TomlPrimitive): ResultAsync<CliffToml, Error> => {
            if (!isToml<CliffToml>(config)) {
                return errAsync(new Error("Invalid cliff.toml format"));
            }

            return okAsync(config);
        });
}

/**
 * Removes the header section from changelog content based on the cliff.toml configuration
 *
 * @param content The changelog content
 * @returns The changelog content without the header
 */
export function removeHeaderFromChangelog(content: string): ResultAsync<string, Error> {
    return parseCliffToml(CWD_GIT_CLIFF_PATH).andThen((config: CliffToml): ResultAsync<string, Error> => {
        const header: string | undefined = config.changelog?.header;
        if (!header) {
            return okAsync(content);
        }

        const headerIndex: number = content.indexOf(header);
        return headerIndex !== -1 ? okAsync(content.slice(headerIndex + header.length)) : okAsync(content);
    });
}
