import {describe, expect, test} from "vitest";

import {resolveSchemaReference} from "./refResolver";
import type {JsonSchema} from "./types";

describe("ref resolver", () => {
  test("resolves local $defs references", () => {
    const schema = {
      type: "object",
      properties: {
        person: {$ref: "#/$defs/person"},
      },
      $defs: {
        person: {type: "object", title: "Person", properties: {name: {type: "string"}}},
      },
    } satisfies JsonSchema;

    const result = resolveSchemaReference(schema, schema.properties.person);

    expect(result).toMatchObject({
      ok: true,
      schema: {
        type: "object",
        title: "Person",
      },
      refStack: ["#/$defs/person"],
    });
  });

  test("resolves root references", () => {
    const schema = {
      type: "object",
      title: "Root",
      properties: {},
    } satisfies JsonSchema;

    const result = resolveSchemaReference(schema, {$ref: "#"});

    expect(result).toMatchObject({ok: true, schema});
  });

  test("decodes escaped JSON Pointer segments", () => {
    const schema = {
      $defs: {
        "a/b": {
          "tilde~key": {type: "string", title: "Escaped"},
        },
      },
    } satisfies JsonSchema;

    const result = resolveSchemaReference(schema, {$ref: "#/$defs/a~1b/tilde~0key"});

    expect(result).toMatchObject({ok: true, schema: {title: "Escaped"}});
  });

  test("returns safe failures for missing and remote references", () => {
    const schema = {$defs: {person: {type: "object"}}} satisfies JsonSchema;

    expect(resolveSchemaReference(schema, {$ref: "#/$defs/missing"})).toMatchObject({
      ok: false,
      reason: expect.stringContaining("Missing"),
    });
    expect(resolveSchemaReference(schema, {$ref: "https://example.com/schema.json"})).toMatchObject({
      ok: false,
      reason: expect.stringContaining("Unsupported non-local"),
    });
  });

  test("overlays sibling annotations over referenced schemas", () => {
    const schema = {
      $defs: {
        field: {type: "string", title: "Base", description: "Base description"},
      },
    } satisfies JsonSchema;

    const result = resolveSchemaReference(schema, {
      $ref: "#/$defs/field",
      title: "Local",
      default: "Ada",
    });

    expect(result).toMatchObject({
      ok: true,
      schema: {
        type: "string",
        title: "Local",
        description: "Base description",
        default: "Ada",
      },
    });
  });

  test("supports direct self-references without hanging", () => {
    const schema = {$ref: "#"} satisfies JsonSchema;

    expect(resolveSchemaReference(schema, schema)).toMatchObject({
      ok: true,
      schema: {$ref: "#"},
    });
  });
});
