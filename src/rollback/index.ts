import { type ResultAsync, okAsync } from "neverthrow";
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
