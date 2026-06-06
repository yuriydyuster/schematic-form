import {describe, expect, test} from "vitest";

import {
  JSON_SCHEMA_2020_12,
  ProtoSchemaConversionError,
  protoPropertyToJsonSchema,
  protoSchemaToJsonSchema,
  type ProtoSchemaObject,
} from "./protoSchema";

describe("proto schema converter", () => {
  test("converts root annotations and proto properties into classic JSON Schema", () => {
    const protoSchema = {
      $schema: JSON_SCHEMA_2020_12,
      title: "Customer profile",
      description: "Collect customer profile data.",
      type: "object",
      additionalProperties: false,
      properties: [
        {
          key: "email",
          required: true,
          propertyAnnotation: {
            type: "string",
            title: "Email",
            description: "Primary email address.",
            format: "email",
            minLength: 3,
            maxLength: 160,
          },
        },
        {
          key: "age",
          required: false,
          propertyAnnotation: {
            type: "integer",
            title: "Age",
            minimum: 18,
            maximum: 120,
          },
        },
      ],
    } satisfies ProtoSchemaObject;

    expect(protoSchemaToJsonSchema(protoSchema)).toEqual({
      $schema: JSON_SCHEMA_2020_12,
      title: "Customer profile",
      description: "Collect customer profile data.",
      type: "object",
      additionalProperties: false,
      propertyOrdering: ["email", "age"],
      required: ["email"],
      properties: {
        email: {
          type: "string",
          title: "Email",
          description: "Primary email address.",
          format: "email",
          minLength: 3,
          maxLength: 160,
        },
        age: {
          type: "integer",
          title: "Age",
          minimum: 18,
          maximum: 120,
        },
      },
    });
  });

  test("recursively converts object and array annotations", () => {
    const protoSchema = {
      $schema: JSON_SCHEMA_2020_12,
      type: "object",
      properties: [
        {
          key: "team",
          required: true,
          propertyAnnotation: {
            type: "object",
            title: "Team",
            additionalProperties: false,
            properties: [
              {
                key: "members",
                required: true,
                propertyAnnotation: {
                  type: "array",
                  title: "Members",
                  minItems: 1,
                  items: {
                    type: "object",
                    title: "Member",
                    properties: [
                      {
                        key: "name",
                        required: true,
                        propertyAnnotation: {
                          type: "string",
                          title: "Name",
                          enum: ["Ada", "Grace"],
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      ],
    } satisfies ProtoSchemaObject;

    expect(protoSchemaToJsonSchema(protoSchema)).toMatchObject({
      required: ["team"],
      properties: {
        team: {
          type: "object",
          title: "Team",
          additionalProperties: false,
          propertyOrdering: ["members"],
          required: ["members"],
          properties: {
            members: {
              type: "array",
              title: "Members",
              minItems: 1,
              items: {
                type: "object",
                title: "Member",
                propertyOrdering: ["name"],
                required: ["name"],
                properties: {
                  name: {
                    type: "string",
                    title: "Name",
                    enum: ["Ada", "Grace"],
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  test("omits empty required and ignores blank property keys", () => {
    const protoSchema = {
      $schema: JSON_SCHEMA_2020_12,
      type: "object",
      properties: [
        {
          key: " ",
          required: true,
          propertyAnnotation: {type: "string"},
        },
        {
          key: "nickname",
          required: false,
          propertyAnnotation: {type: "string"},
        },
      ],
    } satisfies ProtoSchemaObject;

    expect(protoSchemaToJsonSchema(protoSchema)).toEqual({
      $schema: JSON_SCHEMA_2020_12,
      type: "object",
      propertyOrdering: ["nickname"],
      properties: {
        nickname: {type: "string"},
      },
    });
  });

  test("rejects duplicate property keys", () => {
    const protoSchema = {
      $schema: JSON_SCHEMA_2020_12,
      type: "object",
      properties: [
        {key: "name", required: false, propertyAnnotation: {type: "string"}},
        {key: "name", required: true, propertyAnnotation: {type: "number"}},
      ],
    } satisfies ProtoSchemaObject;

    expect(() => protoSchemaToJsonSchema(protoSchema)).toThrow(ProtoSchemaConversionError);
    expect(() => protoSchemaToJsonSchema(protoSchema)).toThrow('Duplicate property key "name"');
  });

  test("converts an individual property annotation", () => {
    expect(
      protoPropertyToJsonSchema({
        key: "enabled",
        required: true,
        propertyAnnotation: {
          type: "boolean",
          title: "Enabled",
          default: true,
          enum: [true],
        },
      }),
    ).toEqual({
      type: "boolean",
      title: "Enabled",
      default: true,
      enum: [true],
    });
  });
});
