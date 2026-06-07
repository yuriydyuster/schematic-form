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
            pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
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
          pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
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

  test("converts a oneOf annotation and omits the proto discriminator type", () => {
    const protoSchema = {
      $schema: JSON_SCHEMA_2020_12,
      type: "object",
      properties: [
        {
          key: "preferredContact",
          required: false,
          propertyAnnotation: {
            type: "oneOf",
            title: "Preferred contact method",
            description: "Choose one contact mode.",
            oneOf: [
              {
                type: "string",
                title: "Email address",
                format: "email",
              },
              {
                type: "string",
                title: "Website URL",
                format: "uri",
              },
            ],
          },
        },
      ],
    } satisfies ProtoSchemaObject;

    const converted = protoSchemaToJsonSchema(protoSchema);
    const preferredContact = (converted.properties as Record<string, unknown>).preferredContact as Record<string, unknown>;

    expect(preferredContact).toEqual({
      title: "Preferred contact method",
      description: "Choose one contact mode.",
      oneOf: [
        {
          type: "string",
          title: "Email address",
          format: "email",
        },
        {
          type: "string",
          title: "Website URL",
          format: "uri",
        },
      ],
    });
    expect(preferredContact.type).toBeUndefined();
  });

  test("rejects oneOf annotations without branches", () => {
    expect(() =>
      protoPropertyToJsonSchema({
        key: "preferredContact",
        required: false,
        propertyAnnotation: {
          type: "oneOf",
          title: "Preferred contact method",
          oneOf: [],
        },
      }),
    ).toThrow(ProtoSchemaConversionError);
    expect(() =>
      protoPropertyToJsonSchema({
        key: "preferredContact",
        required: false,
        propertyAnnotation: {
          type: "oneOf",
          title: "Preferred contact method",
          oneOf: [],
        },
      }),
    ).toThrow('oneOf property "preferredContact" must define at least one branch.');
  });

  test("converts nested oneOf annotations without mutating the proto input", () => {
    const protoSchema = {
      $schema: JSON_SCHEMA_2020_12,
      type: "object",
      properties: [
        {
          key: "settings",
          required: true,
          propertyAnnotation: {
            type: "object",
            properties: [
              {
                key: "channel",
                required: true,
                propertyAnnotation: {
                  type: "oneOf",
                  oneOf: [
                    {type: "string", title: "Email", format: "email"},
                    {
                      type: "object",
                      title: "Webhook",
                      properties: [
                        {
                          key: "url",
                          required: true,
                          propertyAnnotation: {type: "string", format: "uri"},
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    } satisfies ProtoSchemaObject;
    const snapshot = structuredClone(protoSchema);

    expect(protoSchemaToJsonSchema(protoSchema)).toMatchObject({
      required: ["settings"],
      properties: {
        settings: {
          type: "object",
          required: ["channel"],
          properties: {
            channel: {
              oneOf: [
                {type: "string", title: "Email", format: "email"},
                {
                  type: "object",
                  title: "Webhook",
                  required: ["url"],
                  properties: {
                    url: {type: "string", format: "uri"},
                  },
                },
              ],
            },
          },
        },
      },
    });
    expect(protoSchema).toEqual(snapshot);
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
