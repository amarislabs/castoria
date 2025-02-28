import { type ResultAsync, okAsync } from "neverthrow";
import { executeGit } from "#/libs/git";
import { logger } from "#/libs/utils/logger";
import type { CastoriaContext } from "#/types/castoria";

/**
 * A rollback operation that can be executed to undo a previous operation.
 */
export type RollbackOperation = {
    operation: (context: CastoriaContext) => ResultAsync<void, Error>;
    description: string;
};

/**
 * Creates a new rollback stack.
 */
export function createRollbackStack(): RollbackOperation[] {
    return [];
}

/**
 * Adds a rollback operation to the specified stack.
 * @param stack The stack to which the operation will be added.
 * @param operation The rollback operation to perform in the context.
 * @param description A description of the rollback operation.
 */
export function addRollbackOperation(
    stack: RollbackOperation[],
    operation: (context: CastoriaContext) => ResultAsync<void, Error>,
    description: string
): void {
    stack.push({ operation, description });
}

/**
 * Executes the rollback operations in the given context.
 * @param context The Castoria context.
 * @param operations The rollback operations to execute.
 */
export function executeRollback(context: CastoriaContext, operations: RollbackOperation[]): ResultAsync<void, Error> {
    if (operations.length === 0) {
        return okAsync<void, Error>(undefined);
    }

    logger.warn("Initiating rollback of failed operations...");

    return operations
        .reverse()
        .reduce(
            (
                promise: ResultAsync<void, Error>,
                { operation, description }: RollbackOperation
            ): ResultAsync<void, Error> => {
                return promise.andThen((): ResultAsync<void, Error> => {
                    logger.info(`Rolling back: ${description}`);
                    return operation(context);
                });
            },
            okAsync<void, Error>(undefined)
        )
        .mapErr((error: Error): Error => {
            logger.error("Rollback failed:", error);
            return error;
        });
}

/**
 * Executes the rollback operations in the given context and attempts a repository state reset
 * as a last resort if they fail.
 * @param context The Castoria context.
 * @param operations The rollback operations to execute.
 */
export function executeRollbackWithFallback(
    context: CastoriaContext,
    operations: RollbackOperation[]
): ResultAsync<void, Error> {
    return executeRollback(context, operations).orElse((): ResultAsync<void, Error> => {
        logger.warn("Regular rollbacks failed, attempting last resort repository state reset");
        return rollbackRepositoryState(context);
    });
}

/**
 * Performs a complete repository reset to restore the state before operations.
 * This is a last resort rollback that resets both tracked and untracked files.
 * @param context The Castoria context.
 */
export function rollbackRepositoryState(context: CastoriaContext): ResultAsync<void, Error> {
    logger.warn("Performing complete repository state reset");

    return executeGit(["reset", "--hard", "HEAD"], context)
        .andThen(() => {
            return executeGit(["clean", "-fd"], context);
        })
        .map((): void => {
            logger.info("Repository state has been reset to before command execution");
            return;
        })
        .mapErr((error: Error): Error => {
            logger.error("Failed to reset repository state:", error);
            return error;
        });
}
