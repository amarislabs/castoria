import { type ConfigLayerMeta, type ResolvedConfig, loadConfig } from "c12";
import { ResultAsync } from "neverthrow";
import { createDefaultConfiguration } from "#/libs/context";
import { createErrorFromUnknown } from "#/libs/utils/error";
import type { CastoriaConfig } from "#/types/castoria";

/**
 * Retrieves the file configuration settings for castoria.
 */
export function getConfig(): ResultAsync<CastoriaConfig, Error> {
    return ResultAsync.fromPromise(
        loadConfig<CastoriaConfig>({
            name: "castoria",
            defaults: createDefaultConfiguration(),
        }),
        (error: unknown): Error => createErrorFromUnknown("Failed to load configuration", error)
    ).map((config: ResolvedConfig<CastoriaConfig, ConfigLayerMeta>): CastoriaConfig => config.config);
}
