import {describe, expect, test} from "vitest";

import {
  defaultValueForSchema,
  getDefaultBranchIndex,
  getOrderedPropertyKeys,
  isArrayOfStringEnum,
  isDisplayOnlySchema,
  isShortUnformattedString,
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

  test("detects multiline default and enum string arrays", () => {
    expect(isShortUnformattedString({type: "string"})).toBe(true);
    expect(isShortUnformattedString({type: "string", maxLength: 255})).toBe(true);
    expect(isShortUnformattedString({type: "string", maxLength: 256})).toBe(false);
    expect(isShortUnformattedString({type: "string", format: "email"})).toBe(false);

    expect(
      isArrayOfStringEnum({
        type: "array",
        uniqueItems: true,
        items: {type: "string", enum: ["A", "B"]},
      }),
    ).toBe(true);
  });
});
