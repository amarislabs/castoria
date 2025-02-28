import type { Command } from "commander";
import { validateBumpStrategy, validateReleaseIdentifierBase, validateReleaseType } from "#/cli-validate";
import type { OptionalBumpStrategy, OptionalReleaseType, ReleaseIdentifierBase } from "#/types";

/**
 * Creates the command line flags for the commander program.
 *
 * @param program The commander program instance to add flags to.
 * @returns The updated commander program instance with the flags added.
 */
export function createFlags(program: Command): Command {
    return program
        .option("--ci", "Run in CI mode, disabling interactive prompts.", false)
        .option("-v, --verbose", "Enable verbose logging for more detailed output.", false)
        .option("-d, --dry-run", "Enable dry-run mode to simulate the release process without making changes.", false)
        .option("-n, --name [name]", "The project identifier to be used during the release process.", "")
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
        )
        .option("--skip-bump", "Skip bumping the version number in manifest files.", false)
        .option("--skip-changelog", "Skip creating a new changelog entry.", false)
        .option("--skip-release", "Skip creating a new GitHub release.", false)
        .option("--skip-tag", "Skip creating a new git tag.", false)
        .option("--skip-commit", "Skip creating a new commit.", false)
        .option("--skip-push", "Skip pushing changes to the remote repository.", false)
        .option("--skip-push-tag", "Skip pushing tag to the remote repository.", false)
        .option(
            "--bump-only-with-changelog",
            "Skip all git and release operations, only updating version and changelog.",
            false
        )
        .option("--bump-only", "Skip all git, release, and changelog operations, only updating version.", false)
        .option("--github-release-draft", "Create a draft GitHub release.", false)
        .option("--github-release-prerelease", "Create a pre-release GitHub release.", false)
        .option("--github-release-latest", "Create a latest GitHub release.", false);
}
