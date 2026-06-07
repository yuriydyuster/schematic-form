import type {JsonPrimitive, JsonSchema, JsonValue, PathSegment, SchemaType, SupportedStringFormat} from "./types";
import type {SchemaResolutionContext} from "./refResolver";
import {resolveSchemaForContext} from "./refResolver";

const supportedFormats = new Set<SupportedStringFormat>([
  "date",
  "time",
  "date-time",
  "email",
  "uri",
  "hostname",
  "ipv4",
  "ipv6",
  "uuid",
]);

export function getSchemaType(schema: JsonSchema, context: SchemaResolutionContext = {}): SchemaType | undefined {
  schema = getEffectiveSchema(schema, context).schema;
  const raw = Array.isArray(schema.type) ? schema.type.find((type) => type !== "null") : schema.type;
  if (raw) return raw;
  if (schema.oneOf || schema.anyOf) return undefined;
  if (schema.properties) return "object";
  if (schema.items) return "array";
  if (schema.enum?.length) return inferEnumType(schema.enum);
  return undefined;
}

export function isDisplayOnlySchema(schema: JsonSchema, context: SchemaResolutionContext = {}): boolean {
  return getSchemaType(schema, context) === "null";
}

export function getBranchSchemas(
  schema: JsonSchema,
  context: SchemaResolutionContext = {},
): {kind: "oneOf" | "anyOf"; branches: JsonSchema[]; rootSchema?: JsonSchema; refStack: string[]} | null {
  const effective = getEffectiveSchema(schema, context);
  schema = effective.schema;
  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return {
      kind: "oneOf",
      branches: schema.oneOf.map((branch) => getEffectiveSchema(branch, effective).schema),
      rootSchema: effective.rootSchema,
      refStack: effective.refStack,
    };
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return {
      kind: "anyOf",
      branches: schema.anyOf.map((branch) => getEffectiveSchema(branch, effective).schema),
      rootSchema: effective.rootSchema,
      refStack: effective.refStack,
    };
  }
  return null;
}

export function getDefaultBranchIndex(
  schema: JsonSchema,
  branches: JsonSchema[],
  context: SchemaResolutionContext = {},
): number | undefined {
  const effective = getEffectiveSchema(schema, context);
  schema = effective.schema;
  if (schema.default !== undefined) {
    const defaultValue = schema.default;
    const exactBranchDefault = branches.findIndex(
      (branch) => branch.default !== undefined && jsonValuesEqual(branch.default, defaultValue),
    );
    if (exactBranchDefault >= 0) return exactBranchDefault;

    const matchingBranch = branches.findIndex((branch) => valueMatchesSchemaShape(defaultValue, branch, effective));
    return matchingBranch >= 0 ? matchingBranch : 0;
  }

  const explicitBranchDefault = branches.findIndex((branch) => branch.default !== undefined);
  return explicitBranchDefault >= 0 ? explicitBranchDefault : undefined;
}

export function getOrderedPropertyKeys(schema: JsonSchema, context: SchemaResolutionContext = {}): string[] {
  schema = getEffectiveSchema(schema, context).schema;
  const properties = schema.properties ?? {};
  const originalKeys = Object.keys(properties);
  const preferred = Array.isArray(schema.propertyOrdering) ? schema.propertyOrdering : [];
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const key of preferred) {
    if (Object.prototype.hasOwnProperty.call(properties, key)) {
      ordered.push(key);
      seen.add(key);
    }
  }

  for (const key of originalKeys) {
    if (!seen.has(key)) ordered.push(key);
  }

  return ordered;
}

export function getLabel(schema: JsonSchema, path: PathSegment[], fallback = "Field"): string {
  if (typeof schema.title === "string" && schema.title.trim()) return schema.title;
  const last = path[path.length - 1];
  if (last == null) return fallback;
  if (typeof last === "number") return `${fallback} ${last + 1}`;
  return last || fallback;
}

export function getSupportedFormat(schema: JsonSchema, context: SchemaResolutionContext = {}): SupportedStringFormat | undefined {
  schema = getEffectiveSchema(schema, context).schema;
  if (typeof schema.format !== "string") return undefined;
  return supportedFormats.has(schema.format as SupportedStringFormat)
    ? (schema.format as SupportedStringFormat)
    : undefined;
}

export function isLongUnformattedString(schema: JsonSchema, context: SchemaResolutionContext = {}): boolean {
  const effective = getEffectiveSchema(schema, context);
  schema = effective.schema;
  return (
    getSchemaType(schema, effective) === "string" &&
    !getSupportedFormat(schema, effective) &&
    ((typeof schema.minLength === "number" && schema.minLength > 255) ||
      (typeof schema.maxLength === "number" && schema.maxLength > 255))
  );
}

export function isEnumSchema(schema: JsonSchema, context: SchemaResolutionContext = {}): boolean {
  schema = getEffectiveSchema(schema, context).schema;
  return Array.isArray(schema.enum) && schema.enum.length > 0;
}

export function getSingleEnumValue(schema: JsonSchema, context: SchemaResolutionContext = {}): JsonPrimitive | undefined {
  schema = getEffectiveSchema(schema, context).schema;
  return Array.isArray(schema.enum) && schema.enum.length === 1 ? cloneJson(schema.enum[0]) : undefined;
}

