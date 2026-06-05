import type React from "react";

export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = {[key: string]: JsonValue};
export type JsonArray = JsonValue[];
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export type SchemaType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "null";

export type SupportedStringFormat = "date" | "time" | "date-time" | "email" | "uri";

export type JsonSchema = {
  $id?: string;
  $schema?: string;
  type?: SchemaType | SchemaType[];
  title?: string;
  description?: string;
  default?: JsonValue;
  const?: JsonValue;
  enum?: JsonPrimitive[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  propertyOrdering?: string[];
  items?: JsonSchema | JsonSchema[];
  additionalItems?: boolean | JsonSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  multipleOf?: number;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  additionalProperties?: boolean | JsonSchema;
  [key: string]: unknown;
};

export type PathSegment = string | number;

export type ValidationMode = "change" | "blur" | "submit" | "hybrid";

export type ValidationIssue = {
  path: string;
  fieldPath: string;
  keyword: string;
  message: string;
};

export type SchematicFormState<TData = unknown> = {
  data: TData;
  isValid: boolean;
  errors: string[];
};

export type SchematicFormDraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type SchematicFormPersistenceOptions = {
  key: string;
  storage?: "localStorage" | "sessionStorage" | SchematicFormDraftStorage;
  debounceMs?: number;
  clearOnValidSubmit?: boolean;
};

export type FieldRenderContext = {
  schema: JsonSchema;
  path: PathSegment[];
  pointer: string;
  fieldPath: string;
  label: string;
  required: boolean;
  value: unknown;
  issues: ValidationIssue[];
  setValue: (value: unknown) => void;
};

export type SchematicFormProps<TData = unknown> = {
  schema: object;
  value?: TData;
  defaultValue?: TData;
  onChange?: (data: TData) => void;
  onStateChange?: (state: SchematicFormState<TData>) => void;
  onSubmit?: (state: SchematicFormState<TData>, event: React.FormEvent) => void | Promise<unknown>;
  validationMode?: ValidationMode;
  messages?: Partial<Record<string, string>>;
  className?: string;
  readOnly?: boolean;
  disabled?: boolean;
  persistence?: SchematicFormPersistenceOptions;
  fieldRenderer?: (ctx: FieldRenderContext) => React.ReactNode;
  errorFormatter?: (issue: ValidationIssue) => string;
};

export type CompiledValidation = {
  isValid: boolean;
  issues: ValidationIssue[];
  errors: string[];
};
