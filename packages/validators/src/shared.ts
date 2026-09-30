import { z } from 'zod';

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});

/** The `{ data }` success envelope most API responses use. */
export const dataEnvelope = <TSchema extends z.ZodType>(schema: TSchema) =>
  z.object({ data: schema });

/** Instants on the wire: ISO-8601 with `Z` (Drizzle `Date` or `toISOString()`). */
export const isoTimestampSchema = z.iso.datetime();

type Normalize<T> = T extends readonly unknown[]
  ? { [K in keyof T]: Normalize<T[K]> }
  : T extends object
    ? { [K in keyof T]: Normalize<T[K]> }
    : T;

type IsExact<TLeft, TRight> =
  (<T>() => T extends Normalize<TLeft> ? 1 : 2) extends <
    T,
  >() => T extends Normalize<TRight> ? 1 : 2
    ? true
    : false;

/**
 * Compile-time proof that a schema's output is exactly `TInterface`, for wire types whose interface stays
 * in `@ploutizo/types` (because `@ploutizo/utils` consumes them). Unlike `satisfies z.ZodType<T>`, it also
 * fails when the interface gains a field the schema would silently strip.
 */
export const assertSchemaOutput = <TSchema extends z.ZodType, TInterface>(
  ..._proof: IsExact<z.output<TSchema>, TInterface> extends true
    ? []
    : [schemaOutputDriftsFromInterface: never]
) => undefined;
