import Ajv, {type ErrorObject, type ValidateFunction} from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

import {toFieldPath} from "./paths";
import {getSupportedFormat, isDisplayOnlySchema} from "./schema";
import type {CompiledValidation, JsonSchema, ValidationIssue} from "./types";

const ignoredKeys = new Set([
  "dependencies",
  "dependentRequired",
  "dependentSchemas",
  "if",
  "then",
  "else",
  "propertyOrdering",
  "allOf",
]);

export type SchemaValidator = {
  validate(data: unknown): CompiledValidation;
};

export function createSchemaValidator(
  schema: JsonSchema,
  errorFormatter?: (issue: ValidationIssue) => string,
): SchemaValidator {
  const sanitized = sanitizeSchemaForValidation(schema);
  const ajv = createAjvForSchema(sanitized);
  addFormats(ajv);
  ajv.addFormat("time", {
    type: "string",
    validate: isTimeFormat,
  });

  let validate: ValidateFunction;
  try {
    validate = ajv.compile(sanitized);
  } catch (error) {
    return {
      validate() {
        const message = error instanceof Error ? error.message : "Unknown schema compilation error";
        const issue = {
          path: "/",
          fieldPath: "form",
          keyword: "schema",
          message: `Schema could not be compiled: ${message}`,
        };
        return {isValid: false, issues: [issue], errors: [issue.message]};
      },
    };
  }

  return {
    validate(data: unknown) {
      const ok = validate(data);
      const issues = (ok ? [] : validate.errors ?? []).map(formatAjvError);
      const errors = issues.map((issue) => errorFormatter?.(issue) ?? `${issue.fieldPath}: ${issue.message}`);
      return {isValid: Boolean(ok), issues, errors};
    },
  };
}

export function sanitizeSchemaForValidation(
  schema: JsonSchema,
  context: {rootSchema: JsonSchema} = {rootSchema: schema},
): JsonSchema | boolean {
  if (isDisplayOnlySchema(schema, {rootSchema: context.rootSchema})) return true;

  const output: JsonSchema = {};
  for (const [key, value] of Object.entries(schema)) {
    if (ignoredKeys.has(key)) continue;
    if (key === "format" && !getSupportedFormat(schema)) continue;
    if (key === "$defs" && isRecord(value)) {
      output.$defs = Object.fromEntries(
        Object.entries(value).map(([definitionKey, definitionSchema]) => [
          definitionKey,
          sanitizeSchemaValue(definitionSchema, context),
        ]),
      );
      continue;
    }
    if (key === "anyOf" && Array.isArray(value)) {
      output.oneOf = value.map((branch) => sanitizedSchemaObject(sanitizeSchemaValue(branch, context)));
      continue;
    }
    if (key === "oneOf" && Array.isArray(value)) {
      output.oneOf = value.map((branch) => sanitizedSchemaObject(sanitizeSchemaValue(branch, context)));
      continue;
    }
    if (key === "properties" && isSchemaRecord(value)) {
      const nextProperties: Record<string, JsonSchema> = {};
      const required = new Set(schema.required ?? []);

      for (const [propertyKey, propertySchema] of Object.entries(value)) {
        if (isDisplayOnlySchema(propertySchema, {rootSchema: context.rootSchema})) {
          required.delete(propertyKey);
          continue;
        }
        const sanitizedProperty = sanitizeSchemaForValidation(propertySchema, context);
        if (sanitizedProperty !== true) nextProperties[propertyKey] = sanitizedProperty as JsonSchema;
      }

      output.properties = nextProperties;
      if (required.size > 0) output.required = [...required];
      continue;
    }
    if (key === "required") continue;
    if (key === "items") {
      if (Array.isArray(value)) {
        output.items = value.map((item) => {
          const sanitizedItem = sanitizeSchemaValue(item, context);
          return sanitizedItem === true ? {} : (sanitizedItem as JsonSchema);
        });
      } else if (isSchema(value)) {
        const sanitizedItems = sanitizeSchemaForValidation(value, context);
        output.items = sanitizedItems === true ? {} : (sanitizedItems as JsonSchema);
      }
      continue;
    }
    if (key === "additionalItems") {
      if (isSchema(value)) {
        const sanitizedAdditionalItems = sanitizeSchemaForValidation(value, context);
        output.additionalItems = sanitizedAdditionalItems === true ? {} : (sanitizedAdditionalItems as JsonSchema);
      } else {
        output.additionalItems = value as boolean;
      }
      continue;
    }
    if (key === "additionalProperties" && isSchema(value)) {
      const sanitizedAdditionalProperties = sanitizeSchemaForValidation(value, context);
      output.additionalProperties = sanitizedAdditionalProperties === true
        ? {}
        : (sanitizedAdditionalProperties as JsonSchema);
      continue;
    }
    output[key] = value;
  }
  return output;
}

function createAjvForSchema(schema: JsonSchema | boolean) {
  const options = {
    allErrors: true,
    strict: true,
    strictTuples: false,
    validateSchema: true,
  };
  return usesDraft202012(schema) ? new Ajv2020(options) : new Ajv(options);
}

function sanitizeSchemaValue(value: unknown, context: {rootSchema: JsonSchema}): JsonSchema | boolean {
  if (typeof value === "boolean") return value;
  if (isSchema(value)) return sanitizeSchemaForValidation(value, context);
  return {};
}

function sanitizedSchemaObject(value: JsonSchema | boolean): JsonSchema {
  return value === true ? {} : value === false ? {not: {}} : value;
}

function usesDraft202012(schema: JsonSchema | boolean): boolean {
  return isSchema(schema) && typeof schema.$schema === "string" && schema.$schema.includes("2020-12");
}

function formatAjvError(error: ErrorObject): ValidationIssue {
  const path = error.keyword === "required" ? requiredPath(error) : error.instancePath || "/";
  const pathSegments = path === "/" ? [] : path.replace(/^\//, "").split("/").map(decodePointerPart);

  return {
    path,
    fieldPath: toFieldPath(pathSegments),
    keyword: error.keyword,
    message: error.message ?? "Invalid value",
  };
}

function requiredPath(error: ErrorObject): string {
  const missing = typeof error.params.missingProperty === "string" ? error.params.missingProperty : "";
  if (!missing) return error.instancePath || "/";
  const base = error.instancePath || "";
  return `${base}/${encodePointerPart(missing)}` || "/";
}

function encodePointerPart(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function decodePointerPart(value: string): string {
  return value.replaceAll("~1", "/").replaceAll("~0", "~");
}

function isSchema(value: unknown): value is JsonSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSchemaRecord(value: unknown): value is Record<string, JsonSchema> {
  return isSchema(value) && Object.values(value).every(isSchema);
}

function isTimeFormat(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/.test(value);
}
