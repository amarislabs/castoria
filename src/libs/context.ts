import { type ResultAsync, okAsync } from "neverthrow";
import { logger } from "#/libs/utils/logger";
import type { CastoriaConfig, CastoriaContext, CastoriaOptions } from "#/types/castoria";

/**
 * Default configuration options.
 */
export function createDefaultConfiguration(): CastoriaConfig {
    return {
        changelog: {
            enabled: true,
            path: "CHANGELOG.md",
        },
        git: {
            repository: "auto",
            requireBranch: false,
            branches: ["main", "master"],
            requireCleanWorkingDir: true,
            requireUpstream: false,
            commitMessage: "chore(release): {{name}}@{{version}}",
            tagName: "v{{version}}",
            tagAnnotation: "v{{version}}",
        },
        github: {
            release: {
                enabled: true,
                title: "Release v{{version}}",
            },
        },
    };
}

/**
 * Default options for coomand line flags and options.
 */
function createDefaultOptions(): CastoriaOptions {
    return {
        verbose: false,
        dryRun: false,
        name: "",
        ci: false,
        bumpStrategy: "manual",
        releaseType: "",
        preReleaseId: "",
        preReleaseBase: "0",
        skipBump: false,
        skipChangelog: false,
        skipRelease: false,
        skipTag: false,
        skipCommit: false,
        skipPush: false,
        skipPushTag: false,
        bumpOnly: false,
        bumpOnlyWithChangelog: false,
        githubReleaseDraft: false,
        githubReleasePrerelease: false,
        githubReleaseLatest: true,
    };
}

/**
 * Creates a new Castoria context with default values.
 */
export function createDefaultContext(): CastoriaContext {
    return {
        options: createDefaultOptions(),
        config: createDefaultConfiguration(),
        currentVersion: "0.0.0",
        nextVersion: "",
        changelogContent: "",
    };
}

let globalContext: CastoriaContext = createDefaultContext();

/**
 * Updates the global context and returns the new state.
 *
 * @param context - New context state
 */
export function updateGlobalContext(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    logger.verbose("Updating global context state");
    globalContext = { ...context };
    return okAsync(globalContext);
}

/**
 * Retrieves the current global context state
 */
export function getGlobalContext(): ResultAsync<CastoriaContext, Error> {
    return okAsync(globalContext);
}

/**
 * Creates a new context by merging provided options and configuration
 * @param options - CLI command options
 * @param configuration - File configuration options
 */
export function createContext(
    options: Partial<CastoriaOptions>,
    configuration: Partial<CastoriaConfig>
): ResultAsync<CastoriaContext, Error> {
    const context: CastoriaContext = {
        ...createDefaultContext(),
        options: { ...createDefaultOptions(), ...options },
        config: { ...createDefaultConfiguration(), ...configuration },
    };

    return updateGlobalContext(context);
}

/**
 * Updates the version fields in the context.
 *
 * @param context The current context
 * @param newVersion The new version to set
 */
export function updateVersionInContext(
    context: CastoriaContext,
    newVersion: string
): ResultAsync<CastoriaContext, Error> {
    logger.verbose(`Updating version from ${context.currentVersion} to ${newVersion} in context`);

    const updatedContext: CastoriaContext = {
        ...context,
        nextVersion: newVersion,
    };

    return updateGlobalContext(updatedContext);
}

/**
 * Updates the changelog content in the context.
 *
 * @param context The current context
 * @param content The new changelog content
 */
export function updateChangelogInContext(
    context: CastoriaContext,
    content: string
): ResultAsync<CastoriaContext, Error> {
    logger.verbose("Updating changelog content in context.");

    const updatedContext: CastoriaContext = {
        ...context,
        changelogContent: content,
    };

    return updateGlobalContext(updatedContext);
}
