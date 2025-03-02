import type { ResultAsync } from "neverthrow";
import { verifyConditions } from "#/pipelines/verify/checks";
import { preflightSystem } from "#/pipelines/verify/preflight";
import type { CastoriaContext } from "#/types/context";

/**
 * The verification pipeline orchestrates the verification process of readiness for releasing.
 *
 * @param context The Castoria context.
 * @returns The updated Castoria context.
 */
export function verifyPipeline(context: CastoriaContext): ResultAsync<CastoriaContext, Error> {
    return preflightSystem(context).andThen(verifyConditions);
}
