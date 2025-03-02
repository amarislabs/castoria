import type { Command } from "commander";
import { validateBumpStrategy, validateReleaseIdentifierBase, validateReleaseType } from "#/cli/validate";
import type { OptionalBumpStrategy, OptionalReleaseType, ReleaseIdentifierBase } from "#/types";

/**
 * Creates the command line flags for the commander program.
 *
 * @param program The commander program instance to add flags to.
 * @returns The updated commander program instance with the flags added.
 */
export function createFlags(program: Command): Command {
    return program
        .option("-v, --verbose", "Enable verbose logging for more detailed output.", false)
        .option("-d, --dry-run", "Enable dry-run mode to simulate the release process without making changes.", false)
        .option("-n, --name [name]", "The project identifier to be used during the release process.", "")
        .option("-c, --ci", "Enable CI mode for automatic version bump strategy.", false)
        .option<OptionalBumpStrategy>(
            "-s, --bump-strategy [strategy]",
            "The bump strategy to use for determining the next version.",
            validateBumpStrategy,
            ""
        )
        .option<OptionalReleaseType>(
            "-r, --release-type [type]",
            "The release type to use for the next version.",
            validateReleaseType,
            ""
        )
        .option("-p, --pre-release-id [id]", "The identifier for the pre-release version.", "alpha")
        .option<ReleaseIdentifierBase>(
            "-B, --pre-release-base [base]",
            "The base identifier for the pre-release version.",
            validateReleaseIdentifierBase,
            "0"
        );
}
