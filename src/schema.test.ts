import {describe, expect, test} from "vitest";

import {
  defaultValueForSchema,
  getBranchSchemas,
  getDefaultBranchIndex,
  getOrderedPropertyKeys,
  isArrayOfStringEnum,
  isDisplayOnlySchema,
  isLongUnformattedString,
} from "./schema";
import type {JsonSchema} from "./types";

describe("schema helpers", () => {
  test("orders fields using propertyOrdering first, then object order", () => {
    const schema = {
      type: "object",
      propertyOrdering: ["c", "a"],
      properties: {
        a: {type: "string"},
        b: {type: "string"},
        c: {type: "string"},
      },
    } satisfies JsonSchema;

    expect(getOrderedPropertyKeys(schema)).toEqual(["c", "a", "b"]);
  });

  test("treats null fields as display-only and excludes them from defaults", () => {
    const schema = {
      type: "object",
      properties: {
        title: {type: "null", title: "Title"},
        nested: {type: "object", properties: {name: {type: "string", default: "Ada"}}},
      },
    } satisfies JsonSchema;

    expect(isDisplayOnlySchema(schema.properties.title)).toBe(true);
    expect(defaultValueForSchema(schema)).toEqual({nested: {name: "Ada"}});
  });

  test("does not synthesize first-branch defaults for oneOf or anyOf", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        choice: {
          anyOf: [
            {type: "object", title: "A", properties: {a: {type: "string", default: "Ada"}}},
            {type: "object", title: "B", properties: {b: {type: "string", default: "Grace"}}},
          ],
        },
      },
    };

    expect(defaultValueForSchema(schema)).toEqual({});
  });

  test("materializes required single-value enum defaults and omits optional single-value enums", () => {
    const schema = {
      type: "object",
      required: ["kind", "enabled", "referenced"],
      properties: {
        kind: {type: "string", enum: ["fixed"]},
        enabled: {type: "boolean", enum: [true]},
        optional: {type: "string", enum: ["optional"]},
        referenced: {$ref: "#/$defs/referenced"},
      },
      $defs: {
        referenced: {type: "integer", enum: [7]},
      },
    } satisfies JsonSchema;

    expect(defaultValueForSchema(schema, {rootSchema: schema})).toEqual({
      kind: "fixed",
      enabled: true,
      referenced: 7,
    });
  });

  test("uses explicit branch defaults for branch default selection", () => {
    const schema: JsonSchema = {
      oneOf: [
        {type: "object", title: "Pickup", default: {store: "Main"}, properties: {store: {type: "string"}}},
        {type: "object", title: "Shipping", properties: {address: {type: "string"}}},
      ],
    };

    expect(getDefaultBranchIndex(schema, schema.oneOf ?? [])).toBe(0);
    expect(defaultValueForSchema(schema)).toEqual({store: "Main"});
  });

  test("detects long unformatted multiline strings and enum string arrays", () => {
    expect(isLongUnformattedString({type: "string"})).toBe(false);
    expect(isLongUnformattedString({type: "string", maxLength: 255})).toBe(false);
    expect(isLongUnformattedString({type: "string", maxLength: 256})).toBe(true);
    expect(isLongUnformattedString({type: "string", minLength: 256})).toBe(true);
    expect(isLongUnformattedString({type: "string", format: "email", maxLength: 256})).toBe(false);

    expect(
      isArrayOfStringEnum({
        type: "array",
        uniqueItems: true,
        items: {type: "string", enum: ["A", "B"]},
      }),
    ).toBe(true);
    expect(
      isArrayOfStringEnum({
        type: "array",
        items: {type: "string", enum: ["A", "B"]},
      }),
    ).toBe(false);
  });

  test("derives defaults through local refs", () => {
    const schema = {
      type: "object",
      properties: {
        profile: {$ref: "#/$defs/profile"},
      },
      $defs: {
        profile: {
          type: "object",
          properties: {
            display: {type: "null", title: "Display"},
            name: {type: "string", default: "Ada"},
          },
        },
      },
    } satisfies JsonSchema;

    expect(defaultValueForSchema(schema, {rootSchema: schema})).toEqual({profile: {name: "Ada"}});
  });

  test("detects referenced enum string arrays and branch schemas", () => {
    const schema = {
      type: "object",
      properties: {
        tags: {
          type: "array",
          uniqueItems: true,
          items: {$ref: "#/$defs/tag"},
        },
        choice: {$ref: "#/$defs/choice"},
      },
      $defs: {
        tag: {type: "string", enum: ["A", "B"]},
        choice: {
          oneOf: [
            {type: "string", title: "Text"},
            {type: "boolean", title: "Toggle"},
          ],
        },
      },
    } satisfies JsonSchema;

    expect(isArrayOfStringEnum(schema.properties.tags, {rootSchema: schema})).toBe(true);
    expect(getBranchSchemas(schema.properties.choice, {rootSchema: schema})?.branches.map((branch) => branch.title)).toEqual([
      "Text",
      "Toggle",
    ]);
  });

  test("uses referenced object property ordering with local annotations", () => {
    const schema = {
      type: "object",
      properties: {
        profile: {
          $ref: "#/$defs/profile",
          title: "Local profile",
        },
      },
      $defs: {
        profile: {
          type: "object",
          title: "Base profile",
          propertyOrdering: ["last", "first"],
          properties: {
            first: {type: "string"},
            last: {type: "string"},
            email: {type: "string"},
          },
        },
      },
    } satisfies JsonSchema;

    expect(getOrderedPropertyKeys(schema.properties.profile, {rootSchema: schema})).toEqual(["last", "first", "email"]);
    expect(defaultValueForSchema(schema.properties.profile, {rootSchema: schema})).toEqual({});
  });
});
