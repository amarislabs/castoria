import { LogLevels } from "consola";
import { colors } from "consola/utils";
import { type ResultAsync, errAsync, okAsync } from "neverthrow";
import { getConfig } from "#/libs/config";
import { CWD_PACKAGE_PATH } from "#/libs/const";
import { createContext, getGlobalContext } from "#/libs/context";
import { getJsonFromFile } from "#/libs/filesystem";
import { getRepository } from "#/libs/git";
import { type PackageJson, getPackageName, getPackageVersion } from "#/libs/package-json";
import {
    type RollbackOperation,
    addRollbackOperation,
    createRollbackStack,
    executeRollbackWithFallback,
} from "#/libs/rollback";
import { logger } from "#/libs/utils/logger";
import { bumpPipeline, rollbackBump } from "#/pipelines/bump";
import { changelogPipeline, rollbackChangelog } from "#/pipelines/changelog";
import { commitPipeline, rollbackCommit } from "#/pipelines/commit";
import { promptVersionPipeline } from "#/pipelines/prompt-version";
import { pushPipeline, rollbackPush, rollbackPushTags } from "#/pipelines/push";
import { releasePipeline } from "#/pipelines/release";
import { rollbackTag, tagPipeline } from "#/pipelines/tag";
import { verifyPipeline } from "#/pipelines/verify";
import type { Repository, RepositoryMetadata } from "#/types";
import type { CastoriaConfig, CastoriaContext, CastoriaOptions } from "#/types/castoria";

/**
 * Execute an operation with a rollback operation.
 * @param operation The operation
 * @param rollbackOp The rollback operation, if any
 * @param description A description for the operation
 * @param context The context to execute the operation
 * @param rollbackStack The stack for rollback operations
 */
function executeWithRollback<T>(
    operation: (context: T) => ResultAsync<T, Error>,
    rollbackOp: ((context: CastoriaContext) => ResultAsync<void, Error>) | null,
    description: string,
    context: T,
    rollbackStack: RollbackOperation[]
): ResultAsync<T, Error> {
    return operation(context).map((result: T): T => {
        if (rollbackOp) {
            addRollbackOperation(rollbackStack, rollbackOp, description);
        }
        return result;
    });
}

/**
 * Get the package name from the options or the package.json file.
 * @param options The Castoria options.
 */
function getName(options: CastoriaOptions): ResultAsync<string, Error> {
    if (options.name.trim() === "") {
        return getJsonFromFile<PackageJson>(CWD_PACKAGE_PATH).andThen(getPackageName);
    }

    return okAsync(options.name);
}

/**
 * Get the version from the package.json file.
 */
function getVersion(): ResultAsync<string, Error> {
    return getJsonFromFile<PackageJson>(CWD_PACKAGE_PATH).andThen(getPackageVersion);
}

/**
 * Enrich the context with the current version.
 * @param context The Castoria context.
 */
function enrichWithVersion(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    return getVersion().map(
        (version: string): CastoriaContext => ({
            ...context,
            currentVersion: version,
        })
    );
}

/**
 * Enrich the context with the package name.
 * @param context The Castoria context.
 */
function enrichWithPackageName(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    return getName(context.options).map(
        (name: string): CastoriaContext => ({
            ...context,
            options: {
                ...context.options,
                name,
            },
        })
    );
}

/**
 * Enrich the context with the repository metadata.
 * @param context The Castoria context.
 */
function enrichWithRepository(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.config.git.repository === "auto") {
        return getRepository(context).map(
            (repository: Repository): CastoriaContext => ({
                ...context,
                config: {
                    ...context.config,
                    git: {
                        ...context.config.git,
                        repository: {
                            owner: repository.split("/")[0],
                            repo: repository.split("/")[1],
                        },
                    },
                },
            })
        );
    }

    /**
     * Validate the repository format.
     * @param repository The repository string.
     */
    function validateRepositoryFormat(repository: RepositoryMetadata): ResultAsync<string, Error> {
        const { owner, repo } = repository;
        if (owner.trim() === "" || repo.trim() === "") {
            return errAsync(new Error("Invalid repository format. Expected `owner/repo`."));
        }

        return okAsync(`${owner}/${repo}`);
    }

    return validateRepositoryFormat(context.config.git.repository).map(
        (repository: string): CastoriaContext => ({
            ...context,
            config: {
                ...context.config,
                git: {
                    ...context.config.git,
                    repository: repository as unknown as RepositoryMetadata,
                },
            },
        })
    );
}

