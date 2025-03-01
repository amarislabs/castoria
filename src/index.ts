import type { CastoriaConfig } from "#/types/config";

/**
 * Define the configuration for Castoria
 * @param config - The configuration object
 * @returns The configuration object
 */
function defineConfig(config: Partial<CastoriaConfig>): Partial<CastoriaConfig> {
    return config;
}

export default defineConfig;
