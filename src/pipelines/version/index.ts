import semver, { type ReleaseType } from "semver";
import { SPECIAL_RELEASES } from "#/core/constants";
import type { DistributionChannel } from "#/types";
import type { CastoriaContext } from "#/types/context";

/**
 * Calculates the next version number based on the current version and increment type
 *
 * @param context The Castoria context.
 * @param increment The Increment type.
 * @returns The next version number.
 */
export function incrementVersion(context: CastoriaContext, increment: ReleaseType): string {
    const preReleaseId: string = context.options.preReleaseId || "alpha";

    if (SPECIAL_RELEASES.includes(context.options.preReleaseBase as DistributionChannel)) {
        return semver.inc(context.currentVersion, increment, preReleaseId, false) ?? context.currentVersion;
    }

    /**
     * Ensures the identifier base is either "0" or "1"
     * @param value - The identifier base value.
     * @returns "0" or "1"
     */
    function ensureIdentifierBase(value: string): "0" | "1" {
        return value === "0" || value === "1" ? value : "0";
    }

    const releaseIdentifier: "0" | "1" = ensureIdentifierBase(context.options.preReleaseBase);

    return semver.inc(context.currentVersion, increment, preReleaseId, releaseIdentifier) ?? context.currentVersion;
}
