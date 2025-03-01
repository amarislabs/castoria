import { type Options as GitCliffOptions, runGitCliff as executeGitCliff } from "git-cliff";
import { type Result, ResultAsync, ok, okAsync } from "neverthrow";
import { getRepository } from "#/adapters/git/repository";
import { getToken } from "#/adapters/github/auth";
import { resolveTagName } from "#/core/config";
import { CWD_GIT_CLIFF_PATH } from "#/core/constants";
import { updateChangelogContentInContext } from "#/core/context";
import type { RepositoryIdentifier } from "#/types";
import type { CastoriaContext } from "#/types/context";
import { createFileIfNotExists } from "#/utils/filesystem";
import logger from "#/utils/logger";

/**
 * Generates a changelog using Git Cliff
 *
 * @param context The Castoria context
 * @returns Updated context with changelog content
 */
export function generateChangelog(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    return createGitCliffOptions(context)
        .andThen(runGitCliff)
        .andThen((content: string): ResultAsync<CastoriaContext, Error> => {
            return updateChangelogContentInContext(context, content);
        })
        .mapErr((error: Error): Error => {
            logger.error(error);
            return error;
        });
}

/**
 * Creates the initial Git Cliff options for changelog generation
 *
 * @param context The Castoria context
 * @returns The Git Cliff options
 */
function createGitCliffOptions(context: CastoriaContext): ResultAsync<GitCliffOptions, Error> {
    return handleFileCreation(context)
        .andThen(createDefaultGitCliffOptions)
        .andThen((options: GitCliffOptions): ResultAsync<GitCliffOptions, Error> => {
            return enhanceGitCliffOptions(options, context);
        });
}

/**
 * Executes Git Cliff with the provided options
 *
 * @param options The Git Cliff options
 * @returns The generated changelog content
 */
function runGitCliff(options: GitCliffOptions): ResultAsync<string, Error> {
    return ResultAsync.fromPromise(
        executeGitCliff(options, { stdio: "pipe" }),
        (error: unknown): Error => new Error(`Git Cliff execution error: ${error}`)
    ).map(({ stdout }): string => stdout);
}

/**
 * Creates the initial Git Cliff options for changelog generation
 *
 * @param context The Castoria context
 * @returns Base Git Cliff options
 */
function createDefaultGitCliffOptions(context: CastoriaContext): Result<GitCliffOptions, Error> {
    return ok({
        tag: resolveTagName(context),
        unreleased: true,
        config: CWD_GIT_CLIFF_PATH,
        output: "-",
    });
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
        .andThen((optionsWithToken: GitCliffOptions): ResultAsync<GitCliffOptions, Error> => {
            return configureRepository(context, optionsWithToken);
        })
        .andThen((optionsWithRepo: GitCliffOptions): ResultAsync<GitCliffOptions, Error> => {
            return configurePrependPathForChangelog(context, optionsWithRepo);
        });
}

/**
 * Handles the creation of the changelog file
 *
 * @param context The Castoria context
 * @returns Success result if file exists or was created
 */
function handleFileCreation(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.dryRun) {
        return okAsync(context);
    }

    return createFileIfNotExists(context.config.changelog.path)
        .map((): CastoriaContext => context)
        .mapErr((error: Error): Error => {
            logger.error("Error creating changelog file:", error);
            return error;
        });
}

/**
 * Configure the prepend path for changelog generation based on context.
 *
 * @param context The Castoria context
 * @param options The base Git Cliff options
 * @returns Updated Git Cliff options with the prepend path if needed
 */
function configurePrependPathForChangelog(
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
 * Configures the Git repository for Git Cliff options
 *
 * @param context The Castoria context
 * @param options The base Git Cliff options
 * @returns Updated Git Cliff options with the repository configuration
 */
function configureRepository(context: CastoriaContext, options: GitCliffOptions): ResultAsync<GitCliffOptions, Error> {
    if (context.config.git.repository !== "auto") {
        return okAsync({
            ...options,
            githubRepo: context.config.git.repository,
        });
    }

    return getRepository(context).andThen((identifier: RepositoryIdentifier): ResultAsync<GitCliffOptions, Error> => {
        return okAsync({
            ...options,
            githubRepo: identifier,
        });
    });
}
