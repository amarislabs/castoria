import { type Result, type ResultAsync, err, ok } from "neverthrow";
import { getTextFromFile, writeContentToFile } from "#/libs/filesystem";

/**
 * Partial package.json file structure.
 */
export interface PackageJson {
    name: string;
    version: string;
    description: string;
    homepage: string;
}

/**
 * Take a package.json object and aggregate the package name.
 * @param pkg The package.json object.
 */
export function getPackageName(pkg: PackageJson): Result<string, Error> {
    return pkg.name ? ok(pkg.name) : err(new Error("Name field not found in package.json"));
}

/**
 * Take a package.json object and aggregate the version field.
 * @param pkg The package.json object.
 */
export function getPackageVersion(pkg: PackageJson): Result<string, Error> {
    return pkg.version ? ok(pkg.version) : err(new Error("Version field not found in package.json"));
}

/**
 * Update the version field in the package.json file.
 * @param path The path to the package.json file.
 * @param newVersion The new version to set in the package.json file.
 */
export function updatePackageVersion(path: string, newVersion: string): ResultAsync<void, Error> {
    const VERSION_REGEX = /^(\s*"version"\s*:\s*)"[^"]*"(.*)$/m;

    /**
     * Match the version field in the package.json file and update it with the new version.
     * @param content The content of the package.json file.
     */
    function matchAndUpdate(content: string): Result<string, Error> {
        if (!VERSION_REGEX.test(content)) {
            return err(new Error(`Version field not found in package.json at ${path}`));
        }

        const updatedContent: string = content.replace(VERSION_REGEX, `$1"${newVersion}"$2`);
        return ok(updatedContent);
    }

    return getTextFromFile(path)
        .andThen(matchAndUpdate)
        .andThen((updatedContent: string): ResultAsync<number, Error> => writeContentToFile(path, updatedContent))
        .map((): void => undefined);
}
