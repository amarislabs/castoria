import { InvalidOptionArgumentError } from "commander";
import type { ReleaseType } from "semver";
import { SPECIAL_RELEASES } from "#/core/constants";
import type { BumpStrategy, OptionalBumpStrategy, OptionalReleaseType, ReleaseIdentifierBase } from "#/types";

/**
 * Validates the bump strategy.
 *
 * @param strategy The bump strategy to validate.
 * @returns The validated bump strategy.
 */
export function validateBumpStrategy(strategy: string): OptionalBumpStrategy {
    if (strategy === "") {
        return strategy;
    }

    const strategies = new Set<BumpStrategy>(["auto", "manual"]);

    if (!strategies.has(strategy as BumpStrategy)) {
        throw new InvalidOptionArgumentError(`Invalid bump strategy: ${strategy}`);
    }

    return strategy as BumpStrategy;
}

/**
 * Validates the release type.
 *
 * @param type The release type to validate.
 * @returns The validated release type.
 */
export function validateReleaseType(type: string): OptionalReleaseType {
    if (type === "") {
        return type;
    }

    const types = new Set<ReleaseType>(["major", "minor", "patch", "premajor", "preminor", "prepatch", "prerelease"]);

    if (!types.has(type as ReleaseType)) {
        throw new InvalidOptionArgumentError(`Invalid release type: ${type}`);
    }

    return type as ReleaseType;
}

/**
 * Validates the release identifier base.
 *
 * @param base The release identifier base to validate.
 * @returns The validated release identifier base.
 */
export function validateReleaseIdentifierBase(base: string): ReleaseIdentifierBase {
    if (base === "0" || base === "1") {
        return base as ReleaseIdentifierBase;
    }

    const hasValidPrefix: boolean = SPECIAL_RELEASES.some((prefix: string): boolean => base.startsWith(prefix));

    if (!hasValidPrefix) {
        throw new InvalidOptionArgumentError(`Invalid release identifier base: ${base}`);
    }

    return base as ReleaseIdentifierBase;
}
