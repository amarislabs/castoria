import type { ReleaseType } from "semver";

/**
 * Utility type that makes a type optional by allowing empty string
 * @template T The type to make optional
 */
export type EmptyOr<T> = T | "";

/**
 * Strategy for determining how version bumps should be handled
 * - auto: Version is determined automatically based on conventional commits
 * - manual: Version is explicitly specified by the user
 */
export type BumpStrategy = "auto" | "manual";

/**
 * Makes the bump strategy optional by allowing empty string
 */
export type OptionalBumpStrategy = EmptyOr<BumpStrategy>;

/**
 * Makes the semver release type optional by allowing empty string
 */
export type OptionalReleaseType = EmptyOr<ReleaseType>;

/**
 * Distribution channels for pre-release versions
 * - next: Preview of next stable release
 * - canary: Experimental features and breaking changes
 * - nightly: Daily builds from main branch
 */
export type DistributionChannel = "next" | "canary" | "nightly";

/**
 * Base number for pre-release cycle.
 */
export type PrereleaseBase = "0" | "1";

/**
 * Represents the base identifier for release types, which can be either a
 * pre-release cycle stage or a release distribution type.
 */
export type ReleaseIdentifierBase = PrereleaseBase | DistributionChannel;

/**
 * Object that contains the owner and name of a repository
 */
export type RepositoryMetadata = {
    owner: string;
    repo: string;
};

/**
 * Represents a repository in the format "owner/repo"
 */
export type Repository = `${string}/${string}`;

/**
 * Selectable version options
 */
export interface PromptSelectChoice {
    label: string;
    value: string;
    hint?: string;
}