export function isArrayOfStringEnum(schema: JsonSchema, context: SchemaResolutionContext = {}): boolean {
  const effective = getEffectiveSchema(schema, context);
  schema = effective.schema;
  if (schema.uniqueItems !== true) return false;
  const itemSchema = getSingleItemSchema(schema, {...effective, refStack: []});
  if (!itemSchema || !Array.isArray(itemSchema.enum)) return false;
  return itemSchema.enum.every((item) => typeof item === "string");
}

export function canAddArrayItem(schema: JsonSchema, length: number): boolean {
  return schema.maxItems == null || length < schema.maxItems;
}

export function defaultValueForSchema(schema: JsonSchema, context: SchemaResolutionContext = {}): JsonValue | undefined {
  const effective = getEffectiveSchema(schema, context);
  schema = effective.schema;
  if (schema.default !== undefined) return cloneJson(schema.default);

  const branch = getBranchSchemas(schema, effective);
  if (branch) {
    const defaultBranchIndex = getDefaultBranchIndex(schema, branch.branches, effective);
    return defaultBranchIndex == null
      ? undefined
      : defaultValueForSchema(branch.branches[defaultBranchIndex] ?? {}, {
          rootSchema: branch.rootSchema,
        });
  }

  const type = getSchemaType(schema, effective);
  if (type === "object") {
    const result: Record<string, JsonValue> = {};
    for (const key of getOrderedPropertyKeys(schema, effective)) {
      const child = schema.properties?.[key];
      if (!child || isDisplayOnlySchema(child, effective)) continue;
      const childIsRequired = schema.required?.includes(key) ?? false;
      const childSingleEnumValue = childIsRequired ? getSingleEnumValue(child, effective) : undefined;
      if (childSingleEnumValue !== undefined) {
        result[key] = childSingleEnumValue;
        continue;
      }
      const childDefault = defaultValueForSchema(child, effective);
      if (childDefault !== undefined) result[key] = childDefault;
    }
    return result;
  }

  if (type === "array") return [];
  if (type === "boolean") return false;
  if (schema.const !== undefined) return cloneJson(schema.const);
  return undefined;
}

export function defaultArrayItemValue(schema: JsonSchema, context: SchemaResolutionContext = {}): JsonValue | undefined {
  const effective = getEffectiveSchema(schema, context);
  schema = effective.schema;
  const itemSchema = getSingleItemSchema(schema, {...effective, refStack: []});
  if (!itemSchema) return undefined;
  const explicit = defaultValueForSchema(itemSchema, effective);
  if (explicit !== undefined) return explicit;

  const type = getSchemaType(itemSchema, effective);
  if (type === "object") return {};
  if (type === "array") return [];
  if (type === "boolean") return false;
  return undefined;
}

function getSingleItemSchema(schema: JsonSchema, context: SchemaResolutionContext = {}): JsonSchema | undefined {
  schema = getEffectiveSchema(schema, context).schema;
  if (!schema.items || Array.isArray(schema.items)) return undefined;
  return getEffectiveSchema(schema.items, context).schema;
}

export function enumValueToKey(value: JsonPrimitive): string {
  return JSON.stringify(value);
}

export function keyToEnumValue(key: string, options: JsonPrimitive[]): JsonPrimitive {
  return options.find((option) => enumValueToKey(option) === key) ?? key;
}

export function optionLabel(value: JsonPrimitive): string {
  if (value === null) return "Null";
  if (typeof value === "boolean") return value ? "True" : "False";
  return String(value);
}

function inferEnumType(values: JsonPrimitive[]): SchemaType | undefined {
  if (values.every((value) => typeof value === "string")) return "string";
  if (values.every((value) => typeof value === "number")) return "number";
  if (values.every((value) => typeof value === "boolean")) return "boolean";
  if (values.every((value) => value === null)) return "null";
  return undefined;
}

function valueMatchesSchemaShape(value: JsonValue, schema: JsonSchema, context: SchemaResolutionContext = {}): boolean {
  const effective = getEffectiveSchema(schema, context);
  schema = effective.schema;
  if (schema.const !== undefined) return jsonValuesEqual(value, schema.const);
  if (schema.enum?.some((option) => jsonValuesEqual(value, option))) return true;

  const type = getSchemaType(schema, effective);
  if (type === "object") {
    if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    const properties = schema.properties ?? {};
    if (schema.required?.some((key) => !Object.prototype.hasOwnProperty.call(value, key))) return false;
    return keys.length === 0 || keys.some((key) => Object.prototype.hasOwnProperty.call(properties, key));
  }

  if (type === "array") return Array.isArray(value);
  if (type === "null") return value === null;
  return typeof value === type;
}

function getEffectiveSchema(
  schema: JsonSchema,
  context: SchemaResolutionContext = {},
): {schema: JsonSchema; rootSchema?: JsonSchema; refStack: string[]} {
  const result = resolveSchemaForContext(schema, context);
  if (!result.ok) return {schema, rootSchema: context.rootSchema, refStack: context.refStack ?? []};
  return {schema: result.schema, rootSchema: context.rootSchema, refStack: result.refStack};
}

function jsonValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cloneJson<T>(value: T): T {
  if (value == null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value)) as T;
}
