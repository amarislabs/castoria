import { colors } from "consola/utils";
import { type ResultAsync, okAsync } from "neverthrow";
import { type GitCommandResult, executeGit, resolveTagName } from "#/libs/git";
import { logger } from "#/libs/utils/logger";
import { rollbackTag } from "#/pipelines/tag";
import type { CastoriaContext } from "#/types/castoria";

/**
 * Pushes changes to GitHub.
 * @param context The Castoria context.
 */
function createPush(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.dryRun) {
        logger.info("Dry run enabled. Skipping push creation.");
        return okAsync(context);
    }

    return executeGit(["push"], context)
        .andTee((): void => logger.info("Pushed changes to GitHub!"))
        .map((): CastoriaContext => context);
}

/**
 * Rolls back the push.
 * @param context The Castoria context.
 */
export function rollbackPush(context: CastoriaContext): ResultAsync<void, Error> {
    return executeGit(["reset", "--hard", "HEAD~1"], context)
        .andThen((): ResultAsync<GitCommandResult, Error> => executeGit(["push", "--force"], context))
        .map((): void => undefined);
}

/**
 * Pushes tags to GitHub.
 * @param context The Castoria context.
 */
function createPushTags(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.dryRun) {
        logger.info("Dry run enabled. Skipping tag push creation.");
        return okAsync(context);
    }

    return executeGit(["push", "--tags"], context)
        .andTee((): void => logger.info("Pushed tags to GitHub!"))
        .map((): CastoriaContext => context);
}

/**
 * Rolls back the tag push.
 * @param context The Castoria context.
 */
export function rollbackPushTags(context: CastoriaContext): ResultAsync<void, Error> {
    const tag: string = resolveTagName(context);

    return rollbackTag(context)
        .andThen(
            (): ResultAsync<GitCommandResult, Error> => executeGit(["push", "origin", `:refs/tags/${tag}`], context)
        )
        .map((): void => undefined);
}

/**
 * Executes the push pipeline to push changes and tags to GitHub.
 */
export function pushPipeline(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.bumpOnly || context.options.bumpOnlyWithChangelog) {
        const flag = context.options.bumpOnly ? "--bump-only" : "--bump-only-with-changelog";
        logger.info(`Skipping GitHub push and tag creation ${colors.dim(`(${flag})`)}`);
        return okAsync(context);
    }

    if (context.options.skipPush && context.options.skipPushTag) {
        logger.info(`Skipping GitHub push and tag creation ${colors.dim("(--skip-push) and --skip-push-tag")}`);
        return okAsync(context);
    }

    if (context.options.skipPush) {
        logger.info(`Skipping GitHub push creation ${colors.dim("(--skip-push)")}`);
        return createPushTags(context);
    }

    if (context.options.skipPushTag) {
        logger.info(`Skipping GitHub push tag creation ${colors.dim("(--skip-push-tag)")}`);
        return createPush(context);
    }

    logger.info("Pushing changes and tags to GitHub...");
    return createPush(context).andThen(createPushTags);
}
