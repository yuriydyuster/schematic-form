import type {
  JsonSchema,
  SchematicFormDraftStorage,
  SchematicFormPersistenceOptions,
} from "./types";

export const schematicFormDraftPayloadVersion = 1;

export type BranchValueCache = Record<string, Record<string, unknown>>;

export type SchematicFormDraftPayload = {
  version: typeof schematicFormDraftPayloadVersion;
  savedAt: number;
  schemaFingerprint: string;
  data: unknown;
  branchSelection: Record<string, number | null>;
  branchValueCache: BranchValueCache;
};

export function createSchemaFingerprint(schema: JsonSchema): string {
  return `sf-schema-v1:${hashString(stableStringify(schema))}`;
}

export function createDraftPayload({
  schemaFingerprint,
  data,
  branchSelection,
  branchValueCache,
}: {
  schemaFingerprint: string;
  data: unknown;
  branchSelection: Record<string, number | null>;
  branchValueCache: BranchValueCache;
}): SchematicFormDraftPayload {
  return {
    version: schematicFormDraftPayloadVersion,
    savedAt: Date.now(),
    schemaFingerprint,
    data,
    branchSelection,
    branchValueCache,
  };
}

export function parseSchematicFormDraft(
  raw: string | null,
  schemaFingerprint: string,
): SchematicFormDraftPayload | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  if (parsed.version !== schematicFormDraftPayloadVersion) return null;
  if (parsed.schemaFingerprint !== schemaFingerprint) return null;
  if (typeof parsed.savedAt !== "number" || !Number.isFinite(parsed.savedAt)) return null;

  const branchSelection = parseBranchSelection(parsed.branchSelection);
  if (!branchSelection) return null;

  const branchValueCache = parseBranchValueCache(parsed.branchValueCache);
  if (!branchValueCache) return null;

  return {
    version: schematicFormDraftPayloadVersion,
    savedAt: parsed.savedAt,
    schemaFingerprint,
    data: parsed.data,
    branchSelection,
    branchValueCache,
  };
}

export function resolveDraftStorage(
  storage: SchematicFormPersistenceOptions["storage"] = "localStorage",
): SchematicFormDraftStorage | null {
  if (typeof storage === "object" && storage) return storage;
  if (typeof window === "undefined") return null;

  try {
    return storage === "sessionStorage" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function readDraftPayload(
  storage: SchematicFormDraftStorage,
  key: string,
  schemaFingerprint: string,
): SchematicFormDraftPayload | null {
  try {
    return parseSchematicFormDraft(storage.getItem(key), schemaFingerprint);
  } catch {
    return null;
  }
}

export function writeDraftPayload(
  storage: SchematicFormDraftStorage,
  key: string,
  payload: SchematicFormDraftPayload,
): void {
  try {
    storage.setItem(key, JSON.stringify(payload));
  } catch {
    // Storage can be unavailable or full; draft persistence must never break the form.
  }
}

export function removeDraftPayload(storage: SchematicFormDraftStorage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Storage can be unavailable; clearing a draft is best-effort.
  }
}

export function cloneDraftValue<T>(value: T): T {
  if (value === undefined) return value;

  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function parseBranchSelection(value: unknown): Record<string, number | null> | null {
  if (!isRecord(value)) return null;

  const output: Record<string, number | null> = {};
  for (const [pointer, index] of Object.entries(value)) {
    if (index === null) {
      output[pointer] = null;
      continue;
    }
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0) return null;
    output[pointer] = index;
  }
  return output;
}

function parseBranchValueCache(value: unknown): BranchValueCache | null {
  if (!isRecord(value)) return null;

  const output: BranchValueCache = {};
  for (const [pointer, branches] of Object.entries(value)) {
    if (!isRecord(branches)) return null;
    output[pointer] = {...branches};
  }
  return output;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(toStableJsonValue(value));
}

function toStableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toStableJsonValue);
  if (!isRecord(value)) return value;

  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((output, key) => {
      const nextValue = toStableJsonValue(value[key]);
      if (nextValue !== undefined) output[key] = nextValue;
      return output;
    }, {});
}

function hashString(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
