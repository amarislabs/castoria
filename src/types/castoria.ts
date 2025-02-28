import type { OptionalBumpStrategy, OptionalReleaseType, ReleaseIdentifierBase, RepositoryMetadata } from "#/types";

/**
 * Represents the command line options and flags.
 */
export interface CastoriaOptions {
    /**
     * Enable verbose logging for more detailed output.
     *
     * @cli --verbose, -v
     * @default false
     */
    verbose: boolean;

    /**
     * Enable dry-run mode to simulate the execution without making any changes.
     *
     * @cli --dry-run, -d
     * @default false
     */
    dryRun: boolean;

    /**
     * This will disable certain interactive prompts and automatically confirm them using defaults if not specified.
     *
     * @cli --ci
     * @default false
     */
    ci: boolean;

    /**
     * Project or package identifier used during the process.
     * If not specified, the current package.json name will be used.
     *
     * @cli --name, -n
     * @default ""
     */
    name: string;

    /**
     * The strategy to use when determening bumping method of the version.
     *
     * @cli --bump-strategy, -s
     * @default "manual"
     */
    bumpStrategy: OptionalBumpStrategy;

    /**
     * The release type to use when bumping the version.
     * If manual strategy is used, this value will be used as-is, and will not prompt for a release type.
     * If auto strategy is used, this value will be ignored.
     *
     * @cli --release-type, -r
     * @default ""
     */
    releaseType: OptionalReleaseType;

    /**
     * Pre-release identifier to append to the version number.
     * If release type is prerelease, this option will default to `alpha` if not specified.
     *
     * @cli --prerelease-id, -p
     * @default ""
     */
    preReleaseId: string;

    /**
     * Release identifier base number to use for pre-release versions.
     * If release type is prerelease, this option will default to `0` if not specified.
     *
     * @cli --prerelease-base, -B
     * @default 0
     */
    preReleaseBase: ReleaseIdentifierBase;

    /**
     * Skip bumping the version number in manifest files.
     *
     * @cli --skip-bump
     * @default false
     */
    skipBump: boolean;

    /**
     * Skip creating a new changelog entry.
     *
     * @cli --skip-changelog
     * @default false
     */
    skipChangelog: boolean;

    /**
     * Skip creating a new GitHub release.
     *
     * @cli --skip-release
     * @default false
     */
    skipRelease: boolean;

    /**
     * Skip creating a new git tag.
     *
     * @cli --skip-tag
     * @default false
     */
    skipTag: boolean;

    /**
     * Skip creating a new commit.
     *
     * @cli --skip-commit
     * @default false
     */
    skipCommit: boolean;

    /**
     * Skip pushing changes to the remote repository.
     * If skipCommit is enabled, this option will have no effect.
     *
     * @cli --skip-push
     * @default false
     */
    skipPush: boolean;

    /**
     * Skip pushing tag to the remote repository.
     * If skipTag is enabled, this option will have no effect.
     *
     * @cli --skip-push-tag
     * @default false
     */
    skipPushTag: boolean;

    /**
     * Skip all git and release operations, only updating version and changelog.
     * This is equivalent to setting skipTag, skipCommit, skipPush, skipPushTag,
     * and skipRelease to true.
     *
     * @cli --bump-only-with-changelog
     * @default false
     */
    bumpOnlyWithChangelog: boolean;

    /**
     * Skip all git, release, and changelog operations, only updating version.
     * This is equivalent to setting skipTag, skipCommit, skipPush, skipPushTag,
     * skipRelease, and skipChangelog to true.
     *
     * @cli --bump-only
     * @default false
     */
    bumpOnly: boolean;

    /**
     * Create a draft GitHub release.
     *
     * @cli --github-release-draft
     * @default false
     */
    githubReleaseDraft: boolean;

    /**
     * Create a pre-release GitHub release.
     *
     * @cli --github-release-prerelease
     * @default false
     */
    githubReleasePrerelease: boolean;

    /**
     * Create a latest GitHub release.
     *
     * @cli --github-release-latest
     * @default false
     */
    githubReleaseLatest: boolean;
}

/**
 * Represents the configuration options for Castoria.
 */
export interface CastoriaConfig {
    /**
     * Options for changelog generation and handling.
     */
    changelog: {
        /**
         * Enable changelog generation and handling.
         *
         * @default true
         */
        enabled: boolean;

        /**
         * Path to the changelog file.
         *
         * @default "CHANGELOG.md"
         */
        path: string;
    };

    /**
     * Options for Git operations.
     */
    git: {
        /**
         * Repository to use for Git operations.
         *
         * @default "auto" - Automatically determine the repository from the current git remote.
         * @default { owner: "owner", repo: "repo" } - Use the specified repository.
         */
        repository: "auto" | RepositoryMetadata;

        /**
         * Whether to require a specific branch for Git operations.
         *
         * @default false
         */
        requireBranch: boolean;

        /**
         * Branch or branches to use for Git operations.
         *
         * @default ["main", "master"]
         */
        branches: string | string[];

        /**
         * Whether to require a clean working directory for Git operations.
         *
         * @default true
         */
        requireCleanWorkingDir: boolean;

        /**
         * Whether to require upstream for Git operations.
         *
         * @default true
         */
        requireUpstream: boolean;

        /**
         * Release commit message template.
         *
         * @default "chore(release): {{name}}@{{version}}"
         */
        commitMessage: string;

        /**
         * Tag name template.
         *
         * @default "v{{version}}"
         */
        tagName: string;

        /**
         * Tag annotation template.
         *
         * @default "Release {{version}}"
         */
        tagAnnotation: string;
    };

    /**
     * Options for GitHub-related operations or integrations.
     */
    github: {
        /**
         * Options for GitHub releases.
         */
        release: {
            /**
             * Enable GitHub release creation.
             *
             * @default true
             */
            enabled: boolean;

            /**
             * Release name template.
             *
             * @default "v{{version}}"
             */
            title: string;
        };
    };
}

/**
 * Pipeline run context used to pass data between relevant stages.
 */
export interface CastoriaContext {
    /**
     * Loaded Castoria configuration options.
     */
    options: CastoriaOptions;

    /**
     * Command-line flags and options.
     */
    config: CastoriaConfig;

    /**
     * The current version of the project/package.
     */
    currentVersion: string;

    /**
     * The next version of the project/package.
     */
    nextVersion: string;

    /**
     * Generated changelog for the new version.
     */
    changelogContent: string;
}
