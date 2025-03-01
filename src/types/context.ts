import type { CastoriaConfig } from "#/types/config";
import type { CastoriaOptions } from "#/types/options";

export interface CastoriaContext {
    options: CastoriaOptions;
    config: CastoriaConfig;
    currentVersion: string;
    nextVersion: string;
    changelogContent: string;
}
