import { createTokenAuth } from "@octokit/auth-token";
import { Octokit } from "@octokit/core";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { runGh } from "#/adapters/github";
import type { CastoriaContext } from "#/types/context";
import logger from "#/utils/logger";

/**
 * Retrieves the GitHub authentication token from various sources.
 *
 * @param context The Castoria context.
 * @returns The GitHub authentication token.
 */
export function getToken(context: CastoriaContext): ResultAsync<string, Error> {
    const token: string = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.TOKEN || "";

    if (token.trim()) {
        logger.verbose("A GitHub token was found in the environment variables, using it.");
        return okAsync(token);
    }

    if (context) {
        logger.verbose("Can't find a GitHub token in the environment variables, trying to get it from gh cli.");

        return getTokenFromGhCli(context);
    }

    return errAsync(new Error("No GitHub token found in environment variables or gh CLI"));
}

/**
 * Retrieves the GitHub authentication token from the GitHub CLI.
 *
 * @param context The Castoria context.
 * @returns The GitHub authentication token.
 */
function getTokenFromGhCli(context: CastoriaContext): ResultAsync<string, Error> {
    return runGh(["auth", "status"], context).andThen((result: string) => {
        const hasRepoScope: boolean = result.includes("'repo'") || result.includes('"repo"');

        if (!hasRepoScope) {
            return errAsync(new Error("GitHub CLI is not authenticated with 'repo' scope"));
        }

        return runGh(["auth", "token"], context).map((tokenResult: string) => {
            const token: string = tokenResult.trim();
            return token;
        });
    });
}

export const OctokitRequestHeaders = {
    "X-GitHub-Api-Version": "2022-11-28",
    Accept: "application/vnd.github+json",
};

const CASTORIA_USER_AGENT = "Castoria (https://github.com/amarislabs/castoria)";

/**
 * Creates an Octokit instance with the provided token.
 *
 * @param token The authentication token for the Octokit instance.
 * @returns The created Octokit instance.
 */
export function createOctokit(token: string): ResultAsync<Octokit, Error> {
    /**
     * Creates an Octokit instance with default settings.
     *
     * @param token The authentication token for the Octokit instance.
     * @returns The created Octokit instance.
     */
    function createOctokitInstance(token: string): Octokit {
        const octokitWithDefaults: typeof Octokit = Octokit.defaults({
            userAgent: CASTORIA_USER_AGENT,
        });

        return new octokitWithDefaults({ auth: token });
    }

    /**
     * Authenticates with GitHub using the provided token.
     *
     * @param token The authentication token for GitHub.
     * @returns A ResultAsync containing the authenticated token or an error.
     */
    function authenticateWithGithub(token: string): ResultAsync<{ token: string }, Error> {
        return ResultAsync.fromPromise(
            createTokenAuth(token)(),
            (error: unknown): Error => new Error(`Failed to authenticate with GitHub: ${error}`)
        );
    }

    return authenticateWithGithub(token)
        .map((auth: { token: string }): Octokit => {
            const octokit = createOctokitInstance(auth.token);
            return octokit;
        })
        .mapErr((error: Error): Error => {
            logger.verbose(error.message);
            return error;
        });
}
