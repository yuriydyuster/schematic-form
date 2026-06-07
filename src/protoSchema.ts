import type {JsonPrimitive, JsonSchema, JsonValue, SchemaType} from "./types";

export const JSON_SCHEMA_2020_12 = "https://json-schema.org/draft/2020-12/schema" as const;

export type ProtoSchemaObject = {
  $schema: typeof JSON_SCHEMA_2020_12;
  title?: string;
  description?: string;
  type: "object";
  properties: ProtoProperty[];
  additionalProperties?: boolean;
};

export type ProtoProperty = {
  key: string;
  required: boolean;
  propertyAnnotation: ProtoPropertyAnnotation;
};

export type ProtoPropertyAnnotation =
  | ProtoStringAnnotation
  | ProtoNumberAnnotation
  | ProtoIntegerAnnotation
  | ProtoBooleanAnnotation
  | ProtoNullAnnotation
  | ProtoArrayAnnotation
  | ProtoObjectAnnotation;

type ProtoBaseAnnotation = {
  title?: string;
  description?: string;
  default?: JsonValue;
  enum?: JsonPrimitive[];
};

export type ProtoStringAnnotation = ProtoBaseAnnotation & {
  type: "string";
  default?: string;
  enum?: string[];
  minLength?: number;
  maxLength?: number;
  format?: string;
  pattern?: string;
};

export type ProtoNumberAnnotation = ProtoBaseAnnotation & {
  type: "number";
  default?: number;
  enum?: number[];
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
};

export type ProtoIntegerAnnotation = ProtoBaseAnnotation & {
  type: "integer";
  default?: number;
  enum?: number[];
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
};

export type ProtoBooleanAnnotation = ProtoBaseAnnotation & {
  type: "boolean";
  default?: boolean;
  enum?: boolean[];
};

export type ProtoNullAnnotation = Omit<ProtoBaseAnnotation, "default" | "enum"> & {
  type: "null";
  default?: null;
  enum?: null[];
};

export type ProtoArrayAnnotation = Omit<ProtoBaseAnnotation, "default" | "enum"> & {
  type: "array";
  items: ProtoPropertyAnnotation;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
};

export type ProtoObjectAnnotation = ProtoBaseAnnotation & {
  type: "object";
  default?: Record<string, JsonValue>;
  properties: ProtoProperty[];
  additionalProperties?: boolean;
};

export class ProtoSchemaConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProtoSchemaConversionError";
  }
}

const SCALAR_KEYS = [
  "title",
  "description",
  "default",
  "enum",
  "minLength",
  "maxLength",
  "format",
  "pattern",
  "minimum",
  "maximum",
  "multipleOf",
  "minItems",
  "maxItems",
  "uniqueItems",
] as const;

type SchemaRecord = Record<string, JsonSchema>;

export function protoSchemaToJsonSchema(protoSchema: ProtoSchemaObject): JsonSchema {
  const schema: JsonSchema = {
    $schema: protoSchema.$schema,
    type: "object",
  };

  copyDefined(schema, protoSchema, ["title", "description", "additionalProperties"]);
  applyClassicProperties(schema, protoSchema.properties, "root");

  return schema;
}

export function protoPropertyToJsonSchema(property: ProtoProperty): JsonSchema {
  return protoAnnotationToJsonSchema(property.propertyAnnotation, property.key || "property");
}

function protoAnnotationToJsonSchema(annotation: ProtoPropertyAnnotation, path: string): JsonSchema {
  const schema: JsonSchema = {type: annotation.type as SchemaType};
  copyDefined(schema, annotation, SCALAR_KEYS);

  if (annotation.type === "object") {
    applyClassicProperties(schema, annotation.properties, path);
    copyDefined(schema, annotation, ["additionalProperties"]);
  }

  if (annotation.type === "array") {
    if (!annotation.items) {
      throw new ProtoSchemaConversionError(`Array property "${path}" must define items.`);
    }
    schema.items = protoAnnotationToJsonSchema(annotation.items, `${path}.items`);
  }

  return schema;
}

function applyClassicProperties(schema: JsonSchema, properties: ProtoProperty[] | undefined, path: string) {
  const classicProperties: SchemaRecord = {};
  const required: string[] = [];
  const propertyOrdering: string[] = [];
  const seenKeys = new Set<string>();

  for (const property of properties ?? []) {
    const key = typeof property.key === "string" ? property.key.trim() : "";
    if (!key) continue;
    if (seenKeys.has(key)) {
      throw new ProtoSchemaConversionError(`Duplicate property key "${key}" at ${path}.`);
    }

    seenKeys.add(key);
    propertyOrdering.push(key);
    classicProperties[key] = protoPropertyToJsonSchema({...property, key});
    if (property.required) required.push(key);
  }

  schema.properties = classicProperties;
  if (propertyOrdering.length > 0) schema.propertyOrdering = propertyOrdering;
  if (required.length > 0) schema.required = required;
}

function copyDefined(target: JsonSchema, source: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined) target[key] = value;
  }
}
