import { ResultAsync } from "neverthrow";
import semver, { type ReleaseType } from "semver";
import { SPECIAL_RELEASES } from "#/core/constants";
import { updateVersionInContext } from "#/core/context";
import { generateAutomaticVersion } from "#/pipelines/version/auto";
import { type PromptSelectChoice, generateManualVersion } from "#/pipelines/version/prompt";
import type { BumpStrategy, DistributionChannel } from "#/types";
import type { CastoriaContext } from "#/types/context";
import logger from "#/utils/logger";

/**
 * The available version bump strategies.
 */
const strategies: PromptSelectChoice[] = [
    {
        label: "Automatic Bump",
        value: "auto",
        hint: "Automatically determine the version bump using conventional commits",
    },
    {
        label: "Manual Bump",
        value: "manual",
        hint: "Manually select the version bump",
    },
];

/**
 * The version pipeline orchestrates the version bumping process.
 *
 * @param context The Castoria context.
 * @returns The updated Castoria context.
 */
export function versionPipeline(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    return getVersion(context);
}

/**
 * Executes the version bump strategy to update context.
 *
 * @param context The Castoria context.
 * @returns The updated Castoria context.
 */
function getVersion(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.ci && !context.options.bumpStrategy) {
        return executeStrategy(context, "auto");
    }

    return selectBumpStrategy(context);
}

/**
 * Calculates the next version number based on the current version and increment type
 *
 * @param context The Castoria context.
 * @param increment The Increment type.
 * @returns The next version number.
 */
export function incrementVersion(context: CastoriaContext, increment: ReleaseType): string {
    const preReleaseId: string = context.options.preReleaseId || "alpha";

    if (SPECIAL_RELEASES.includes(context.options.preReleaseBase as DistributionChannel)) {
        return semver.inc(context.currentVersion, increment, preReleaseId, false) ?? context.currentVersion;
    }

    /**
     * Ensures the identifier base is either "0" or "1"
     * @param value - The identifier base value.
     * @returns "0" or "1"
     */
    function ensureIdentifierBase(value: string): "0" | "1" {
        return value === "0" || value === "1" ? value : "0";
    }

    const releaseIdentifier: "0" | "1" = ensureIdentifierBase(context.options.preReleaseBase);

    return semver.inc(context.currentVersion, increment, preReleaseId, releaseIdentifier) ?? context.currentVersion;
}

/**
 * Selects the version bump strategy to use.
 *
 * @param context The Castoria context.
 * @returns The selected version bump strategy.
 */
function selectBumpStrategy(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.bumpStrategy) {
        return executeStrategy(context, context.options.bumpStrategy as BumpStrategy);
    }
    if (!context.options.ci) {
        return promptStrategy().andThen(
            (strategy: BumpStrategy): ResultAsync<CastoriaContext, Error> => executeStrategy(context, strategy)
        );
    }

    return executeStrategy(context, "auto");
}

type StrategyHandler = (context: CastoriaContext) => ResultAsync<CastoriaContext, Error>;
type StrategyHandlers = Record<BumpStrategy, StrategyHandler>;

/**
 * Prompts the user to pick a version bump strategy.
 *
 * @returns The selected version bump strategy.
 */
function promptStrategy(): ResultAsync<BumpStrategy, Error> {
    return ResultAsync.fromPromise(
        logger.prompt("Pick a version strategy", {
            type: "select",
            options: strategies,
            initial: strategies[1].value,
            cancel: "reject",
        }) as Promise<BumpStrategy>,
        (error: unknown): Error => new Error(`Failed to prompt for version strategy: ${error}`)
    );
}

/**
 * Retrieves the strategy handlers for version bumping.
 *
 * @returns The strategy handlers.
 */
function getStrategyHandlers(): StrategyHandlers {
    return {
        auto: (context: CastoriaContext): ResultAsync<CastoriaContext, Error> => {
            return generateAutomaticVersion(context).andThen((version: string): ResultAsync<CastoriaContext, Error> => {
                return updateVersionInContext(context, version);
            });
        },
        manual: (context: CastoriaContext): ResultAsync<CastoriaContext, Error> => {
            return generateManualVersion(context).andThen((version: string): ResultAsync<CastoriaContext, Error> => {
                return updateVersionInContext(context, version);
            });
        },
    };
}

/**
 * Execute the selected version bump strategy.
 *
 * @param context The Castoria context.
 * @param strategy The selected version bump strategy.
 *
 * @returns The updated Castoria context.
 */
function executeStrategy(context: CastoriaContext, strategy: BumpStrategy): ResultAsync<CastoriaContext, Error> {
    const handlers: StrategyHandlers = getStrategyHandlers();
    return handlers[strategy](context);
}
