import { type ResultAsync, errAsync, okAsync } from "neverthrow";
import { runGit } from "#/adapters/git";
import { CWD_GIT_CLIFF_PATH } from "#/core/constants";
import type { CastoriaContext } from "#/types/context";
import { fileExists } from "#/utils/filesystem";
import logger from "#/utils/logger";

/**
 * Verifies general conditions from the user-side to run the pipeline.
 *
 * @param context The Castoria context.
 * @returns The context back.
 */
export function verifyConditions(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    logger.log("Verifying conditions...");

    return checkGitCliffConfig(context)
        .andThen(checkGitRepository)
        .andThen(checkBranch)
        .andThen(checkUncommittedChanges)
        .andThen(checkUpstreamBranch)
        .andTee((): void => logger.log("Verification passed!"));
}

/**
 * Checks for the presence of a cliff.toml file in the current working directory.
 *
 * @param context The Castoria context.
 * @returns The context back.
 */
function checkGitCliffConfig(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    return fileExists(CWD_GIT_CLIFF_PATH)
        .andTee((): void => logger.verbose("Checking for cliff.toml in the current working directory."))
        .andThen((exists: boolean): ResultAsync<CastoriaContext, Error> => {
            return exists
                ? okAsync(context)
                : errAsync(new Error("Could not find cliff.toml in the current working directory."));
        });
}

/**
 * Check if the current working directory is a git repository.
 *
 * @param context The Castoria context.
 * @returns The context back.
 */
function checkGitRepository(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    return runGit(["rev-parse", "--is-inside-work-tree"], context).andThen(
        (result: string): ResultAsync<CastoriaContext, Error> => {
            return context.options.dryRun
                ? okAsync(context)
                : result.trim() === "true"
                  ? okAsync(context)
                  : errAsync(new Error("Could not find a git repository in the current working directory."));
        }
    );
}

/**
 * Check if the current branch is allowed for releasing.
 *
 * @param context The Castoria context.
 * @returns The context back.
 */
function checkBranch(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (!context.config.git.requireBranch) {
        logger.verbose("Skipping branch check as it is not required.");
        return okAsync(context);
    }

    const branches: string | string[] = context.config.git.branches;

    return runGit(["rev-parse", "--abbrev-ref", "HEAD"], context).andThen(
        (result: string): ResultAsync<CastoriaContext, Error> => {
            return context.options.dryRun
                ? okAsync(context)
                : branches.includes(result.trim())
                  ? okAsync(context)
                  : errAsync(new Error(`Current branch is not allowed for releasing. Allowed branches: ${branches}`));
        }
    );
}

/**
 * Check if there are uncommitted changes in the current working directory.
 *
 * @param context The Castoria context.
 * @returns The context back.
 */
function checkUncommittedChanges(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (!context.config.git.requireCleanWorkingDirectory) {
        logger.verbose("Skipping uncommitted changes check as clean working directory is not required.");
        return okAsync(context);
    }

    if (context.options.dryRun) {
        return okAsync(context);
    }

    return runGit(["status", "--porcelain"], context).andThen((result): ResultAsync<CastoriaContext, Error> => {
        return context.options.dryRun
            ? okAsync(context)
            : result.trim() === ""
              ? okAsync(context)
              : errAsync(new Error("There are uncommitted changes in the current working directory."));
    });
}

/**
 * Check if there is an upstream branch set for the current branch.
 *
 * @param context The Castoria context.
 * @returns The context back.
 */
function checkUpstreamBranch(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (!context.config.git.requireUpstream) {
        logger.verbose("Skipping upstream branch check as it is not required.");
        return okAsync(context);
    }

    return runGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], context).andThen(
        (result: string): ResultAsync<CastoriaContext, Error> => {
            return context.options.dryRun
                ? okAsync(context)
                : result.trim() !== ""
                  ? okAsync(context)
                  : errAsync(
                        new Error(
                            "No upstream branch found. Please set an upstream branch before running this command."
                        )
                    );
        }
    );
}
