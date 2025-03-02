import { ResultAsync, errAsync, okAsync } from "neverthrow";
import type { ReleaseType, SemVer } from "semver";
import semver from "semver";
import { incrementVersion } from "#/pipelines/version";
import { generateAutomaticVersion } from "#/pipelines/version/auto";
import type { CastoriaContext } from "#/types/context";
import logger from "#/utils/logger";

const VERSION_TYPES = {
    RELEASE: ["patch", "minor", "major"] as const,
    PRERELEASE: ["prepatch", "preminor", "premajor"] as const,
    CONTINUATION: ["prerelease", "pre"] as const,
} as const;

const VERSION_CHOICES = {
    latestIsPreRelease: [VERSION_TYPES.CONTINUATION[0], ...VERSION_TYPES.RELEASE],
    preRelease: VERSION_TYPES.PRERELEASE,
    default: [...VERSION_TYPES.RELEASE, ...VERSION_TYPES.PRERELEASE],
} as const;

/**
 * Selectable version options
 */
export interface PromptSelectChoice {
    label: string;
    value: string;
    hint?: string;
}

/**
 * Generates a manual version based on the user's input or the given context.
 *
 * @param context The Castoria context.
 * @returns THe generated version.
 */
export function generateManualVersion(context: CastoriaContext): ResultAsync<string, Error> {
    if (context.options.releaseType) {
        return okAsync(incrementVersion(context, context.options.releaseType as ReleaseType));
    }

    return promptVersion(context)
        .andTee((): void => console.log(" "))
        .andThen((nextVersion: string): ResultAsync<string, Error> => {
            if (nextVersion === "custom") {
                return promptCustomVersion(context);
            }

            return okAsync(nextVersion);
        });
}

/**
 * Prompts the user to select a version bump.
 *
 * @param context The Castoria context.
 * @returns The selected version bump.
 */
function promptVersion(context: CastoriaContext): ResultAsync<string, Error> {
    const versions: PromptSelectChoice[] = generateVersionChoices(context);

    return ResultAsync.fromPromise(
        logger.prompt("Select version bump", {
            type: "select",
            options: versions,
            initial: versions[0].value,
            cancel: "reject",
        }),
        (error: unknown): Error => new Error(`Failed to prompt for version: ${error}`)
    );
}

/**
 * Takes a custom version input from the user and validates it.
 *
 * @param context The Castoria context.
 * @returns The validated custom version.
 */
function promptCustomVersion(context: CastoriaContext): ResultAsync<string, Error> {
    return ResultAsync.fromPromise(
        logger.prompt("Enter version", {
            type: "text",
            initial: "",
            cancel: "reject",
        }),
        (error: unknown): Error => new Error(`Failed to prompt for version: ${error}`)
    )
        .andTee((): void => console.log(" "))
        .andThen((version: string): ResultAsync<string, Error> => validateVersion(context, version));
}

/**
 * Validates the provided version against semver standards and context constraints.
 *
 * @param context The Castoria context.
 * @param version The version string to validate.
 * @returns The validated version or an error.
 */
function validateVersion(context: CastoriaContext, version: string): ResultAsync<string, Error> {
    // if no custom version is provided, generate an automatic version instead
    if (!version) {
        return generateAutomaticVersion(context);
    }

    const cleanVersion: string | null = semver.clean(version);
    const coercedVersion: string | undefined = cleanVersion || semver.coerce(version)?.version;

    if (!coercedVersion) {
        return errAsync(new Error(`Invalid semver version format: ${version}`));
    }

    const parsedInput: SemVer | null = semver.parse(version);

    if (semver.valid(version)) {
        if (semver.lt(version, context.currentVersion)) {
            return errAsync(new Error(`Version must be higher than current version: ${context.currentVersion}`));
        }
        return okAsync(version);
    }

    const prereleaseRegex = /^(\d+\.\d+\.\d+)-([\w.-]+)$/;
    const match: RegExpMatchArray | null = version.match(prereleaseRegex);

    if (match && semver.valid(match[1])) {
        const normalizedVersion = `${match[1]}-${match[2]}.0`;

        if (semver.valid(normalizedVersion)) {
            if (semver.lt(normalizedVersion, context.currentVersion)) {
                return errAsync(new Error(`Version must be higher than current version: ${context.currentVersion}`));
            }
            return okAsync(normalizedVersion);
        }
    }

    const parsedCoerced: SemVer | null = semver.parse(coercedVersion);

    if (parsedInput?.prerelease?.length && !parsedCoerced?.prerelease?.length) {
        const prereleaseVersion = `${coercedVersion}-${parsedInput.prerelease.join(".")}`;
        if (semver.valid(prereleaseVersion)) {
            if (semver.lt(prereleaseVersion, context.currentVersion)) {
                return errAsync(new Error(`Version must be higher than current version: ${context.currentVersion}`));
            }
            return okAsync(prereleaseVersion);
        }
    }

    if (semver.lt(coercedVersion, context.currentVersion)) {
        return errAsync(new Error(`Version must be higher than current version: ${context.currentVersion}`));
    }

    return okAsync(coercedVersion);
}

/**
 * Generates version choices based on context configuration
 *
 * @param context The Castoria context.
 * @returns An array of version options or last option to input a custom version
 */
function generateVersionChoices(context: CastoriaContext): PromptSelectChoice[] {
    const types = context.options.releaseType === "prerelease" ? VERSION_CHOICES.preRelease : VERSION_CHOICES.default;
    const customVersion: PromptSelectChoice = {
        label: "custom (please enter a version)",
        value: "custom",
        hint: "Must adhere to semver",
    };

    return types
        .map((increment: ReleaseType): PromptSelectChoice => createVersionOption(context, increment))
        .concat(customVersion);
}

/**
 * Creates a version select option with formatted label and value
 *
 * @param context The Castoria context.
 * @param increment Increment type.
 * @returns Option object with label, value, and hint
 */
function createVersionOption(context: CastoriaContext, increment: string): PromptSelectChoice {
    const nextVersion: string = incrementVersion(context, increment as ReleaseType);

    return {
        label: `${increment} (${nextVersion})`,
        value: nextVersion,
        hint: nextVersion,
    };
}
