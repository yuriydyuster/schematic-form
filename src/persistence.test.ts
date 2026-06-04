import {describe, expect, test, vi} from "vitest";

import {
  createDraftPayload,
  createSchemaFingerprint,
  parseSchematicFormDraft,
  readDraftPayload,
  removeDraftPayload,
  resolveDraftStorage,
  writeDraftPayload,
} from "./persistence";
import type {JsonSchema, SchematicFormDraftStorage} from "./types";

function createMemoryStorage(): SchematicFormDraftStorage & {values: Map<string, string>} {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe("draft persistence helpers", () => {
  test("computes deterministic schema fingerprints", () => {
    const left = {
      type: "object",
      title: "Profile",
      properties: {
        name: {type: "string", title: "Name"},
        age: {type: "integer", minimum: 0},
      },
      required: ["name"],
    } satisfies JsonSchema;
    const right = {
      required: ["name"],
      properties: {
        age: {minimum: 0, type: "integer"},
        name: {title: "Name", type: "string"},
      },
      title: "Profile",
      type: "object",
    } satisfies JsonSchema;

    expect(createSchemaFingerprint(left)).toBe(createSchemaFingerprint(right));
    expect(createSchemaFingerprint({...right, title: "Account"})).not.toBe(createSchemaFingerprint(left));
  });

  test("rejects invalid draft payloads", () => {
    const schema = {type: "object", properties: {name: {type: "string"}}} satisfies JsonSchema;
    const fingerprint = createSchemaFingerprint(schema);
    const payload = createDraftPayload({
      schemaFingerprint: fingerprint,
      data: {name: "Ada"},
      branchSelection: {},
      branchValueCache: {},
    });

    expect(parseSchematicFormDraft("not json", fingerprint)).toBeNull();
    expect(parseSchematicFormDraft(JSON.stringify({...payload, version: 0}), fingerprint)).toBeNull();
    expect(parseSchematicFormDraft(JSON.stringify(payload), "different")).toBeNull();
    expect(parseSchematicFormDraft(JSON.stringify({...payload, branchSelection: {"/choice": 1.5}}), fingerprint)).toBeNull();
    expect(parseSchematicFormDraft(JSON.stringify(payload), fingerprint)?.data).toEqual({name: "Ada"});
    expect(
      parseSchematicFormDraft(
        JSON.stringify({...payload, branchSelection: {"/choice": null}}),
        fingerprint,
      )?.branchSelection,
    ).toEqual({"/choice": null});
  });

  test("resolves storage adapters and swallows storage exceptions", () => {
    const custom = createMemoryStorage();
    vi.stubGlobal("localStorage", custom);
    vi.stubGlobal("sessionStorage", custom);

    expect(resolveDraftStorage(custom)).toBe(custom);
    expect(resolveDraftStorage("localStorage")).toBe(custom);
    expect(resolveDraftStorage("sessionStorage")).toBe(custom);

    const throwingStorage: SchematicFormDraftStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const schema = {type: "object"} satisfies JsonSchema;
    const fingerprint = createSchemaFingerprint(schema);
    const payload = createDraftPayload({
      schemaFingerprint: fingerprint,
      data: {},
      branchSelection: {},
      branchValueCache: {},
    });

    expect(readDraftPayload(throwingStorage, "draft", fingerprint)).toBeNull();
    expect(() => writeDraftPayload(throwingStorage, "draft", payload)).not.toThrow();
    expect(() => removeDraftPayload(throwingStorage, "draft")).not.toThrow();

    vi.unstubAllGlobals();
  });
});
