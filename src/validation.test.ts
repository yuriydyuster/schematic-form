import {describe, expect, test} from "vitest";

import {createSchemaValidator, sanitizeSchemaForValidation} from "./validation";
import type {JsonSchema} from "./types";

describe("validation", () => {
  test("sanitizes Beta-only schema behavior before Ajv compilation", () => {
    const schema = {
      type: "object",
      required: ["display", "choice"],
      propertyOrdering: ["choice"],
      dependentRequired: {choice: ["other"]},
      unevaluatedProperties: false,
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

  test("converts tuple array items for draft 2020-12 validation", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        rows: {
          type: "array",
          items: [
            {type: "object", required: ["name"], properties: {name: {type: "string"}}},
          ],
          additionalItems: {type: "string"},
        },
      },
    } satisfies JsonSchema;

    expect(sanitizeSchemaForValidation(schema)).toMatchObject({
      properties: {
        rows: {
          prefixItems: [
            {type: "object", required: ["name"], properties: {name: {type: "string"}}},
          ],
          items: {type: "string"},
        },
      },
    });

    const validator = createSchemaValidator(schema);

    expect(validator.validate({rows: [{name: "Ada"}, "extra"]}).isValid).toBe(true);
    const result = validator.validate({rows: [{}]});
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toMatch(/rows\.0\.name:/);
    expect(result.errors[0]).not.toMatch(/Schema could not be compiled/);
  });

  test("omits branch subschema noise when oneOf itself fails", () => {
    const validator = createSchemaValidator({
      type: "object",
      properties: {
        choice: {
          type: "object",
          oneOf: [
            {type: "object", required: ["name"], properties: {name: {type: "string"}}},
            {type: "object", required: ["enabled"], properties: {enabled: {type: "boolean"}}},
          ],
        },
      },
    });

    const result = validator.validate({choice: ""});

    expect(result.isValid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      path: "/choice",
      fieldPath: "choice",
      keyword: "oneOf",
    });
    expect(result.errors[0]).toMatch("choice: must match exactly one schema in oneOf");
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

  test("validates hostname, ipv4, ipv6, and uuid formats", () => {
    const validator = createSchemaValidator({
      type: "object",
      properties: {
        host: {type: "string", format: "hostname"},
        ipV4: {type: "string", format: "ipv4"},
        ipV6: {type: "string", format: "ipv6"},
        requestId: {type: "string", format: "uuid"},
      },
    });

    expect(
      validator.validate({
        host: "example.com",
        ipV4: "192.168.0.1",
        ipV6: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
        requestId: "550e8400-e29b-41d4-a716-446655440000",
      }).isValid,
    ).toBe(true);
    expect(
      validator.validate({
        host: "invalid host",
        ipV4: "256.10.10.10",
        ipV6: "2001::85a3::8a2e:0370:7334",
        requestId: "not-a-uuid",
      }).isValid,
    ).toBe(false);
  });

  test("validates string patterns", () => {
    const validator = createSchemaValidator({
      type: "object",
      properties: {
        key: {type: "string", pattern: "^[a-z][A-Za-z0-9_]*$"},
      },
    });

    expect(validator.validate({key: "fullName_2"}).isValid).toBe(true);
    const result = validator.validate({key: "Full Name"});
    expect(result.isValid).toBe(false);
    expect(result.issues[0]).toMatchObject({
      path: "/key",
      fieldPath: "key",
      keyword: "pattern",
    });
    expect(result.errors[0]).toMatch(/key:.*must match pattern/i);
  });

  test("retains newly supported formats and strips unsupported formats during sanitization", () => {
    const schema = {
      type: "object",
      properties: {
        host: {type: "string", format: "hostname"},
        ipV4: {type: "string", format: "ipv4"},
        ipV6: {type: "string", format: "ipv6"},
        requestId: {type: "string", format: "uuid"},
        unknown: {type: "string", format: "iri"},
      },
    } satisfies JsonSchema;

    expect(sanitizeSchemaForValidation(schema)).toEqual({
      type: "object",
      properties: {
        host: {type: "string", format: "hostname"},
        ipV4: {type: "string", format: "ipv4"},
        ipV6: {type: "string", format: "ipv6"},
        requestId: {type: "string", format: "uuid"},
        unknown: {type: "string"},
      },
    });
  });

  test("sanitizes reusable $defs without expanding local refs", () => {
    const schema = {
      type: "object",
      properties: {
        item: {$ref: "#/$defs/item"},
      },
      $defs: {
        item: {
          type: "object",
          required: ["display", "choice"],
          properties: {
            display: {type: "null", title: "Display"},
            choice: {
              anyOf: [
                {type: "string", title: "Text"},
                {type: "boolean", title: "Toggle"},
              ],
            },
          },
        },
      },
    } satisfies JsonSchema;

    expect(sanitizeSchemaForValidation(schema)).toEqual({
      type: "object",
      properties: {
        item: {$ref: "#/$defs/item"},
      },
      $defs: {
        item: {
          type: "object",
          required: ["choice"],
          properties: {
            choice: {
              oneOf: [
                {type: "string", title: "Text"},
                {type: "boolean", title: "Toggle"},
              ],
            },
          },
        },
      },
    });
  });

  test("validates local $defs refs", () => {
    const validator = createSchemaValidator({
      type: "object",
      properties: {
        person: {$ref: "#/$defs/person"},
      },
      $defs: {
        person: {
          type: "object",
          required: ["name"],
          properties: {
            name: {type: "string", minLength: 1},
          },
        },
      },
    });

    expect(validator.validate({person: {name: "Ada"}}).isValid).toBe(true);
    const result = validator.validate({person: {}});
    expect(result.isValid).toBe(false);
    expect(result.issues[0]).toMatchObject({
      path: "/person/name",
      fieldPath: "person.name",
      keyword: "required",
    });
  });

  test("compiles recursive local refs for bounded data", () => {
    const validator = createSchemaValidator({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $ref: "#/$defs/node",
      $defs: {
        node: {
          type: "object",
          required: ["name"],
          properties: {
            name: {type: "string"},
            children: {
              type: "array",
              items: {$ref: "#/$defs/node"},
            },
          },
        },
      },
    });

    expect(validator.validate({name: "Root", children: [{name: "Child"}]}).isValid).toBe(true);
    expect(validator.validate({name: "Root", children: [{}]}).isValid).toBe(false);
  });
});
