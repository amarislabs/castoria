import { execa } from "execa";
import { type Result, ResultAsync, err, errAsync, ok, okAsync } from "neverthrow";
import { createErrorFromUnknown } from "#/libs/utils/error";
import { logger } from "#/libs/utils/logger";
import type { Repository, RepositoryMetadata } from "#/types";
import type { CastoriaContext } from "#/types/castoria";

const DEFAULT_ERROR_MESSAGE = "Failed to execute Git command, please use --verbose for more information.";

/**
 * Represents the result of a Git command execution.
 */
export interface GitCommandResult {
    command: string;
    stdout: string;
}

/**
 * Executes a Git command with the provided arguments.
 *
 * @param args The arguments for the Git command.
 * @param context Castoria context.
 * @param errorMessage Optional error message.
 * @param skipDryRun Optional flag to skip dry run.
 */
export function executeGit(
    args: string[],
    context: CastoriaContext,
    errorMessage?: string,
    skipDryRun = false
): ResultAsync<GitCommandResult, Error> {
    if (context.options.dryRun && !skipDryRun) {
        logger.verbose(`Would execute git ${args.join(" ")}`);
        return okAsync({ command: `git ${args.join(" ")}`, stdout: "" });
    }
    logger.verbose(`Executing git ${args.join(" ")}`);

    return ResultAsync.fromPromise(
        execa("git", args, { cwd: process.cwd() }),
        (error: unknown): Error => createErrorFromUnknown(errorMessage ?? DEFAULT_ERROR_MESSAGE, error)
    ).mapErr((error: Error): Error => {
        logger.verbose(error.message);
        return error;
    });
}

/**
 * Executes a GitHub CLI command with the provided arguments.
 *
 * @param args The arguments for the Git command.
 * @param context Castoria context.
 * @param errorMessage Optional error message.
 * @param skipDryRun Optional flag to skip dry run.
 */
export function executeGitHubCli(
    args: string[],
    context: CastoriaContext,
    errorMessage?: string,
    skipDryRun = false
): ResultAsync<GitCommandResult, Error> {
    if (context.options.dryRun && !skipDryRun) {
        logger.verbose(`Would execute gh ${args.join(" ")}`);
        return okAsync({ command: `gh ${args.join(" ")}`, stdout: "" });
    }
    logger.verbose(`Executing gh ${args.join(" ")}`);

    return ResultAsync.fromPromise(
        execa("gh", args, { cwd: process.cwd() }),
        (error: unknown): Error => createErrorFromUnknown(errorMessage ?? DEFAULT_ERROR_MESSAGE, error)
    ).mapErr((error: Error): Error => {
        logger.verbose(error.message);
        return error;
    });
}

/**
 * Get the token from multiple possible environment variables.
 */
export function getToken(context: CastoriaContext): ResultAsync<string, Error> {
    const token: string = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.TOKEN || "";

    if (token.trim()) {
        logger.verbose("Using token from environment variables");
        return okAsync(token);
    }

    if (context) {
        logger.verbose("No token in environment variables, trying GitHub CLI");
        return getGitHubCliToken(context).orElse(() => {
            return errAsync(
                new Error(
                    "No authentication token provided. Please set GITHUB_TOKEN, GH_TOKEN, or TOKEN environment variable, or authenticate with GitHub CLI"
                )
            );
        });
    }

    return errAsync(
        new Error("No authentication token provided. Please set GITHUB_TOKEN, GH_TOKEN, or TOKEN environment variable")
    );
}

/**
 * Substitutes placeholders in the tag template with actual values.
 *
 * @param context The Castoria context.
 * @returns The resolved tag name.
 */
export function resolveTagName(context: CastoriaContext): string {
    const template: string = context.config.git.tagName;
    return template.includes("{{version}}") ? template.replace("{{version}}", context.nextVersion || "") : template;
}

/**
 * Substitutes placeholders in the tag annotation template with actual values.
 *
 * @param context The Castoria context.
 */
export function resolveTagAnnotation(context: CastoriaContext): string {
    const template: string = context.config.git.tagAnnotation;
    return template.includes("{{version}}") ? template.replace("{{version}}", context.nextVersion || "") : template;
}

/**
 * Substitutes placeholders in the commit message with actual values.
 *
 * @param context The Castoria context.
 */