/**
 * Create a context from the provided options.
 * @param options The options for creating the context.
 */
function createContextFromOptions(options: CastoriaOptions) {
    if (options.verbose) logger.level = LogLevels.verbose;

    return getConfig()
        .andThen((config: CastoriaConfig) => {
            if (options.githubReleaseDraft && !options.githubReleasePrerelease) {
                return errAsync(new Error("A draft release must be a prerelease."));
            }

            if (options.githubReleaseLatest && (options.githubReleaseDraft || options.githubReleasePrerelease)) {
                return errAsync(new Error("A latest release cannot be a draft or prerelease."));
            }

            if (options.githubReleasePrerelease && options.githubReleaseDraft) {
                return errAsync(new Error("A prerelease cannot be a draft."));
            }

            return okAsync({
                config,
                options,
            });
        })
        .andThen(({ config, options }) => {
            return createContext(options, config);
        })
        .andThen(enrichWithVersion)
        .andThen(enrichWithPackageName)
        .andThen(enrichWithRepository)
        .andTee(() => logger.verbose("Context created successfully."));
}

/**
 * Simulates an error to test rollback functionality.
 * @param context The Castoria context.
 */
function simulateError(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    return executeWithRollback(
        (_context) => {
            return errAsync(new Error("Simulated error to test rollback"));
        },
        null,
        "Simulated error operation",
        context,
        createRollbackStack()
    );
}

declare const VERSION: string;

/**
 * Executes the pipeline to initialize the versioning process.
 */
export function initializePipeline(options: CastoriaOptions): ResultAsync<void, Error> {
    const rollbackStack: RollbackOperation[] = createRollbackStack();

    logger.start(`Running ${colors.magenta("Castoria")} version ${colors.dim(VERSION)}`);

    return createContextFromOptions(options)
        .andThen(verifyPipeline)
        .andThen((context: CastoriaContext): ResultAsync<CastoriaContext, Error> => {
            if (process.env.SIMULATE_ERROR_ROLLBACK) {
                return simulateError(context);
            }

            return okAsync(context);
        })
        .andThen(promptVersionPipeline)
        .andThen((context: CastoriaContext): ResultAsync<CastoriaContext, Error> => {
            return executeWithRollback(
                bumpPipeline,
                rollbackBump,
                "Pipeline for bumping version",
                context,
                rollbackStack
            );
        })
        .andThen((context: CastoriaContext): ResultAsync<CastoriaContext, Error> => {
            return executeWithRollback(
                changelogPipeline,
                rollbackChangelog,
                "Pipeline for generating changelog",
                context,
                rollbackStack
            );
        })
        .andThen((context: CastoriaContext): ResultAsync<CastoriaContext, Error> => {
            return executeWithRollback(
                commitPipeline,
                rollbackCommit,
                "Pipeline for generating commit",
                context,
                rollbackStack
            );
        })
        .andThen((context: CastoriaContext): ResultAsync<CastoriaContext, Error> => {
            return executeWithRollback(tagPipeline, rollbackTag, "Pipeline for generating tag", context, rollbackStack);
        })
        .andThen((context: CastoriaContext): ResultAsync<CastoriaContext, Error> => {
            return executeWithRollback(
                pushPipeline,
                (context: CastoriaContext): ResultAsync<void, Error> =>
                    rollbackPush(context).andThen((): ResultAsync<void, Error> => rollbackPushTags(context)),
                "Pipeline for push commit and tag",
                context,
                rollbackStack
            );
        })
        .andThen((context: CastoriaContext): ResultAsync<CastoriaContext, Error> => {
            return executeWithRollback(releasePipeline, null, "Pipeline for creating release", context, rollbackStack);
        })
        .andThen((): ResultAsync<void, Error> => okAsync(undefined))
        .mapErr((error: Error): Promise<Error> => {
            logger.error(error.message);

            return getGlobalContext()
                .map((context: CastoriaContext) => {
                    return executeRollbackWithFallback(context, rollbackStack)
                        .map((): Error => {
                            process.exit(1);
                            return error;
                        })
                        .unwrapOr(error);
                })
                .unwrapOr(error);
        });
}
