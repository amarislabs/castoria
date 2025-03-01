import type { RepositoryIdentifier } from "#/types";

export interface CastoriaConfig {
    changelog: {
        enabled: boolean;
        path: string;
    };
    git: {
        repository: "auto" | RepositoryIdentifier;
        requireBranch: boolean;
        branches: string | string[];
        requireCleanWorkingDirectory: boolean;
        requireUpstream: boolean;
        commitMessage: string;
        tagName: string;
        tagAnnotation: string;
    };
    github: {
        release: {
            enabled: boolean;
            title: string;
        };
    };
}
