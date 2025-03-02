import { type ResultAsync, okAsync } from "neverthrow";
import type { RepositoryIdentifier } from "#/types";
import type { CastoriaConfig } from "#/types/config";
import type { CastoriaContext } from "#/types/context";
import type { CastoriaOptions } from "#/types/options";
import { deepMerge } from "#/utils";
import logger from "#/utils/logger";

/**
 * Default configuration for Castoria.
 */
export function createDefaultConfig(): CastoriaConfig {
    return {
        changelog: {
            enabled: true,
            path: "CHANGELOG.md",
        },
        git: {
            repository: "auto",
            requireBranch: false,
            branches: ["main", "master"],
            requireCleanWorkingDirectory: true,
            requireUpstream: false,
            commitMessage: "chore(release): {{name}}@{{version}}",
            tagName: "v{{version}}",
            tagAnnotation: "v{{version}}",
        },
        github: {
            release: {
                enabled: true,
                title: "v{{version}}",
            },
        },
    };
}

/**
 * Default options for Castoria.
 */
export function createDefaultOptions(): CastoriaOptions {
    return {
        verbose: false,
        dryRun: false,
        ci: false,
        name: "",
        bumpStrategy: "",
        releaseType: "",
        preReleaseId: "",
        preReleaseBase: "0",
    };
}

/**
 * Default context for Castoria.
 */
export function createDefaultContext(): CastoriaContext {
    return {
        config: createDefaultConfig(),
        options: createDefaultOptions(),
        currentVersion: "0.0.0",
        nextVersion: "",
        changelogContent: "",
    };
}

let globalContext: CastoriaContext = createDefaultContext();

/**
 * Updates the global context with the provided context.
 *
 * @param context The context to update.
 * @returns The updated context.
 */
export function updateGlobalContext(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    globalContext = { ...context };
    return okAsync(globalContext);
}

/**
 * This function returns the global context.
 *
 * @returns The global context.
 */
export function getGlobalContext(): ResultAsync<CastoriaContext, Error> {
    return okAsync(globalContext);
}

/**
 * Creates a new context based on the provided options and configuration.
 *
 * @param options The options to apply.
 * @param configuration The configuration to apply.
 * @returns The new context.
 */
export function createContext(
    opts: Partial<CastoriaOptions>,
    conf: Partial<CastoriaConfig>
): ResultAsync<CastoriaContext, Error> {
    const context: CastoriaContext = {
        ...createDefaultContext(),
        options: deepMerge({ ...createDefaultOptions() }, opts),
        config: deepMerge({ ...createDefaultConfig() }, conf),
    };
    logger.trace("Created a new context");

    return updateGlobalContext(context);
}

/**
 * Updates the next version in the given context.
 *
 * @param context The context to update.
 * @param version The new version to set.
 * @returns The updated context.
 */
export function updateVersionInContext(context: CastoriaContext, version: string): ResultAsync<CastoriaContext, Error> {
    const updatedContext: CastoriaContext = {
        ...context,
        nextVersion: version,
    };
    logger.trace(`Updated context with the next version: ${version}`);

    return updateGlobalContext(updatedContext);
}

/**
 * Updates the changelog content in the given context.
 *
 * @param context The context to update.
 * @param version The new version to set.
 * @returns The updated context.
 */
export function updateChangelogContentInContext(
    context: CastoriaContext,
    content: string
): ResultAsync<CastoriaContext, Error> {
    const updatedContext: CastoriaContext = {
        ...context,
        changelogContent: content,
    };
    logger.trace(`Updated context with the changelog content: ${content}`);

    return updateGlobalContext(updatedContext);
}

/**
 * Updates the repository in the given context.
 *
 * @param context The context to update.
 * @param repository The repository identifier to set.
 * @returns The updated context.
 */
export function updateRepositoryInContext(
    context: CastoriaContext,
    repository: RepositoryIdentifier
): ResultAsync<CastoriaContext, Error> {
    const updatedContext: CastoriaContext = {
        ...context,
        config: {
            ...context.config,
            git: {
                ...context.config.git,
                repository,
            },
        },
    };
    logger.trace(`Updated context with the repository: ${repository}`);

    return updateGlobalContext(updatedContext);
}
