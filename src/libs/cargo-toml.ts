import { type Result, type ResultAsync, err, errAsync, ok, okAsync } from "neverthrow";
import { type TomlPrimitive, parse } from "smol-toml";
import { getTextFromFile, writeContentToFile } from "#/libs/filesystem";
import { createErrorFromUnknown } from "#/libs/utils/error";

/**
 * Partial Cargo.toml file structure.
 */
export interface CargoToml {
    package?: {
        name?: string;
        version?: string;
        description?: string;
        repository?: string;
        authors?: string[];
        edition?: string;
    };
}

type Constructor<T> = new (...args: unknown[]) => T;

/**
 * Type guard to check if a value is a non-null object
 * @param input The value to check
 * @param constructorType The constructor type to check against
 */
function isObject<T extends Constructor<unknown> = ObjectConstructor>(
    input: unknown,
    constructorType?: T
): input is object {
    return typeof input === "object" && input ? input.constructor === (constructorType ?? Object) : false;
}

/**
 * Type guard to check if a value matches the CargoToml structure
 */
function isCargoToml(value: TomlPrimitive | unknown): value is CargoToml {
    return isObject(value);
}

/**
 * Parse Cargo.toml file and return its content as a typed object
 * @param path Path to the Cargo.toml file
 */
export function parseCargoToml(path: string): ResultAsync<CargoToml, Error> {
    return getTextFromFile(path)
        .map(parse)
        .mapErr((error: unknown): Error => createErrorFromUnknown("Failed to parse Cargo.toml", error))
        .andThen(
            (config: TomlPrimitive): ResultAsync<CargoToml, Error> =>
                isCargoToml(config) ? okAsync(config) : errAsync(new Error("Invalid Cargo.toml format"))
        );
}

/**
 * Take a Cargo.toml object and get the package name.
 * @param cargo The Cargo.toml object.
 */
export function getCargoPackageName(cargo: CargoToml): Result<string, Error> {
    return cargo.package?.name ? ok(cargo.package.name) : err(new Error("Name field not found in Cargo.toml"));
}

/**
 * Take a Cargo.toml object and get the version field.
 * @param cargo The Cargo.toml object.
 */
export function getCargoPackageVersion(cargo: CargoToml): Result<string, Error> {
    return cargo.package?.version ? ok(cargo.package.version) : err(new Error("Version field not found in Cargo.toml"));
}

/**
 * Update the version field in the Cargo.toml file.
 * @param path The path to the Cargo.toml file.
 * @param newVersion The new version to set in the Cargo.toml file.
 */
export function updateCargoVersion(path: string, newVersion: string): ResultAsync<void, Error> {
    const VERSION_REGEX = /^(\s*version\s*=\s*)["']([^"']*)["'](.*)$/m;

    /**
     * Match the version field in the Cargo.toml file and update it with the new version.
     * @param content The content of the Cargo.toml file.
     */
    function matchAndUpdate(content: string): Result<string, Error> {
        if (!VERSION_REGEX.test(content)) {
            return err(new Error(`Version field not found in Cargo.toml at ${path}`));
        }

        const updatedContent: string = content.replace(VERSION_REGEX, `$1"${newVersion}"$3`);
        return ok(updatedContent);
    }

    return getTextFromFile(path)
        .andThen(matchAndUpdate)
        .andThen((updatedContent: string): ResultAsync<number, Error> => writeContentToFile(path, updatedContent))
        .map((): void => undefined);
}
