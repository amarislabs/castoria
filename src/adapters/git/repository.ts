import { type Result, type ResultAsync, err, ok } from "neverthrow";
import { runGit } from "#/adapters/git";
import { runGh } from "#/adapters/github";
import type { RepositoryIdentifier, RepositoryMetadata } from "#/types";
import type { CastoriaContext } from "#/types/context";

export function getRepository(context: CastoriaContext): ResultAsync<RepositoryIdentifier, Error> {
    return composeRepositoryIdentifierFromMetadata(context).orElse(
        (): ResultAsync<RepositoryIdentifier, Error> => getRepositoryIdentifierFromGhCli(context)
    );
}

/**
 * Extract metadata from a repository identifier.
 *
 * @param identifier The repository identifier.
 * @returns The repository metadata.
 */
export function extractMetadataFromIdentifier(identifier: RepositoryIdentifier): Result<RepositoryMetadata, Error> {
    const [owner, repo] = identifier.split("/");
    if (!owner || !repo) {
        return err(new Error(`Invalid repository identifier: ${identifier}`));
    }

    return ok({ owner, repo });
}

/**
 * Generate a repository identifier from the provided metadata context.
 *
 * @param context The Castoria context.
 * @returns The repository identifier.
 */
function composeRepositoryIdentifierFromMetadata(context: CastoriaContext): ResultAsync<RepositoryIdentifier, Error> {
    return getRepositoryUrl(context)
        .andThen((url: string): Result<RepositoryMetadata, Error> => extractRepositoryFromUrl(url))
        .map((metadata: RepositoryMetadata): RepositoryIdentifier => `${metadata.owner}/${metadata.repo}`);
}

/**
 * Get a repository URL from the origin remote.
 *
 * @param context The Castoria context.
 * @returns The repository URL.
 */
function getRepositoryUrl(context: CastoriaContext): ResultAsync<string, Error> {
    return runGit(["remote", "get-url", "origin"], context, true);
}

/**
 * Extract repository metadata from a GitHub repository URL.
 *
 * @param url The repository URL.
 * @returns The repository metadata.
 */
function extractRepositoryFromUrl(url: string): Result<RepositoryMetadata, Error> {
    const cleanUrl: string = url.trim().replace(/\.git$/, "");

    const sshMatch: RegExpMatchArray | null = cleanUrl.match(/^git@github\.com:([^/]+)\/(.+)$/);
    if (sshMatch) {
        const [, owner, name] = sshMatch;
        return ok({ owner, repo: name });
    }

    const httpsMatch: RegExpMatchArray | null = cleanUrl.match(/^https:\/\/github\.com\/([^/]+)\/(.+)$/);
    if (httpsMatch) {
        const [, owner, name] = httpsMatch;
        return ok({ owner, repo: name });
    }

    return err(
        new Error(
            "Failed to extract repository metadata from URL. Supported formats: git@github.com:owner/repo or https://github.com/owner/repo"
        )
    );
}

/**
 * Get the repository identifier from GitHub CLI.
 *
 * @param context The Castoria context.
 * @returns The repository identifier.
 */
function getRepositoryIdentifierFromGhCli(context: CastoriaContext): ResultAsync<RepositoryIdentifier, Error> {
    return runGh(["repo", "view", "--json", "nameWithOwner", "-q", "'.nameWithOwner'"], context).map(
        (result: string): RepositoryIdentifier => result.trim() as RepositoryIdentifier
    );
}
