import { type ConfigLayerMeta, type ResolvedConfig, loadConfig } from "c12";
import { ResultAsync } from "neverthrow";
import { createDefaultConfig } from "#/core/context";
import type { CastoriaConfig } from "#/types/config";
import type { CastoriaContext } from "#/types/context";

/**
 * Retrieves the file configuration settings for castoria.
 *
 * @returns The loaded configuration settings.
 */
export function getConfig(): ResultAsync<CastoriaConfig, Error> {
    return ResultAsync.fromPromise(
        loadConfig<CastoriaConfig>({
            name: "castoria",
            defaults: createDefaultConfig(),
        }),
        (error: unknown): Error => new Error(`Failed to load configuration: ${error}`)
    )
        .map((config: ResolvedConfig<CastoriaConfig, ConfigLayerMeta>): CastoriaConfig => config.config)
        .mapErr((error: Error): Error => new Error(`Configuration retrieval error: ${error.message}`));
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
 * @returns The resolved tag annotation.
 */
export function resolveTagAnnotation(context: CastoriaContext): string {
    const template: string = context.config.git.tagAnnotation;
    return template.includes("{{version}}") ? template.replace("{{version}}", context.nextVersion || "") : template;
}

/**
 * Substitutes placeholders in the commit message with actual values.
 *
 * @param context The Castoria context.
 * @returns The resolved commit message.
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
 * @returns The resolved release title.
 */
export function resolveReleaseTitle(context: CastoriaContext): string {
    return context.config.github.release.title.replace("{{version}}", context.nextVersion || "");
}
