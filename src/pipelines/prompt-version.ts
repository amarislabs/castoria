import { colors } from "consola/utils";
import { ResultAsync, okAsync } from "neverthrow";
import { updateVersionInContext } from "#/libs/context";
import { createErrorFromUnknown } from "#/libs/utils/error";
import { logger } from "#/libs/utils/logger";
import { generateAutomaticVersion, generateManualVersion } from "#/libs/version";
import type { BumpStrategy, PromptSelectChoice } from "#/types";
import type { CastoriaContext } from "#/types/castoria";

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

type StrategyHandler = (context: CastoriaContext) => ResultAsync<CastoriaContext, Error>;
type StrategyHandlers = Record<BumpStrategy, StrategyHandler>;

/**
 * Retrieves the strategy handlers for version bumping.
 */
function getStrategyHandlers(): StrategyHandlers {
    return {
        auto: (context: CastoriaContext): ResultAsync<CastoriaContext, Error> =>
            generateAutomaticVersion(context).andThen((version: string) => {
                return updateVersionInContext(context, version);
            }),
        manual: (context: CastoriaContext): ResultAsync<CastoriaContext, Error> =>
            generateManualVersion(context).andThen((version: string) => {
                return updateVersionInContext(context, version);
            }),
    };
}

/**
 * Execute the selected version bump strategy
 * @param context The Castoria context
 * @param strategy The selected version bump strategy
 */
function executeStrategy(context: CastoriaContext, strategy: BumpStrategy): ResultAsync<CastoriaContext, Error> {
    const handlers: StrategyHandlers = getStrategyHandlers();
    return handlers[strategy](context);
}

/**
 * Selects the version bump strategy to use.
 * @param context The Castoria context
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

    logger.info(`Using automatic version bump strategy ${colors.dim("(--ci)")}`);
    return executeStrategy(context, "auto");
}

/**
 * Prompts the user to select a version bump strategy.
 */
function promptStrategy(): ResultAsync<BumpStrategy, Error> {
    return ResultAsync.fromPromise(
        logger.prompt("Pick a version strategy", {
            type: "select",
            options: strategies,
            initial: strategies[1].value,
            cancel: "reject",
        }) as Promise<BumpStrategy>,
        (error: unknown): Error => createErrorFromUnknown("Failed to prompt for version strategy", error)
    );
}

/**
 * Executes the prompt version pipeline.
 */
export function promptVersionPipeline(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.skipBump) {
        return okAsync(context);
    }

    if (context.options.ci && !context.options.bumpStrategy) {
        logger.info(`Using automatic version bump strategy ${colors.dim("(--ci)")}`);
        return executeStrategy(context, "auto");
    }

    return selectBumpStrategy(context);
}
