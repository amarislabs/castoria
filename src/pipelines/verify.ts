import { type ResultAsync, errAsync, okAsync } from "neverthrow";
import { CWD_GIT_CLIFF_PATH } from "#/libs/const";
import { fileExists } from "#/libs/filesystem";
import { type GitCommandResult, executeGit } from "#/libs/git";
import { logger } from "#/libs/utils/logger";
import type { CastoriaContext } from "#/types/castoria";

/**
 * Check if the cliff.toml file exists in the current working directory.
 * @param context The Castoria context.
 */
function checkGitCliffConfig(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.dryRun) {
        logger.verbose("Skipping cliff.toml check in dry-run mode");
        return okAsync(context);
    }

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
 * @param context The Castoria context.
 */
function checkGitRepository(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    return executeGit(["rev-parse", "--is-inside-work-tree"], context).andThen(
        (result: GitCommandResult): ResultAsync<CastoriaContext, Error> => {
            return context.options.dryRun
                ? okAsync(context)
                : result.stdout === "true"
                  ? okAsync(context)
                  : errAsync(new Error("Could not find a git repository in the current working directory."));
        }
    );
}

/**
 * Check if the current branch is allowed for releasing.
 * @param context The Castoria context.
 */
function checkBranch(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (!context.config.git.requireBranch) {
        logger.verbose("Skipping branch check as it is not required.");
        return okAsync(context);
    }

    const branches: string | string[] = context.config.git.branches;

    return executeGit(["rev-parse", "--abbrev-ref", "HEAD"], context).andThen(
        (result): ResultAsync<CastoriaContext, Error> => {
            return context.options.dryRun
                ? okAsync(context)
                : branches.includes(result.stdout.trim())
                  ? okAsync(context)
                  : errAsync(new Error(`Current branch is not allowed for releasing. Allowed branches: ${branches}`));
        }
    );
}

/**
 * Check if there are uncommitted changes in the current working directory.
 * @param context The Castoria context.
 */
function checkUncommittedChanges(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (!context.config.git.requireCleanWorkingDir) {
        logger.verbose("Skipping uncommitted changes check as clean working directory is not required.");
        return okAsync(context);
    }

    return executeGit(["status", "--porcelain"], context, "Error checking for uncommitted changes").andThen(
        (result: GitCommandResult): ResultAsync<CastoriaContext, Error> => {
            return context.options.dryRun
                ? okAsync(context)
                : result.stdout === ""
                  ? okAsync(context)
                  : errAsync(new Error("There are uncommitted changes in the current working directory."));
        }
    );
}

/**
 * Check if there is an upstream branch set for the current branch.
 * @param context The Castoria context.
 */
function checkUpstreamBranch(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (!context.config.git.requireUpstream) {
        logger.verbose("Skipping upstream branch check as it is not required.");
        return okAsync(context);
    }

    return executeGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], context).andThen(
        (result: GitCommandResult): ResultAsync<CastoriaContext, Error> => {
            return context.options.dryRun
                ? okAsync(context)
                : result.stdout !== ""
                  ? okAsync(context)
                  : errAsync(
                        new Error(
                            "No upstream branch found. Please set an upstream branch before running this command."
                        )
                    );
        }
    );
}

/**
 * Executes the verify pipeline to ensure the conditions are met before creating a release.
 */
export function verifyPipeline(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    return checkGitCliffConfig(context)
        .andThen(checkGitRepository)
        .andThen(checkBranch)
        .andThen(checkUncommittedChanges)
        .andThen(checkUpstreamBranch);
}
