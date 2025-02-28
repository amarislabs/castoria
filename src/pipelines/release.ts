import type { Octokit } from "@octokit/core";
import type { RequestParameters } from "@octokit/core/types";
import { colors } from "consola/utils";
import { ResultAsync, okAsync } from "neverthrow";
import { removeHeaderFromChangelog } from "#/libs/cliff-toml";
import { getRepository, getToken, resolveReleaseTitle, resolveTagName } from "#/libs/git";
import { OctokitRequestHeaders, createOctokit } from "#/libs/github";
import { flattenMultilineText } from "#/libs/utils";
import { createErrorFromUnknown } from "#/libs/utils/error";
import { logger } from "#/libs/utils/logger";
import type { Repository } from "#/types";
import type { CastoriaContext } from "#/types/castoria";

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
 * Creates release parameters from context and repository information.
 */
function createReleaseParams(context: CastoriaContext, repository: Repository, content: string): ReleaseParams {
    const { githubReleaseDraft, githubReleasePrerelease, githubReleaseLatest } = context.options;

    const [owner, repo]: string[] = repository.split("/");

    return {
        owner: owner,
        repo: repo,
        tag_name: resolveTagName(context),
        name: resolveReleaseTitle(context),
        body: content,
        draft: githubReleaseDraft,
        prerelease: githubReleasePrerelease,
        generate_release_notes: content === "",
        make_latest: String(githubReleaseLatest) as "true" | "false",
        headers: OctokitRequestHeaders,
    };
}

/**
 * Creates a GitHub release for the current version.
 */
function createGitHubRelease(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.dryRun) {
        logger.info(`Skipping GitHub release creation ${colors.dim("(--dry-run)")}`);
        logger.verbose("Would create GitHub release with:");
        logger.verbose(`- Title: ${resolveReleaseTitle(context)}`);
        logger.verbose(`- Tag: ${resolveTagName(context)}`);
        logger.verbose(`- Draft: ${context.options.githubReleaseDraft}`);
        logger.verbose(`- Prerelease: ${context.options.githubReleasePrerelease}`);
        logger.verbose(`- Latest: ${context.options.githubReleaseLatest}`);
        return okAsync(context);
    }

    /**
     * Resolves the repository to use for the release.
     * @param context The Castoria context.
     */
    function resolveRepository(context: CastoriaContext): ResultAsync<Repository, Error> {
        if (context.config.git.repository === "auto") {
            return getRepository(context);
        }
        const repository: Repository =
            `${context.config.git.repository.owner}/${context.config.git.repository.repo}` as Repository;

        return okAsync(repository);
    }

    /**
     * Publishes a release to GitHub.
     * @param repository The repository to publish the release to.
     * @param content The release content.
     */
    function publishRelease(repository: Repository, content: string): ResultAsync<void, Error> {
        return getToken(context)
            .andThen(createOctokit)
            .andThen((octokit: Octokit): ResultAsync<void, Error> => {
                const params: ReleaseParams = createReleaseParams(context, repository, content);
                logger.verbose(`Creating GitHub release with params: ${flattenMultilineText(JSON.stringify(params))}`);

                return ResultAsync.fromPromise(
                    octokit.request("POST /repos/{owner}/{repo}/releases", params),
                    (error: unknown): Error => createErrorFromUnknown("Failed to create GitHub release", error)
                ).map((): void => undefined);
            })
            .andTee((): void => {
                logger.info("GitHub release created successfully!");
            });
    }

    return resolveRepository(context)
        .andThen(
            (repository: Repository): ResultAsync<[Repository, string], Error> =>
                removeHeaderFromChangelog(context.changelogContent).map((content: string): [Repository, string] => [
                    repository,
                    content,
                ])
        )
        .andThen(
            ([repository, content]: [Repository, string]): ResultAsync<void, Error> =>
                publishRelease(repository, content)
        )
        .map((): CastoriaContext => context)
        .mapErr((error: Error): Error => {
            logger.error("Failed to create GitHub release:", error);
            return new Error(
                "Failed to create GitHub release. Please ensure you have the required permissions and, if using a fine-grained PAT for an organization, that it was created in the organization settings."
            );
        });
}

/**
 * Executes the release pipeline to create a GitHub release.
 */
export function releasePipeline(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    if (context.options.bumpOnly || context.options.bumpOnlyWithChangelog) {
        const flag = context.options.bumpOnly ? "--bump-only" : "--bump-only-with-changelog";
        logger.info(`Skipping GitHub release creation ${colors.dim(`(${flag})`)}`);
        return okAsync(context);
    }

    if (context.options.skipRelease) {
        logger.info(`Skipping GitHub release creation ${colors.dim("(--skip-release)")}`);
        return okAsync(context);
    }

    if (!context.config.github.release.enabled) {
        logger.info(`Skipping GitHub release creation ${colors.dim("(disabled in config)")}`);
        return okAsync(context);
    }

    logger.info("Creating GitHub release...");
    return createGitHubRelease(context);
}
