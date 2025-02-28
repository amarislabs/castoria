import { colors } from "consola/utils";
import { type ResultAsync, okAsync } from "neverthrow";
import { executeGit, resolveCommitMessage } from "#/libs/git";
import { logger } from "#/libs/utils/logger";
import type { CastoriaContext } from "#/types/castoria";

/**
 * Stages all files in the repository.
 * @param context The Castoria context.
 */
function stageFiles(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.dryRun) {
        logger.info("Dry run enabled. Skipping staging changes.");
        return okAsync(context);
    }

    return executeGit(["add", "."], context)
        .andTee((): void => logger.info("Staged changes!"))
        .map((): CastoriaContext => context);
}

/**
 * Creates a commit with the staged changes.
 * @param context The Castoria context.
 */
function createCommit(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.dryRun) {
        logger.info("Dry run enabled. Skipping commit creation.");
        return okAsync(context);
    }

    const commitMessage: string = resolveCommitMessage(context);

    return executeGit(["commit", "-m", commitMessage], context)
        .andTee((): void => logger.info("Committed changes!"))
        .map((): CastoriaContext => context);
}

/**
 * Rolls back the commit.
 * @param context The Castoria context.
 */
export function rollbackCommit(context: CastoriaContext): ResultAsync<void, Error> {
    return executeGit(["reset", "--soft", "HEAD~1"], context).map((): void => undefined);
}

/**
 * Executes the commit pipeline to stage and commit changes.
 */
export function commitPipeline(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.bumpOnly || context.options.bumpOnlyWithChangelog) {
        const flag = context.options.bumpOnly ? "--bump-only" : "--bump-only-with-changelog";
        logger.info(`Skipping GitHub push creation ${colors.dim(`(${flag})`)}`);
        return okAsync(context);
    }

    if (context.options.skipCommit) {
        logger.info(`Skipping GitHub push creation ${colors.dim("(--skip-push)")}`);
        return okAsync(context);
    }

    logger.info(`Staging and committing changes... ${colors.dim(`(${resolveCommitMessage(context)})`)}`);
    return stageFiles(context).andThen(createCommit);
}
