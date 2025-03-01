import { ResultAsync, okAsync } from "neverthrow";

/**
 * Check if a file exists.
 *
 * @param path The path to the file.
 * @returns True if the file exists, false otherwise.
 */
export function fileExists(path: string): ResultAsync<boolean, Error> {
    return ResultAsync.fromPromise(
        Bun.file(path).exists(),
        (error: unknown): Error => new Error(`Failed to check file existence at ${path}: ${error}`)
    );
}

/**
 * Create a file if it does not exist.
 *
 * @param path The path to the file.
 * @returns True if the file was created, false if it already existed.
 */
export function createFileIfNotExists(path: string): ResultAsync<boolean, Error> {
    return fileExists(path).andThen((exists: boolean): ResultAsync<boolean, Error> => {
        if (exists) {
            return okAsync(false);
        }

        return writeContentToFile(path, "").map((): boolean => true);
    });
}

/**
 * Get the text content of a file.
 *
 * @param path The path to the file.
 * @returns The text content of the file.
 */
export function getTextFromFile(path: string): ResultAsync<string, Error> {
    return ResultAsync.fromPromise(
        Bun.file(path).text(),
        (error: unknown): Error => new Error(`Failed to read file at ${path}: ${error}`)
    );
}

/**
 * Get a JSON object from a file.
 *
 * @param path The path to the file.
 * @returns The JSON object.
 */
export function getJsonFromFile<T>(path: string): ResultAsync<T, Error> {
    return ResultAsync.fromPromise(
        Bun.file(path).json(),
        (error: unknown): Error => new Error(`Failed to read JSON file at ${path}: ${error}`)
    );
}

/**
 * Write content to a file and return the number of bytes written.
 *
 * @param path The path to the file.
 * @param updatedContent The content to write to the file.
 * @returns The number of bytes written.
 */
export function writeContentToFile(path: string, updatedContent: string): ResultAsync<number, Error> {
    return ResultAsync.fromPromise(
        Bun.write(path, updatedContent),
        (error: unknown): Error => new Error(`Failed to write file at ${path}: ${error}`)
    );
}
