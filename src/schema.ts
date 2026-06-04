import type {JsonPrimitive, JsonSchema, JsonValue, PathSegment, SchemaType, SupportedStringFormat} from "./types";

const supportedFormats = new Set<SupportedStringFormat>(["date", "time", "date-time", "email", "uri"]);

export function getSchemaType(schema: JsonSchema): SchemaType | undefined {
  const raw = Array.isArray(schema.type) ? schema.type.find((type) => type !== "null") : schema.type;
  if (raw) return raw;
  if (schema.oneOf || schema.anyOf) return undefined;
  if (schema.properties) return "object";
  if (schema.items) return "array";
  if (schema.enum?.length) return inferEnumType(schema.enum);
  return undefined;
}

export function isDisplayOnlySchema(schema: JsonSchema): boolean {
  return getSchemaType(schema) === "null";
}

export function getBranchSchemas(schema: JsonSchema): {kind: "oneOf" | "anyOf"; branches: JsonSchema[]} | null {
  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return {kind: "oneOf", branches: schema.oneOf};
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return {kind: "anyOf", branches: schema.anyOf};
  }
  return null;
}

export function getDefaultBranchIndex(schema: JsonSchema, branches: JsonSchema[]): number | undefined {
  if (schema.default !== undefined) {
    const defaultValue = schema.default;
    const exactBranchDefault = branches.findIndex(
      (branch) => branch.default !== undefined && jsonValuesEqual(branch.default, defaultValue),
    );
    if (exactBranchDefault >= 0) return exactBranchDefault;

    const matchingBranch = branches.findIndex((branch) => valueMatchesSchemaShape(defaultValue, branch));
    return matchingBranch >= 0 ? matchingBranch : 0;
  }

  const explicitBranchDefault = branches.findIndex((branch) => branch.default !== undefined);
  return explicitBranchDefault >= 0 ? explicitBranchDefault : undefined;
}

export function getOrderedPropertyKeys(schema: JsonSchema): string[] {
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
  return titleize(last);
}

export function titleize(value: string): string {
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : "Field";
}

export function getSupportedFormat(schema: JsonSchema): SupportedStringFormat | undefined {
  if (typeof schema.format !== "string") return undefined;
  return supportedFormats.has(schema.format as SupportedStringFormat)
    ? (schema.format as SupportedStringFormat)
    : undefined;
}

export function isLongUnformattedString(schema: JsonSchema): boolean {
  return (
    getSchemaType(schema) === "string" &&
    !getSupportedFormat(schema) &&
    ((typeof schema.minLength === "number" && schema.minLength > 255) ||
      (typeof schema.maxLength === "number" && schema.maxLength > 255))
  );
}

export function isEnumSchema(schema: JsonSchema): boolean {
  return Array.isArray(schema.enum) && schema.enum.length > 0;
}

export function isArrayOfStringEnum(schema: JsonSchema): boolean {
  const itemSchema = getSingleItemSchema(schema);
  if (!itemSchema || !Array.isArray(itemSchema.enum)) return false;
  return itemSchema.enum.every((item) => typeof item === "string");
}

export function canAddArrayItem(schema: JsonSchema, length: number): boolean {
  return schema.maxItems == null || length < schema.maxItems;
}

export function defaultValueForSchema(schema: JsonSchema): JsonValue | undefined {
  if (schema.default !== undefined) return cloneJson(schema.default);

  const branch = getBranchSchemas(schema);
  if (branch) {
    const defaultBranchIndex = getDefaultBranchIndex(schema, branch.branches);
    return defaultBranchIndex == null ? undefined : defaultValueForSchema(branch.branches[defaultBranchIndex] ?? {});
  }

  const type = getSchemaType(schema);
  if (type === "object") {
    const result: Record<string, JsonValue> = {};
    for (const key of getOrderedPropertyKeys(schema)) {
      const child = schema.properties?.[key];
      if (!child || isDisplayOnlySchema(child)) continue;
      const childDefault = defaultValueForSchema(child);
      if (childDefault !== undefined) result[key] = childDefault;
    }
    return result;
  }

  if (type === "array") return [];
  if (type === "boolean") return false;
  if (schema.const !== undefined) return cloneJson(schema.const);
  return undefined;
}

export function defaultArrayItemValue(schema: JsonSchema): JsonValue | undefined {
  const itemSchema = getSingleItemSchema(schema);
  if (!itemSchema) return undefined;
  const explicit = defaultValueForSchema(itemSchema);
  if (explicit !== undefined) return explicit;

  const type = getSchemaType(itemSchema);
  if (type === "object") return {};
  if (type === "array") return [];
  if (type === "boolean") return false;
  return undefined;
}

function getSingleItemSchema(schema: JsonSchema): JsonSchema | undefined {
  return schema.items && !Array.isArray(schema.items) ? schema.items : undefined;
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

function valueMatchesSchemaShape(value: JsonValue, schema: JsonSchema): boolean {
  if (schema.const !== undefined) return jsonValuesEqual(value, schema.const);
  if (schema.enum?.some((option) => jsonValuesEqual(value, option))) return true;

  const type = getSchemaType(schema);
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

function jsonValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cloneJson<T>(value: T): T {
  if (value == null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value)) as T;
}
