/**
 * Creates a standardized error from an unknown error value.
 * If the error is already an Error instance, it prepends the error message.
 * Otherwise, it creates a new Error with both messages.
 *
 * @param errorMessage The prefix message to describe the error context
 * @param error The unknown error value to process
 */
export function createErrorFromUnknown(errorMessage: string, error: unknown): Error {
    if (error instanceof Error) {
        return new Error(`${errorMessage}: ${error.message}`);
    }
    return new Error(`${errorMessage}: ${error}`);
}
