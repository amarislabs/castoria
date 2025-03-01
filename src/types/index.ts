import type { ReleaseType } from "semver";

export type EmptyOr<T> = T | "";
export type BumpStrategy = "auto" | "manual";

export type PrereleaseBase = "0" | "1";
export type DistributionChannel = "next" | "canary" | "nightly";
export type ReleaseIdentifierBase = PrereleaseBase | DistributionChannel;

export type OptionalBumpStrategy = EmptyOr<BumpStrategy>;
export type OptionalReleaseType = EmptyOr<ReleaseType>;

export type RepositoryMetadata = {
    owner: string;
    repo: string;
};

export type RepositoryIdentifier = `${RepositoryMetadata["owner"]}/${RepositoryMetadata["repo"]}`;
