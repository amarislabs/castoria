import type { Octokit } from "@octokit/core";
import type { RequestParameters } from "@octokit/core/types";
import { ResultAsync, okAsync } from "neverthrow";
import { removeHeaderFromChangelog } from "#/adapters/formats/cliff-toml";
import { getRepository } from "#/adapters/git/repository";
import { OctokitRequestHeaders, createOctokit, getToken } from "#/adapters/github/auth";
import { resolveReleaseTitle, resolveTagName } from "#/core/config";
import type { RepositoryIdentifier } from "#/types";
import type { CastoriaContext } from "#/types/context";
import logger from "#/utils/logger";

/**
 * Parameters for creating a GitHub release.
 */
interface ReleaseParams extends RequestParameters {
    owner: string;
    repo: string;
    tag_name: string;
    name: string;
    body: string;
    draft: boolean;
    prerelease: boolean;
    generate_release_notes: boolean;
    make_latest: "true" | "false";
    headers: typeof OctokitRequestHeaders;
}

export function createGitHubReleaseUsingOctokit(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    /**
     * Resolves the GitHub repository identifier from the context.
     */
    function resolveRepository(): ResultAsync<RepositoryIdentifier, Error> {
        return context.config.git.repository !== "auto"
            ? okAsync(context.config.git.repository)
            : getRepository(context);
    }

    /**
     * Prepares the release content by removing the header from the changelog.
     */
    function prepareReleaseContent(): ResultAsync<string, Error> {
        return removeHeaderFromChangelog(context.changelogContent);
    }

    /**
     * Creates release parameters from repository information and content.
     */
    function buildReleaseParams(repository: RepositoryIdentifier, content: string): ReleaseParams {
        const [owner, repo] = repository.split("/");

        return {
            owner,
            repo,
            tag_name: resolveTagName(context),
            name: resolveReleaseTitle(context),
            body: content,
            draft: false,
            prerelease: false,
            generate_release_notes: content === "",
            make_latest: "true",
            headers: OctokitRequestHeaders,
        };
    }

    /**
     * Publishes a release to GitHub using the Octokit client.
     */
    function publishToGitHub(repository: RepositoryIdentifier, content: string): ResultAsync<void, Error> {
        return getToken(context)
            .andThen(createOctokit)
            .andThen((octokit: Octokit): ResultAsync<void, Error> => {
                const params = buildReleaseParams(repository, content);

                return ResultAsync.fromPromise(
                    octokit.request("POST /repos/{owner}/{repo}/releases", params),
                    (error: unknown): Error => new Error(`Failed to create GitHub release: ${error}`)
                ).map(() => undefined);
            });
    }

    return ResultAsync.combine([resolveRepository(), prepareReleaseContent()])
        .andThen(([repository, content]: [RepositoryIdentifier, string]) => publishToGitHub(repository, content))
        .map(() => context)
        .mapErr((error: Error): Error => {
            logger.error(error);
            return new Error(
                "Failed to create GitHub release. Please ensure you have the required permissions and, if using a fine-grained PAT for an organization, that it was created in the organization settings."
            );
        });
}
