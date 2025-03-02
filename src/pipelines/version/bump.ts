import { type Result, ResultAsync, ok, okAsync } from "neverthrow";
import { updateCargoVersion } from "#/adapters/formats/cargo-toml";
import { updatePackageVersion } from "#/adapters/formats/package-json";
import { CWD_CARGO_TOML_PATH, CWD_PACKAGE_PATH } from "#/core/constants";
import type { CastoriaContext } from "#/types/context";
import { fileExists } from "#/utils/filesystem";
import logger from "#/utils/logger";

/**
 * Interface for manifest updaters
 */
interface ManifestUpdater {
    path: string;
    check: () => ResultAsync<boolean, Error>;
    update: (context: CastoriaContext) => ResultAsync<void, Error>;
    name: string;
}

/**
 * Registry of available manifest updaters
 */
const manifestUpdaters: ManifestUpdater[] = [
    {
        path: CWD_PACKAGE_PATH,
        name: "package.json",
        check: (): ResultAsync<boolean, Error> => fileExists(CWD_PACKAGE_PATH),
        update: (context: CastoriaContext): ResultAsync<void, Error> => {
            return updatePackageVersion(CWD_PACKAGE_PATH, context.nextVersion);
        },
    },
    {
        path: CWD_CARGO_TOML_PATH,
        name: "Cargo.toml",
        check: (): ResultAsync<boolean, Error> => fileExists(CWD_CARGO_TOML_PATH),
        update: (context: CastoriaContext): ResultAsync<void, Error> => {
            return updateCargoVersion(CWD_CARGO_TOML_PATH, context.nextVersion);
        },
    },
];

/**
 * Updates the version in all detected manifest files.
 *
 * @param context The Castoria context.
 * @returns The updated Castoria context.
 */
export function updateManifestFiles(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    const updateOperations: ResultAsync<void, Error>[] = manifestUpdaters.map((updater: ManifestUpdater) => {
        return checkAndUpdateManifest(updater, context);
    });
    return ResultAsync.combine(updateOperations).map((): CastoriaContext => context);
}

/**
 * Checks for and updates a specific manifest file
 *
 * @param updater The manifest updater to use
 * @param context The Castoria context
 * @returns A ResultAsync for the update operation
 */
function checkAndUpdateManifest(updater: ManifestUpdater, context: CastoriaContext): ResultAsync<void, Error> {
    return updater.check().andThen((exists: boolean): ResultAsync<void, Error> => {
        if (exists) {
            logger.verbose(`Updating version in ${updater.name} to ${context.nextVersion}`);
            if (context.options.dryRun) {
                return okAsync(undefined);
            }
            return updater.update(context);
        }

        logger.verbose(`Skipping ${updater.name} (not found)`);
        return okAsync(undefined);
    });
}

/**
 * Registers a new manifest updater
 *
 * @param updater The manifest updater to register
 * @returns A boolean indicating if registration was successful
 */
export function registerManifestUpdater(updater: ManifestUpdater): Result<boolean, Error> {
    if (!updater.path || !updater.check || !updater.update || !updater.name) {
        return ok(false);
    }

    manifestUpdaters.push(updater);
    return ok(true);
}
