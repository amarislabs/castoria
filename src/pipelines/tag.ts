import { colors } from "consola/utils";
import { type ResultAsync, okAsync } from "neverthrow";
import { type GitCommandResult, executeGit, resolveTagAnnotation, resolveTagName } from "#/libs/git";
import { logger } from "#/libs/utils/logger";
import type { CastoriaContext } from "#/types/castoria";

/**
 * Queries whether the user can sign Git tags.
 * @param context The Castoria context.
 */
function canSignGitTags(context: CastoriaContext): ResultAsync<boolean, Error> {
    return executeGit(["config", "--get", "user.signingkey"], context).map((result) => result.stdout.length > 0);
}

/**
 * Creates a Git tag for the current version.
 * @param context The Castoria context.
 */
function createTag(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.dryRun) {
        logger.info("Dry run enabled. Skipping tag creation.");
        return okAsync(context);
    }

    const tagName: string = resolveTagName(context);
    const tagMessage: string = resolveTagAnnotation(context);

    return canSignGitTags(context)
        .map((canSign: boolean): string[] => {
            const baseArgs: string[] = ["tag", "-a", tagName, "-m", tagMessage];
            return canSign ? [...baseArgs, "-s"] : baseArgs;
        })
        .andThen((args: string[]): ResultAsync<GitCommandResult, Error> => executeGit(args, context))
        .map(() => context);
}

/**
 * Rolls back the tag if it was created.
 * @param context The Castoria context.
 */
export function rollbackTag(context: CastoriaContext): ResultAsync<void, Error> {
    const tag: string = resolveTagName(context);

    return executeGit(["tag", "-d", tag], context).map(() => undefined);
}

/**
 * Executes the tag pipeline to create a Git tag for the current version.
 */
export function tagPipeline(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.bumpOnly || context.options.bumpOnlyWithChangelog) {
        const flag = context.options.bumpOnly ? "--bump-only" : "--bump-only-with-changelog";
        logger.info(`Skipping Git tag creation ${colors.dim(`(${flag})`)}`);
        return okAsync(context);
    }

    if (context.options.skipTag) {
        logger.info(`Skipping Git tag creation ${colors.dim("(--skip-tag)")}`);
        return okAsync(context);
    }

    logger.info(`Creating Git tag... ${colors.dim(`(${resolveTagName(context)})`)}`);
    return createTag(context);
}
