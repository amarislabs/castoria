import { type ResultAsync, errAsync, okAsync } from "neverthrow";
import { type TomlPrimitive, parse } from "smol-toml";
import { CWD_GIT_CLIFF_PATH } from "#/libs/const";
import { getTextFromFile } from "#/libs/filesystem";
import { createErrorFromUnknown } from "#/libs/utils/error";

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
 * Config structure for commit parsers in cliff.toml
 */
interface CommitParser {
    message: string;
    body: string;
    group: string;
    skip: boolean;
}

/**
 * Config structure for commit preprocessors in cliff.toml
 */
interface CommitPreprocessor {
    pattern: string;
    replace: string;
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
 * Complete cliff.toml configuration structure
 */
interface CliffToml {
    changelog: Partial<ChangelogConfig>;
    git: Partial<GitConfig>;
}

type Constructor<T> = new (...args: unknown[]) => T;

/**
 * Type guard to check if a value is a non-null object
 * @param input The value to check
 * @param constructorType The constructor type to check against
 */
function isObject<T extends Constructor<unknown> = ObjectConstructor>(
    input: unknown,
    constructorType?: T
): input is object {
    return typeof input === "object" && input ? input.constructor === (constructorType ?? Object) : false;
}

/**
 * Type guard to check if a value matches the CliffToml structure
 */
function isCliffToml(value: TomlPrimitive | unknown): value is CliffToml {
    return isObject(value);
}

/**
 * Parse the Git Cliff configuration content
 */
function parseCliffConfig(): ResultAsync<CliffToml, Error> {
    return getTextFromFile(CWD_GIT_CLIFF_PATH)
        .map(parse)
        .mapErr((error: unknown): Error => createErrorFromUnknown("Failed to parse Git Cliff configuration", error))
        .andThen(
            (config: TomlPrimitive): ResultAsync<CliffToml, Error> =>
                isCliffToml(config) ? okAsync(config) : errAsync(new Error("Invalid Git Cliff configuration format"))
        );
}

/**
 * Removes the header section from changelog content based on the cliff.toml configuration
 * @param content The changelog content
 */
export function removeHeaderFromChangelog(content: string): ResultAsync<string, Error> {
    return parseCliffConfig().andThen((config: CliffToml): ResultAsync<string, Error> => {
        const header: string | undefined = config.changelog?.header;
        if (!header) {
            return okAsync(content);
        }

        const headerIndex: number = content.indexOf(header);
        return headerIndex !== -1 ? okAsync(content.slice(headerIndex + header.length)) : okAsync(content);
    });
}
