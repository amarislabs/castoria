import type { Octokit } from "@octokit/core";
import type { RequestParameters } from "@octokit/core/types";
import { ResultAsync, okAsync } from "neverthrow";
import { removeHeaderFromChangelog } from "#/adapters/formats/cliff-toml";
import { getRepository } from "#/adapters/git/repository";
import { runGh } from "#/adapters/github";
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

/**
 * This function creates a GitHub release using the Octokit client.
 *
 * @param context The Castoria context
 * @returns The updated context
 */
export function createGitHubReleaseUsingOctokit(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    /**
     * Creates release parameters from repository information and content.
     *
     * @param repository The repository identifier
     * @param content The release content
     * @returns The release parameters
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
     *
     * @param repository The repository identifier
     * @param content The release content
     * @returns A ResultAsync that resolves to void or an Error
     */
    function publishToGitHub(repository: RepositoryIdentifier, content: string): ResultAsync<void, Error> {
        return getToken(context)
            .andThen(createOctokit)
            .andThen((octokit: Octokit): ResultAsync<void, Error> => {
                const params: ReleaseParams = buildReleaseParams(repository, content);

                return ResultAsync.fromPromise(
                    octokit.request("POST /repos/{owner}/{repo}/releases", params),
                    (error: unknown): Error => new Error(`Failed to create GitHub release: ${error}`)
                ).map(() => undefined);
            });
    }

    return ResultAsync.combine([resolveRepository(context), prepareReleaseContent(context)])
        .andThen(([repository, content]: [RepositoryIdentifier, string]): ResultAsync<void, Error> => {
            return publishToGitHub(repository, content);
        })
        .map((): CastoriaContext => context)
        .mapErr((error: Error): Error => {
            logger.error(error);
            return new Error(
                "Failed to create GitHub release. Please ensure you have the required permissions and, if using a fine-grained PAT for an organization, that it was created in the organization settings."
            );
        });
}

/**
 * This function creates a GitHub release using the GitHub CLI.
 *
 * @param context The Castoria context
 * @returns The updated context
 */
export function createGitHubReleaseUsingGhCli(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    /**
     * Builds the arguments for the GitHub release command.
     *
     * @param content The release content
     * @returns The arguments for the GitHub release command
     */
    function buildReleaseArgs(content: string): string[] {
        const tagName: string = resolveTagName(context);
        const title: string = resolveReleaseTitle(context);

        const args: string[] = ["release", "create", tagName];

        if (title) args.push("--title", title);

        if (content) {
            args.push("--notes", content);
        } else {
            args.push("--generate-notes");
        }

        args.push("--latest");
        return args;
    }

    /**
     * Creates a GitHub release using the gh CLI.
     *
     * @param content The release content
     * @returns The result of the gh release create command
     */
    function createRelease(content: string): ResultAsync<string, Error> {
        const args: string[] = buildReleaseArgs(content);

        return runGh(args, context);
    }

    return prepareReleaseContent(context)
        .andThen((content: string): ResultAsync<string, Error> => createRelease(content))
        .map((): CastoriaContext => context)
        .mapErr((error: Error): Error => {
            logger.error(error);
            return new Error(
                "Failed to create GitHub release using GitHub CLI. Please ensure you have the GitHub CLI installed and configured with the required permissions."
            );
        });
}

/**
 * Resolves the GitHub repository identifier from the context.
 *
 * @param context The Castoria context
 * @returns The repository identifier
 */
function resolveRepository(context: CastoriaContext): ResultAsync<RepositoryIdentifier, Error> {
    return context.config.git.repository !== "auto" ? okAsync(context.config.git.repository) : getRepository(context);
}

/**
 * Prepares the release content by removing the header from the changelog.
 *
 * @param context The Castoria context
 * @returns The release content
 */
function prepareReleaseContent(context: CastoriaContext): ResultAsync<string, Error> {
    return removeHeaderFromChangelog(context.changelogContent);
}
