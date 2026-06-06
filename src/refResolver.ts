import type {JsonSchema} from "./types";

export type SchemaResolutionResult =
  | {ok: true; schema: JsonSchema; refStack: string[]}
  | {ok: false; reason: string; refStack: string[]};

export type SchemaResolutionContext = {
  rootSchema?: JsonSchema;
  refStack?: string[];
};

export function resolveSchemaReference(
  rootSchema: JsonSchema,
  schema: JsonSchema,
  refStack: string[] = [],
): SchemaResolutionResult {
  const ref = typeof schema.$ref === "string" ? schema.$ref : undefined;
  if (!ref) return {ok: true, schema, refStack};

  if (!ref.startsWith("#")) {
    return {ok: false, reason: `Unsupported non-local schema reference: ${ref}`, refStack};
  }

  if (refStack.includes(ref)) {
    const target = resolveLocalJsonPointer(rootSchema, ref);
    if (!target.ok) return {ok: false, reason: target.reason, refStack};
    if (!isSchemaObject(target.value)) {
      return {ok: false, reason: `Schema reference does not resolve to an object schema: ${ref}`, refStack};
    }
    return {ok: true, schema: mergeReferenceSiblings(target.value, schema), refStack};
  }

  const target = resolveLocalJsonPointer(rootSchema, ref);
  if (!target.ok) return {ok: false, reason: target.reason, refStack};
  if (!isSchemaObject(target.value)) {
    return {ok: false, reason: `Schema reference does not resolve to an object schema: ${ref}`, refStack};
  }

  const nextStack = [...refStack, ref];
  const resolvedTarget = resolveSchemaReference(rootSchema, target.value, nextStack);
  if (!resolvedTarget.ok) return resolvedTarget;

  return {
    ok: true,
    schema: mergeReferenceSiblings(resolvedTarget.schema, schema),
    refStack: resolvedTarget.refStack,
  };
}

export function resolveSchemaForContext(
  schema: JsonSchema,
  context: SchemaResolutionContext = {},
): SchemaResolutionResult {
  if (!context.rootSchema) return {ok: true, schema, refStack: context.refStack ?? []};
  return resolveSchemaReference(context.rootSchema, schema, context.refStack ?? []);
}

function resolveLocalJsonPointer(rootSchema: JsonSchema, ref: string): {ok: true; value: unknown} | {ok: false; reason: string} {
  if (ref === "#") return {ok: true, value: rootSchema};
  if (!ref.startsWith("#/")) return {ok: false, reason: `Invalid local schema reference: ${ref}`};

  let pointer = ref.slice(1);
  try {
    pointer = decodeURIComponent(pointer);
  } catch {
    return {ok: false, reason: `Invalid encoded local schema reference: ${ref}`};
  }

  let current: unknown = rootSchema;
  for (const segment of pointer.slice(1).split("/").map(decodePointerPart)) {
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9]\d*)$/.test(segment)) return {ok: false, reason: `Invalid array schema reference segment: ${ref}`};
      current = current[Number(segment)];
      continue;
    }
    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return {ok: false, reason: `Missing local schema reference target: ${ref}`};
    }
    current = current[segment];
  }

  return {ok: true, value: current};
}

function mergeReferenceSiblings(target: JsonSchema, referenceSchema: JsonSchema): JsonSchema {
  const siblings = Object.entries(referenceSchema).filter(([key]) => key !== "$ref");
  if (siblings.length === 0) return target;
  return {...target, ...Object.fromEntries(siblings)};
}

function decodePointerPart(value: string): string {
  return value.replaceAll("~1", "/").replaceAll("~0", "~");
}

function isSchemaObject(value: unknown): value is JsonSchema {
  return isRecord(value) && !Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
