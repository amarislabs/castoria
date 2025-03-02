import { ResultAsync, errAsync, okAsync } from "neverthrow";
import type { CastoriaContext } from "#/types/context";
import { isCommandAvailable } from "#/utils";
import logger from "#/utils/logger";

/**
 * Runs a git command with the given arguments.
 *
 * @param args The arguments to pass to the git command.
 * @param context The castoria context.
 * @param skipDryRun Whether to skip the dry run check.
 * @returns The output of the git command.
 */
export function runGit(args: string[], context: CastoriaContext, skipDryRun = true): ResultAsync<string, Error> {
    if (context.options.dryRun && !skipDryRun) {
        logger.verbose(`Would execute git ${args.join(" ")}`);
        return okAsync("");
    }

    logger.verbose(`Executing git ${args.join(" ")}`);

    return isCommandAvailable("git").andThen((isAvailable: boolean): ResultAsync<string, Error> => {
        if (!isAvailable) {
            return errAsync(new Error("Command git is not available"));
        }

        logger.verbose(`Executing git ${args.join(" ")}`);

        return ResultAsync.fromPromise(
            new Response(Bun.spawn(["git", ...args]).stdout).text(),
            (error: unknown): Error => new Error(`Failed to execute git ${args.join(" ")}: ${error}`)
        );
    });
}
