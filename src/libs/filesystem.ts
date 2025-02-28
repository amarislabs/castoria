import { ResultAsync, okAsync } from "neverthrow";

/**
 * Check if a file exists.
 *
 * @param path The path to the file.
 */
export function fileExists(path: string): ResultAsync<boolean, Error> {
    return ResultAsync.fromPromise(
        Bun.file(path).exists(),
        (error: unknown): Error => new Error(`Error checking if file exists: ${error}`)
    );
}

/**
 * Create a file if it does not exist.
 *
 * @param path The path to the file.
 */
export function createFileIfNotExists(path: string): ResultAsync<boolean, Error> {
    return fileExists(path).andThen((exists: boolean): ResultAsync<boolean, Error> => {
        if (exists) {
            return okAsync(true);
        }

        return ResultAsync.fromPromise(
            Bun.write(path, ""),
            (error: unknown): Error => new Error(`Error creating file: ${error}`)
        ).map(() => true);
    });
}

/**
 * Get the text content of a file.
 *
 * @param path The path to the file.
 */
export function getTextFromFile(path: string): ResultAsync<string, Error> {
    return ResultAsync.fromPromise(
        Bun.file(path).text(),
        (error: unknown): Error => new Error(`Error reading file: ${error}`)
    );
}

/**
 * Get a JSON object from a file.
 *
 * @param path The path to the file.
 */
export function getJsonFromFile<T>(path: string): ResultAsync<T, Error> {
    return ResultAsync.fromPromise(
        Bun.file(path).json(),
        (error: unknown): Error => new Error(`Error reading file: ${error}`)
    );
}

/**
 * Write content to a file and return the number of bytes written.
 *
 * @param path The path to the file.
 * @param updatedContent The content to write to the file.
 */
export function writeContentToFile(path: string, updatedContent: string): ResultAsync<number, Error> {
    return ResultAsync.fromPromise(
        Bun.write(path, updatedContent),
        (error: unknown): Error => new Error(`Failed to write file at ${path}: ${error}`)
    );
}
