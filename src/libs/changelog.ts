import { type Options as GitCliffOptions, runGitCliff } from "git-cliff";
import { ResultAsync, okAsync } from "neverthrow";
import { CWD_GIT_CLIFF_PATH } from "#/libs/const";
import { updateChangelogInContext } from "#/libs/context";
import { createFileIfNotExists } from "#/libs/filesystem";
import { getRepository, getToken, resolveTagName } from "#/libs/git";
import { flattenMultilineText } from "#/libs/utils";
import { createErrorFromUnknown } from "#/libs/utils/error";
import { logger } from "#/libs/utils/logger";
import type { Repository } from "#/types";
import type { CastoriaContext } from "#/types/castoria";

/**
 * Creates the initial Git Cliff options for changelog generation
 *
 * @param context The Castoria context
 * @returns Base Git Cliff options
 */
function createGitCliffOptions(context: CastoriaContext): GitCliffOptions {
    return {
        tag: resolveTagName(context),
        unreleased: true,
        config: CWD_GIT_CLIFF_PATH,
        output: "-",
    };
}

/**
 * Adds GitHub repository information to Git Cliff options
 *
 * @param context The Castoria context
 * @param options The Git Cliff options with token
 * @returns Enhanced options with GitHub repository
 */
function addGithubRepositoryToOptions(
    context: CastoriaContext,
    options: GitCliffOptions
): ResultAsync<GitCliffOptions, Error> {
    if (context.config.git.repository === "auto") {
        return getRepository(context).map(
            (repository: Repository): GitCliffOptions => ({
                ...options,
                githubRepo: repository,
            })
        );
    }

    const { owner, repo } = context.config.git.repository;
    return okAsync({
        ...options,
        githubRepo: `${owner}/${repo}`,
    });
}

/**
 * Adds prepend path to Git Cliff options if not in dry run mode
 *
 * @param context The Castoria context
 * @param options The Git Cliff options
 * @returns Enhanced options with prepend path
 */
function addPrependPathIfNeeded(
    context: CastoriaContext,
    options: GitCliffOptions
): ResultAsync<GitCliffOptions, Error> {
    if (!context.options.dryRun) {
        return okAsync({
            ...options,
            prepend: context.config.changelog.path,
        });
    }
    return okAsync(options);
}

/**
 * Enhances Git Cliff options with specific configuration
 *
 * @param options The base Git Cliff options
 * @param context The Castoria context
 * @returns Enhanced Git Cliff options
 */
function enhanceGitCliffOptions(
    options: GitCliffOptions,
    context: CastoriaContext
): ResultAsync<GitCliffOptions, Error> {
    return getToken(context)
        .map((token: string): GitCliffOptions => ({ ...options, githubToken: token }))
        .andThen(
            (optionsWithToken: GitCliffOptions): ResultAsync<GitCliffOptions, Error> =>
                addGithubRepositoryToOptions(context, optionsWithToken)
        )
        .andThen(
            (optionsWithRepo: GitCliffOptions): ResultAsync<GitCliffOptions, Error> =>
                addPrependPathIfNeeded(context, optionsWithRepo)
        );
}

/**
 * Executes Git Cliff with the provided options
 *
 * @param options The Git Cliff options
 * @returns The generated changelog content
 */
function executeGitCliff(options: GitCliffOptions): ResultAsync<string, Error> {
    return ResultAsync.fromPromise(
        runGitCliff(options, { stdio: "pipe" }),
        (error: unknown): Error => createErrorFromUnknown("Failed to generate changelog", error)
    ).map(({ stdout }): string => stdout);
}

/**
 * Handles the creation of the changelog file
 *
 * @param context The Castoria context
 * @returns Success result if file exists or was created
 */
function handleFileCreation(context: CastoriaContext): ResultAsync<boolean, Error> {
    if (context.options.dryRun) {
        return okAsync(true);
    }

    return createFileIfNotExists(context.config.changelog.path).mapErr((error: Error): Error => {
        logger.error("Error creating changelog file:", error);
        return error;
    });
}

/**
 * Generates a changelog using Git Cliff
 *
 * @param context The Castoria context
 * @returns Updated context with changelog content
 */
export function generateChangelog(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.dryRun) {
        logger.info("Dry run enabled. Skipping generation of changelog");
        return okAsync(context);
    }

    return handleFileCreation(context)
        .andThen(
            (): ResultAsync<GitCliffOptions, Error> => enhanceGitCliffOptions(createGitCliffOptions(context), context)
        )
        .andThen(executeGitCliff)
        .andTee((content: string): void => logger.verbose(`Changelog content: ${flattenMultilineText(content)}`))
        .andThen((content: string): ResultAsync<CastoriaContext, Error> => {
            return updateChangelogInContext(context, content).andTee((): void => logger.info("Changelog updated!"));
        })
        .mapErr((error: unknown): Error => {
            logger.error("Failed to generate changelog:", error);
            return error instanceof Error ? error : new Error("Changelog generation failed");
        });
}
