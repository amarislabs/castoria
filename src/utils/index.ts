import { $, type ShellOutput } from "bun";
import { ResultAsync } from "neverthrow";
import type { TomlPrimitive } from "smol-toml";

/**
 * Deep merges source objects into a target object
 *
 * @param target The target object to merge into.
 * @param sources The source objects to merge from.
 * @returns The merged target object.
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, ...sources: Partial<T>[]): T {
    if (!sources.length) return target;

    const source: Partial<T> | undefined = sources.shift();
    if (source === undefined) return target;

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return deepMerge(target, ...sources);
}

/**
 * Flattens multiline text by trimming lines and joining them with "\\n".
 *
 * @param text The multiline text to flatten.
 * @returns The flattened text.
 */
export function flattenMultilineText(text: string): string {
    return text
        .split("\n")
        .map((line: string): string => line.trim())
        .filter((line: string): boolean => line.length > 0)
        .join("\\n");
}

/**
 * Checks if a command is available in the system.
 *
 * @param command The command to check.
 * @returns A boolean indicating if the command is available.
 */
export function isCommandAvailable(command: string): ResultAsync<boolean, Error> {
    return ResultAsync.fromPromise(
        $`which ${command}`
            .nothrow()
            .quiet()
            .then(({ exitCode }: ShellOutput): boolean => exitCode === 0),
        (error: unknown): Error => new Error(`Failed to check if command ${command} is available: ${error}`)
    ).mapErr((error: Error): Error => new Error(`Command ${command} is not available: ${error}`));
}

type Constructor<T> = new (...args: unknown[]) => T;

/**
 * Type guard to check if a value is a non-null object
 *
 * @param input The value to check
 * @param constructorType The constructor type to check against
 * @returns True if the value is a non-null object, false otherwise
 */
function isObject<T extends Constructor<unknown> = ObjectConstructor>(
    input: unknown,
    constructorType?: T
): input is object {
    return typeof input === "object" && input ? input.constructor === (constructorType ?? Object) : false;
}

/**
 * Type guard to check if a value matches a TOML structure
 *
 * @param value The value to check
 * @returns True if the value matches a TOML structure, false otherwise
 */
export function isToml<T extends object>(value: TomlPrimitive | unknown): value is T {
    return isObject(value);
}
