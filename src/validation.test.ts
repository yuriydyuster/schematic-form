import {describe, expect, test} from "vitest";

import {createSchemaValidator, sanitizeSchemaForValidation} from "./validation";
import type {JsonSchema} from "./types";

describe("validation", () => {
  test("sanitizes V1-only schema behavior before Ajv compilation", () => {
    const schema = {
      type: "object",
      required: ["display", "choice"],
      propertyOrdering: ["choice"],
      dependentRequired: {choice: ["other"]},
      properties: {
        display: {type: "null", title: "Display"},
        choice: {
          anyOf: [
            {type: "object", title: "A", properties: {a: {type: "string"}}},
            {type: "object", title: "B", properties: {b: {type: "string"}}},
          ],
        },
      },
    } as JsonSchema;

    expect(sanitizeSchemaForValidation(schema)).toEqual({
      type: "object",
      required: ["choice"],
      properties: {
        choice: {
          oneOf: [
            {type: "object", title: "A", properties: {a: {type: "string"}}},
            {type: "object", title: "B", properties: {b: {type: "string"}}},
          ],
        },
      },
    });
  });

  test("formats required errors at the missing property path", () => {
    const validator = createSchemaValidator({
      type: "object",
      required: ["email"],
      properties: {
        email: {type: "string", format: "email"},
      },
    });

    const result = validator.validate({});

    expect(result.isValid).toBe(false);
    expect(result.issues[0]).toMatchObject({
      path: "/email",
      fieldPath: "email",
      keyword: "required",
    });
    expect(result.errors[0]).toMatch(/email:/);
  });

  test("respects uniqueItems for enum string arrays", () => {
    const validator = createSchemaValidator({
      type: "object",
      properties: {
        tags: {
          type: "array",
          uniqueItems: true,
          items: {type: "string", enum: ["A", "B"]},
        },
      },
    });

    expect(validator.validate({tags: ["A", "A"]}).isValid).toBe(false);
    expect(validator.validate({tags: ["A", "B"]}).isValid).toBe(true);
  });

  test("accepts local and offset time format values", () => {
    const validator = createSchemaValidator({
      type: "object",
      properties: {
        startsAt: {type: "string", format: "time"},
      },
    });

    expect(validator.validate({startsAt: "09:30"}).isValid).toBe(true);
    expect(validator.validate({startsAt: "09:30:00"}).isValid).toBe(true);
    expect(validator.validate({startsAt: "09:30:00Z"}).isValid).toBe(true);
    expect(validator.validate({startsAt: "24:30:00"}).isValid).toBe(false);
  });
});
