import { join } from "node:path";

export const CASTORIA_ROOT: string = new URL("../../", import.meta.url).pathname;
export const CASTORIA_PACKAGE_PATH: string = join(CASTORIA_ROOT, "package.json");

export const CWD: string = process.cwd();
export const CWD_PACKAGE_PATH: string = join(CWD, "package.json");
export const CWD_GIT_CLIFF_PATH: string = join(CWD, "cliff.toml");
export const CWD_CARGO_TOML_PATH: string = join(CWD, "Cargo.toml");
