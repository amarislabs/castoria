import { type Command, createCommand } from "commander";
import { LogLevels } from "consola";
import { colors } from "consola/utils";
import type { ResultAsync } from "neverthrow";
import { createFlags } from "#/cli/flags";
import { initializePipeline } from "#/pipelines";
import type { CastoriaOptions } from "#/types/options";
import logger from "#/utils/logger";
import pkg from "../../package.json" with { type: "json" };

function cliEntrypoint(): void {
    const program: Command = createCommand();

    program
        .name("castoria")
        .description(pkg.description)
        .version(pkg.version, "--version", "Print the current version of Castoria.")
        .helpOption("-h, --help", "Print this help message.");

    createFlags(program).action((options: CastoriaOptions): Promise<void> => {
        logger.level = options.verbose ? LogLevels.verbose : LogLevels.info;
        logger.withTag("castoria").start(`running ${colors.bold(pkg.name)} version ${colors.cyan(pkg.version)}`);
        return new Promise<void>((): ResultAsync<void, Error> => initializePipeline(options));
    });

    program.parse(Bun.argv);
}

export default cliEntrypoint;
