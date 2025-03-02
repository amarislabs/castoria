import { type ResultAsync, okAsync } from "neverthrow";
import { type PackageJson, getPackageVersion } from "#/adapters/formats/package-json";
import { getConfig } from "#/core/config";
import { CWD_PACKAGE_PATH } from "#/core/constants";
import { createContext, getGlobalContext } from "#/core/context";
import { verifyPipeline } from "#/pipelines/verify";
import { type RollbackOperation, createRollbackStack, executeRollbackWithFallback } from "#/rollback";
import type { CastoriaConfig } from "#/types/config";
import type { CastoriaContext } from "#/types/context";
import type { CastoriaOptions } from "#/types/options";
import { getJsonFromFile } from "#/utils/filesystem";
import logger from "#/utils/logger";

/**
 * Initializes the pipeline with the provided options.
 *
 * @param options The options to initialize the pipeline with.
 * @returns Either an error or void.
 */
export function initializePipeline(options: CastoriaOptions): ResultAsync<void, Error> {
    const rollbackStack: RollbackOperation[] = createRollbackStack();

    return createPipelineContext(options)
        .andThen(verifyPipeline)
        .andThen((): ResultAsync<void, Error> => okAsync(undefined))
        .mapErr((error: Error): Promise<Error> => {
            logger.error(error.message);

            return getGlobalContext()
                .map((context: CastoriaContext): Promise<Error> => {
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

function createPipelineContext(options: CastoriaOptions): ResultAsync<CastoriaContext, Error> {
    return getConfig()
        .andThen((config: CastoriaConfig): ResultAsync<CastoriaContext, Error> => {
            return createContext(options, config);
        })
        .andThen(enrichWithName)
        .andThen(enrichWithVersion);
}

/**
 * Enrich the context with the current version.
 *
 * @param context The Castoria context.
 * @returns The context back.
 */
function enrichWithVersion(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    function getVersion(): ResultAsync<string, Error> {
        return getJsonFromFile<PackageJson>(CWD_PACKAGE_PATH).andThen(getPackageVersion);
    }

    return getVersion().map(
        (version: string): CastoriaContext => ({
            ...context,
            currentVersion: version,
        })
    );
}

/**
 * Enrich the context with the current name.
 *
 * @param context The Castoria context.
 * @returns The context back.
 */
function enrichWithName(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    function getName(): ResultAsync<string, Error> {
        return getJsonFromFile<PackageJson>(CWD_PACKAGE_PATH).map((json: PackageJson): string => json.name);
    }

    if (context.options.name.trim() === "") {
        return getName().map(
            (name: string): CastoriaContext => ({
                ...context,
                options: {
                    ...context.options,
                    name,
                },
            })
        );
    }

    return okAsync({
        ...context,
        options: {
            ...context.options,
            name: context.options.name,
        },
    });
}
