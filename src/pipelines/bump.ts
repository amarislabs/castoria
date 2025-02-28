import { colors } from "consola/utils";
import { type ResultAsync, okAsync } from "neverthrow";
import { updateCargoVersion } from "#/libs/cargo-toml";
import { CWD_CARGO_TOML_PATH, CWD_PACKAGE_PATH } from "#/libs/const";
import { updateVersionInContext } from "#/libs/context";
import { fileExists } from "#/libs/filesystem";
import { updatePackageVersion } from "#/libs/package-json";
import { logger } from "#/libs/utils/logger";
import type { CastoriaContext } from "#/types/castoria";

/**
 * Creates a bump in the package.json file.
 * @param context The Castoria context.
 */
function createBump(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.dryRun) {
        logger.info("Dry run enabled. Skipping package version bump.");
        return okAsync(context);
    }

    return fileExists(CWD_CARGO_TOML_PATH).andThen((cargoExists: boolean): ResultAsync<CastoriaContext, Error> => {
        return fileExists(CWD_PACKAGE_PATH).andThen((packageExists: boolean): ResultAsync<CastoriaContext, Error> => {
            if (cargoExists && packageExists) {
                logger.info("Updating both package.json and Cargo.toml versions");
                return updatePackageVersion(CWD_PACKAGE_PATH, context.nextVersion)
                    .andTee((): void => logger.info(`Bumped package.json version to ${context.nextVersion}`))
                    .andThen(
                        (): ResultAsync<void, Error> => updateCargoVersion(CWD_CARGO_TOML_PATH, context.nextVersion)
                    )
                    .andTee((): void => logger.info(`Bumped Cargo.toml version to ${context.nextVersion}`))
                    .map((): CastoriaContext => context);
            }

            if (packageExists) {
                logger.info("Only package.json found, updating its version");
                return updatePackageVersion(CWD_PACKAGE_PATH, context.nextVersion)
                    .andTee((): void => logger.info(`Bumped package.json version to ${context.nextVersion}`))
                    .map((): CastoriaContext => context);
            }

            if (cargoExists) {
                logger.info("Only Cargo.toml found, updating its version");
                return updateCargoVersion(CWD_CARGO_TOML_PATH, context.nextVersion)
                    .andTee((): void => logger.info(`Bumped Cargo.toml version to ${context.nextVersion}`))
                    .map((): CastoriaContext => context);
            }

            logger.warn("No package.json or Cargo.toml found to update version");
            return okAsync(context);
        });
    });
}

/**
 * Rolls back the bump.
 * @param context The Castoria context.
 */
export function rollbackBump(context: CastoriaContext): ResultAsync<void, Error> {
    return fileExists(CWD_CARGO_TOML_PATH).andThen((cargoExists: boolean): ResultAsync<void, Error> => {
        return fileExists(CWD_PACKAGE_PATH).andThen((packageExists: boolean): ResultAsync<void, Error> => {
            if (cargoExists && packageExists) {
                return updatePackageVersion(CWD_PACKAGE_PATH, context.currentVersion)
                    .andThen(
                        (): ResultAsync<void, Error> => updateCargoVersion(CWD_CARGO_TOML_PATH, context.currentVersion)
                    )
                    .andTee((): void => logger.info(`Rolled back Cargo.toml version to ${context.currentVersion}`));
            }

            if (packageExists) {
                return updatePackageVersion(CWD_PACKAGE_PATH, context.currentVersion).andTee((): void =>
                    logger.info(`Rolled back package.json version to ${context.currentVersion}`)
                );
            }

            if (cargoExists) {
                return updateCargoVersion(CWD_CARGO_TOML_PATH, context.currentVersion).andTee((): void =>
                    logger.info(`Rolled back Cargo.toml version to ${context.currentVersion}`)
                );
            }

            return okAsync(undefined);
        });
    });
}

/**
 * Executes the push pipeline to push changes and tags to GitHub.
 */
export function bumpPipeline(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.skipBump) {
        logger.info(`Skipping package version bump ${colors.dim("(--skip-bump)")}`);
        return updateVersionInContext(context, context.currentVersion);
    }

    logger.info(`Bumping package version... ${colors.dim(`(${context.currentVersion} -> ${context.nextVersion})`)}`);
    return createBump(context);
}
