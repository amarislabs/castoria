import { colors } from "consola/utils";
import { type ResultAsync, okAsync } from "neverthrow";
import { generateChangelog } from "#/libs/changelog";
import { executeGit } from "#/libs/git";
import { logger } from "#/libs/utils/logger";
import type { CastoriaContext } from "#/types/castoria";

/**
 * Rolls back the commit.
 * @param context The Castoria context.
 */
export function rollbackChangelog(context: CastoriaContext): ResultAsync<void, Error> {
    return executeGit(["restore", context.config.changelog.path], context).map((): void => undefined);
}

/**
 * Executes the push pipeline to push changes and tags to GitHub.
 */
export function changelogPipeline(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.bumpOnly) {
        logger.info(`Skipping changelog creation ${colors.dim("(--bump-only)")}`);
        return okAsync(context);
    }

    if (context.options.skipChangelog) {
        logger.info(`Skipping changelog generation ${colors.dim("(--skip-changelog)")}`);
        return okAsync(context);
    }

    logger.info(`Generating changelog... ${colors.dim(`(${context.config.changelog.path})`)}`);
    return generateChangelog(context);
}
