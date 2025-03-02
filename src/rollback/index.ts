import { type ResultAsync, okAsync } from "neverthrow";
import { runGit } from "#/adapters/git";
import type { CastoriaContext } from "#/types/context";
import logger from "#/utils/logger";

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
 *
 * @param stack The stack to which the operation will be added.
 * @param operation The rollback operation to perform in the context.
 * @param description A description of the rollback operation.
 * @return void
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

    logger.withTag("rollback").info("Executing rollback operations...");

    /**
     * Executes a rollback operation and logs its description.
     *
     * @param promise The operation in the form of a promise.
     * @param operationData The operation data containing the operation and its description.
     * @returns The outcome of the operation.
     */
    function executeOperation(
        promise: ResultAsync<void, Error>,
        { operation, description }: RollbackOperation
    ): ResultAsync<void, Error> {
        return promise.andThen((): ResultAsync<void, Error> => {
            logger.log(`Rolling back: ${description}`);
            return operation(context);
        });
    }

    return operations
        .reverse()
        .reduce(executeOperation, okAsync<void, Error>(undefined))
        .mapErr((error: Error): Error => {
            logger.error("Rollback failed: ", error);
            return error;
        });
}

/**
 * Executes the rollback operations in the given context and attempts a repository state reset as a last resort if they fail.
 *
 * @param context The Castoria context.
 * @param operations The rollback operations to execute.
 * @returns The outcome of the rollback operations.
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
 *
 * @param context The Castoria context.
 * @return The outcome of the rollback operation.
 */
export function rollbackRepositoryState(context: CastoriaContext): ResultAsync<void, Error> {
    logger.warn("Performing complete repository state reset");

    return runGit(["reset", "--hard", "HEAD"], context)
        .andThen((): ResultAsync<string, Error> => {
            return runGit(["clean", "-fd"], context);
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

/**
 * Execute an operation with a rollback operation.
 *
 * @param operation The operation
 * @param rollbackOp The rollback operation, if any
 * @param description A description for the operation
 * @param context The context to execute the operation
 * @param rollbackStack The stack for rollback operations
 * @return The result of the operation
 */
export function executeWithRollback<T>(
    operation: (context: T) => ResultAsync<T, Error>,
    rollbackOp: ((context: CastoriaContext) => ResultAsync<void, Error>) | null,
    description: string,
    context: T,
    rollbackStack: RollbackOperation[]
): ResultAsync<T, Error> {
    return operation(context).map((result: T): T => {
        if (rollbackOp) {
            addRollbackOperation(rollbackStack, rollbackOp, description);
        }
        return result;
    });
}
