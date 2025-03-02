import { ResultAsync, errAsync, okAsync } from "neverthrow";
import type { CastoriaContext } from "#/types/context";
import { isCommandAvailable } from "#/utils";
import logger from "#/utils/logger";

/**
 * Runs a GitHub command with the given arguments.
 *
 * @param args The arguments to pass to the gh command.
 * @param context The Castoria context.
 * @param skipDryRun Whether to skip the dry run check.
 * @returns The output of the gh command.
 */
export function runGh(args: string[], context: CastoriaContext, skipDryRun = false): ResultAsync<string, Error> {
    if (context.options.dryRun && !skipDryRun) {
        logger.verbose(`Would execute gh ${args.join(" ")}`);
        return okAsync("");
    }

    return isCommandAvailable("gh").andThen((isAvailable: boolean): ResultAsync<string, Error> => {
        if (!isAvailable) {
            return errAsync(new Error("Command gh is not available"));
        }

        logger.verbose(`Executing gh ${args.join(" ")}`);

        return ResultAsync.fromPromise(
            new Response(Bun.spawn(["gh", ...args]).stdout).text(),
            (error: unknown): Error => new Error(`Failed to execute gh ${args.join(" ")}: ${error}`)
        );
    });
}
