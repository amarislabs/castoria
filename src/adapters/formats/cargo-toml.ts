import { type Result, type ResultAsync, err, errAsync, ok, okAsync } from "neverthrow";
import { type TomlPrimitive, parse } from "smol-toml";
import { isToml } from "#/utils";
import { getTextFromFile, writeContentToFile } from "#/utils/filesystem";
import logger from "#/utils/logger";

/**
 * A small interface representing a Cargo.toml file.
 */
interface CargoToml {
    package?: {
        name?: string;
        version?: string;
        description?: string;
        repository?: string;
        authors?: string[];
        edition?: string;
    };
}

/**
 * Parses the Cargo.toml file located at the given path.
 *
 * @param path The path to the Cargo.toml file.
 * @returns The parsed Cargo.toml file.
 */
export function parseCargoToml(path: string): ResultAsync<CargoToml, Error> {
    return getTextFromFile(path)
        .map(parse)
        .mapErr((error: unknown): Error => new Error(`Failed to parse Cargo.toml: ${error}`))
        .andThen((config: TomlPrimitive): ResultAsync<CargoToml, Error> => {
            if (!isToml<CargoToml>(config)) {
                return errAsync(new Error("Invalid Cargo.toml format"));
            }

            return okAsync(config);
        });
}

/**
 * Take a Cargo.toml object and get the package name.
 *
 * @param cargo The Cargo.toml object.
 * @returns The package name.
 */
export function getCargoPackageName(cargo: CargoToml): Result<string, Error> {
    return cargo.package?.name ? ok(cargo.package.name) : err(new Error("Name field not found in Cargo.toml"));
}

/**
 * Take a Cargo.toml object and get the version field.
 *
 * @param cargo The Cargo.toml object.
 * @returns The version field.
 */
export function getCargoPackageVersion(cargo: CargoToml): Result<string, Error> {
    return cargo.package?.version ? ok(cargo.package.version) : err(new Error("Version field not found in Cargo.toml"));
}

/**
 * Update the version field in the Cargo.toml file.
 *
 * @param path The path to the Cargo.toml file.
 * @param newVersion The new version to set in the Cargo.toml file.
 * @returns A ResultAsync indicating the success or failure of the operation.
 */
export function updateCargoVersion(path: string, newVersion: string): ResultAsync<void, Error> {
    const VERSION_REGEX = /^(\s*version\s*=\s*)["']([^"']*)["'](.*)$/m;

    /**
     * Match the version field in the Cargo.toml file and update it with the new version.
     *
     * @param content The content of the Cargo.toml file.
     * @returns The updated content of the Cargo.toml file.
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
        .andTee((): void => logger.trace(`Updated version in package.json to ${newVersion}`))
        .map((): void => undefined);
}
