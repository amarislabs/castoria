import type { OptionalBumpStrategy, OptionalReleaseType, ReleaseIdentifierBase } from "#/types";

export interface CastoriaOptions {
    verbose: boolean;
    dryRun: boolean;
    name: string;
    bumpStrategy: OptionalBumpStrategy;
    releaseType: OptionalReleaseType;
    preReleaseId: string;
    preReleaseBase: ReleaseIdentifierBase;
}
