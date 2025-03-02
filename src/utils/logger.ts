import { ContainerReporter } from "@amarislabs/logger";
import { type ConsolaInstance, LogLevels, createConsola } from "consola";

const logger: ConsolaInstance = createConsola({ level: LogLevels.info });
logger.setReporters([new ContainerReporter({ dimTypes: ["verbose"], lineBreakBehavior: "always" })]);

export default logger;
