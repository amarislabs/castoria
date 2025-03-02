import { Bumper, type BumperRecommendation } from "conventional-recommended-bump";
import { type Ok, ResultAsync, ok } from "neverthrow";
import type { ReleaseType } from "semver";
import { CWD } from "#/core/constants";
import { incrementVersion } from "#/pipelines/version";
import type { CastoriaContext } from "#/types/context";
import logger from "#/utils/logger";

/**
 * Commit structure.
 */
type Commit = CommitBase & Record<string, string | null>;

/**
 * Base commit structure.
 */
interface CommitBase {
    readonly merge: string | null;
    readonly revert: Record<string, string | null> | null;
    readonly header: string | null;
    readonly body: string | null;
    readonly footer: string | null;
    readonly notes: readonly CommitNote[];
    readonly mentions: readonly string[];
    readonly references: readonly CommitReference[];
}

/**
 * Commit note structure.
 */
interface CommitNote {
    readonly title: string;
    readonly text: string;
}

/**
 * Commit reference structure.
 */
interface CommitReference {
    readonly raw: string;
    readonly action: string | null;
    readonly owner: string | null;
    readonly repository: string | null;
    readonly issue: string;
    readonly prefix: string;
}

/**
 * Analysis structure for breaking changes and features.
 */
interface Analysis {
    breakings: number;
    features: number;
}

const CONVENTIONAL_OPTIONS = {
    headerPattern: /^(\w*)(?:\((.*)\))?: (.*)$/,
    headerCorrespondence: ["type", "scope", "subject"],
    noteKeywords: ["BREAKING CHANGE"],
    revertPattern: /^(?:Revert|revert:)\s"?([\s\S]+?)"?\s*This reverts commit (\w*)\./i,
    revertCorrespondence: ["header", "hash"],
    breakingHeaderPattern: /^(\w*)(?:\((.*)\))?!: (.*)$/,
};

/**
 * Generates an automatic version based on conventional commits.
 *
 * @param context The Castoria context.
 * @returns The generated version.
 */
export function generateAutomaticVersion(context: CastoriaContext): ResultAsync<string, Error> {
    const basePipeline: ResultAsync<BumperRecommendation, Error> = getAutomaticConventionalBump();
    const pipelineWithSpacing: ResultAsync<BumperRecommendation, Error> = context.options.bumpStrategy
        ? basePipeline
        : basePipeline.andTee((): void => console.log(" "));

    return pipelineWithSpacing
        .andThen((recommendation: BumperRecommendation): Ok<string, never> => {
            logger.verbose(recommendation.reason);
            const nextVersion: string = determineVersion(context, recommendation);
            return ok(nextVersion);
        })
        .mapErr((error: unknown): Error => new Error(`Failed to generate automatic version: ${error}`));
}

/**
 * Determines the version based on the context and recommendation.
 *
 * @param context The Castoria context.
 * @param recommendation The recommendation for the bump level.
 * @returns The determined version.
 */
function determineVersion(context: CastoriaContext, recommendation: BumperRecommendation): string {
    if (context.options.releaseType === "prerelease") {
        return incrementVersion(context, "prerelease");
    }

    const releaseType: ReleaseType =
        recommendation.level === 0 ? "major" : recommendation.level === 1 ? "minor" : "patch";

    if (context.options.preReleaseId) {
        return incrementVersion(context, `pre${releaseType}` as ReleaseType);
    }

    return incrementVersion(context, releaseType);
}

/**
 * Utilizes the conventional-recommended-bump package to get the automatic conventional bump.
 *
 * @returns The recommendation for the bump level.
 */
function getAutomaticConventionalBump(): ResultAsync<BumperRecommendation, Error> {
    return ResultAsync.fromPromise(
        new Bumper()
            .commits({ path: CWD }, CONVENTIONAL_OPTIONS)
            .bump((commits: Commit[]): Promise<BumperRecommendation> => Promise.resolve(analyzeBumpLevel(commits))),
        (error: unknown): Error => new Error(`Failed to get automatic conventional bump: ${error}`)
    );
}

/**
 * Analyzes the bump level based on the provided commits.
 *
 * @param commits The array of commits to analyze.
 * @returns The recommendation for the bump level.
 */
function analyzeBumpLevel(commits: readonly Commit[]): BumperRecommendation {
    const analysis: Analysis = commits.reduce(
        (acc: Analysis, commit: Commit): Analysis => ({
            breakings: acc.breakings + commit.notes.length,
            features: acc.features + (commit.type === "feat" ? 1 : 0),
        }),
        { breakings: 0, features: 0 }
    );

    const level: 0 | 1 | 2 = analysis.breakings > 0 ? 0 : analysis.features > 0 ? 1 : 2;

    return {
        level,
        reason: `There ${analysis.breakings === 1 ? "is" : "are"} ${analysis.breakings} BREAKING CHANGE${analysis.breakings === 1 ? "" : "S"} and ${analysis.features} features`,
    };
}
