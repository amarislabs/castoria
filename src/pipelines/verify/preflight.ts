import { type ResultAsync, errAsync } from "neverthrow";
import { runGit } from "#/adapters/git";
import type { CastoriaContext } from "#/types/context";
import { isCommandAvailable } from "#/utils";
import logger from "#/utils/logger";

/**
 * Verifies general conditions from the user-side to run the pipeline.
 *
 * @param context The Castoria context.
 * @returns The context back.
 */
export function preflightSystem(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    logger.log("Running preflight checks...");

    return checkGitAvailability(context).andTee((): void => logger.log("Preflight checks passed!"));
}

/**
 * Checks if Git is available in the system.
 *
 * @param context The Castoria context.
 * @returns Success if Git is available, error otherwise.
 */
function checkGitAvailability(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    return isCommandAvailable("git").andThen((available: boolean): ResultAsync<CastoriaContext, Error> => {
        if (!available) {
            return errAsync(new Error("Git is not available. Please install Git and try again."));
        }

        return checkGitVersion(context).map((): CastoriaContext => context);
    });
}

/**
 * Checks if Git version is adequate.
 *
 * @param context The Castoria context.
 * @returns Success if Git version is adequate, error otherwise.
 */
function checkGitVersion(context: CastoriaContext): ResultAsync<boolean, Error> {
    return runGit(["--version"], context, true).map((): boolean => {
        logger.verbose("Git is available");
        return true;
    });
}
