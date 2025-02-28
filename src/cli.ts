#!/usr/bin/env bun

import { type Command, createCommand } from "commander";
import type { ResultAsync } from "neverthrow";
import { createFlags } from "#/cli-flags";
import { initializePipeline } from "#/pipelines/initialize";
import type { CastoriaOptions } from "#/types/castoria";

declare const DESCRIPTION: string;
declare const VERSION: string;

const program: Command = createCommand();

program
    .name("castoria")
    .description(DESCRIPTION)
    .version(VERSION, "--version", "Print the current version of Castoria.")
    .helpOption("-h, --help", "Print this help message.");

createFlags(program).action((options: CastoriaOptions): Promise<void> => {
    return new Promise<void>((): ResultAsync<void, Error> => initializePipeline(options));
});

program.parse(Bun.argv);