export function resolveCommitMessage(context: CastoriaContext): string {
    let message: string = context.config.git.commitMessage;

    if (message.includes("{{version}}")) {
        message = message.replace("{{version}}", context.nextVersion || "");
    }

    if (message.includes("{{name}}")) {
        message = message.replace("{{name}}", context.options.name);
    }

    return message;
}

/**
 * Substitutes placeholders in the release title with actual values.
 *
 * @param context The Castoria context.
 */
export function resolveReleaseTitle(context: CastoriaContext): string {
    return context.config.github.release.title.replace("{{version}}", context.nextVersion || "");
}

/**
 * Get a repository URL from the origin remote.
 *
 * @param context The Castoria context.
 */
function getRepositoryUrl(context: CastoriaContext): ResultAsync<string, Error> {
    return executeGit(["remote", "get-url", "origin"], context, "", true).map((result: GitCommandResult): string =>
        result.stdout.trim()
    );
}

/**
 * Retrieves the GitHub repository URL using GitHub CLI.
 *
 * @param context The Castoria context.
 */
export function getRepositoryUsingGitHubCli(context: CastoriaContext): ResultAsync<string, Error> {
    return executeGitHubCli(["repo", "view", "--json", "url"], context, "Failed to get repository using GitHub CLI")
        .map((result: GitCommandResult): string => {
            const json: { url: string } = JSON.parse(result.stdout);
            return json.url;
        })
        .orElse((): ResultAsync<string, Error> => {
            logger.verbose("Failed to get repository using GitHub CLI, falling back to git");
            return getRepositoryUrl(context);
        });
}

/**
 * Extract the owner and name of a GitHub repository from a URL.
 *
 * @param url The repository URL.
 */
function extractRepository(url: string): Result<RepositoryMetadata, Error> {
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
            "Invalid repository URL format. Expected SSH (git@github.com:owner/repo) or HTTPS (https://github.com/owner/repo)"
        )
    );
}

/**
 * Retrieves the GitHub repository metadata using the Castoria context.
 *
 * @param context The Castoria context.
 */
export function getRepository(context: CastoriaContext): ResultAsync<Repository, Error> {
    return getRepositoryUrl(context).andThen((url: string): Result<Repository, Error> => {
        const result: Result<RepositoryMetadata, Error> = extractRepository(url);
        if (result.isOk()) {
            const ownerRepo = `${result.value.owner}/${result.value.repo}` as Repository;
            logger.verbose(`Fetched repository: ${ownerRepo}`);
            return ok(ownerRepo);
        }
        return err(result.error);
    });
}

/**
 * Checks if the user is authenticated with GitHub CLI.
 *
 * @returns A result indicating if the user is authenticated.
 */
export function isGitHubAuthenticated(context: CastoriaContext): ResultAsync<boolean, Error> {
    logger.verbose("Checking GitHub CLI authentication status");

    return ResultAsync.fromPromise(
        executeGitHubCli(["auth", "status"], context, "Failed to check GitHub authentication status"),
        (error: unknown): Error => createErrorFromUnknown("Failed to check GitHub authentication status", error)
    )
        .map((): boolean => true)
        .orElse((error: Error): Result<boolean, Error> => {
            if (error.message.includes("not logged into")) {
                return ok(false);
            }
            return err(error);
        });
}

/**
 * Gets the GitHub token from the GitHub CLI and verifies if it has the 'repo' scope.
 *
 * @returns A result containing the token details if successful.
 */
export function getGitHubCliToken(context: CastoriaContext): ResultAsync<string, Error> {
    logger.verbose("Retrieving GitHub token from GitHub CLI");

    return executeGitHubCli(["auth", "status"], context, "Failed to check GitHub authentication status").andThen(
        (result: GitCommandResult): ResultAsync<string, Error> => {
            const hasRepoScope: boolean = result.stdout.includes("'repo'") || result.stdout.includes('"repo"');

            if (!hasRepoScope) {
                logger.verbose("GitHub token does not have 'repo' scope");
            }

            return executeGitHubCli(["auth", "token"], context, "Failed to retrieve GitHub CLI token").map(
                (tokenResult: GitCommandResult) => {
                    const token: string = tokenResult.stdout.trim();
                    logger.verbose("Successfully retrieved GitHub token");
                    return token;
                }
            );
        }
    );
}
