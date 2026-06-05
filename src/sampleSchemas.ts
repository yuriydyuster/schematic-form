import type {JsonSchema} from "./types";

export const kitchenSinkSchemaOld = {
  type: "object",
  title: "Project Intake",
  description: "Descriptions render above fields and every level is wrapped in a transparent surface.",
  required: ["projectName", "priority", "budget", "payment"],
  propertyOrdering: [
    "intro",
    "projectName",
    "summary",
    "contactEmail",
    "referenceUrl",
    "requiresReview",
    "priority",
    "confidence",
    "audience",
    "status",
    "channels",
    "keywords",
    "labels",
    "tools",
    "reviewTags",
    "budget",
    "launchDate",
    "launchTime",
    "approvalDeadline",
    "owner",
    "payment",
    "fulfillment",
    "mixedItems",
    "untitledMixedItems",
    "milestones",
  ],
  properties: {
    intro: {
      type: "null",
      title: "Scope",
      description: "This block is display-only and will not be present in data.",
    },
    projectName: {
      type: "string",
      title: "Project name",
      description: "Short unformatted strings render as single-line inputs by default.",
      minLength: 2,
      maxLength: 120,
    },
    summary: {
      type: "string",
      title: "Project summary",
      description: "Long unformatted strings render as multiline text areas.",
      maxLength: 512,
    },
    contactEmail: {
      type: "string",
      title: "Contact email",
      description: "Email format strings render as email inputs.",
      format: "email",
    },
    referenceUrl: {
      type: "string",
      title: "Reference URL",
      description: "URI format strings render as URL inputs.",
      format: "uri",
    },
    requiresReview: {
      type: "boolean",
      title: "Requires review",
      description: "Boolean fields render with HeroUI switch controls.",
    },
    priority: {
      type: "integer",
      title: "Priority",
      description: "Integer values with minimum and maximum render as a horizontal slider.",
      minimum: 1,
      maximum: 5,
    },
    confidence: {
      type: "integer",
      title: "Confidence",
      description: "Optional integer sliders include an unset position before the minimum and omit that field from data.",
      minimum: 1,
      maximum: 5,
    },
    audience: {
      type: "string",
      title: "Audience",
      description: "Fewer than six enum options render as radio buttons.",
      enum: ["Internal", "Customer", "Partner"],
    },
    status: {
      type: "string",
      title: "Status",
      description: "Six enum options render as a dropdown.",
      enum: ["Draft", "Review", "Approved", "Blocked", "Archived", "Paused"],
    },
    channels: {
      type: "array",
      title: "Channels",
      description: "Six or more enum string options render as a multiselect dropdown.",
      uniqueItems: true,
      items: {
        type: "string",
        title: "Channel",
        description: "A delivery channel for the project.",
        enum: ["Email", "Web", "Mobile", "Retail", "Partner", "Events"],
      },
    },
    keywords: {
      type: "array",
      title: "Keywords",
      description: "Arrays of strings without enum render as repeatable text rows.",
      items: {
        type: "string",
        title: "Keyword",
        description: "A free-form keyword for classifying the project.",
        maxLength: 80,
      },
    },
    labels: {
      type: "array",
      title: "Labels",
      description: "Enum string arrays without uniqueItems render as repeatable select rows.",
      items: {
        type: "string",
        title: "Label",
        description: "A reusable label for grouping project work.",
        enum: ["Discovery", "Delivery", "Launch"],
      },
    },
    tools: {
      type: "array",
      title: "Tools",
      description: "Fewer than six enum string options render as a checkbox group.",
      uniqueItems: true,
      items: {
        type: "string",
        title: "Tool",
        description: "A tool used by the project team.",
        enum: ["Figma", "GitHub", "Vercel"],
      },
    },
    reviewTags: {
      type: "array",
      title: "Review tags",
      description: "Unique enum string arrays keep one instance of each selected string.",
      uniqueItems: true,
      items: {
        type: "string",
        title: "Review tag",
        description: "A unique review tag for filtering project feedback.",
        enum: ["Accessibility", "Performance", "Security", "Design", "Content", "Compliance"],
      },
    },
    budget: {
      type: "number",
      title: "Budget",
      description: "Number fields without both minimum and maximum render as HeroUI number fields.",
      minimum: 0,
    },
    launchDate: {
      type: "string",
      title: "Launch date",
      description: "Date strings render with HeroUI DatePicker.",
      format: "date",
    },
    launchTime: {
      type: "string",
      title: "Launch time",
      description: "Time strings render with HeroUI TimeField.",
      format: "time",
    },
    approvalDeadline: {
      type: "string",
      title: "Approval deadline",
      description: "Date-time strings render with HeroUI DatePicker minute granularity.",
      format: "date-time",
    },
    owner: {
      type: "object",
      title: "Owner",
      description: "Nested objects render inside their own transparent surface.",
      required: ["name"],
      propertyOrdering: ["name", "email", "website", "notes"],
      properties: {
        name: {
          type: "string",
          title: "Owner name",
          description: "Nested short strings render as full-width single-line inputs.",
          maxLength: 120,
        },
        email: {
          type: "string",
          title: "Owner email",
          description: "Nested email fields use the same formatted string layout.",
          format: "email",
        },
        website: {
          type: "string",
          title: "Owner website",
          description: "Nested URI fields use the same formatted string layout.",
          format: "uri",
        },
        notes: {
          type: "string",
          title: "Owner notes",
          description: "Empty strings are preserved only when minLength is explicitly zero.",
          minLength: 0,
          maxLength: 512,
        },
      },
    },
    payment: {
      title: "Payment method",
      description: "Branching uses a dropdown and anyOf is intentionally treated as oneOf in Beta.",
      anyOf: [
        {
          type: "object",
          title: "Card",
          description: "Collect card payment details for this project.",
          required: ["cardNumber"],
          properties: {
            cardNumber: {
              type: "string",
              title: "Card number",
              description: "Card number is required when the card payment branch is selected.",
              maxLength: 19,
            },
          },
        },
        {
          type: "object",
          title: "Bank transfer",
          description: "Collect bank transfer details for this project.",
          required: ["iban"],
          properties: {
            iban: {
              type: "string",
              title: "IBAN",
              description: "IBAN is required when the bank transfer branch is selected.",
              maxLength: 34,
            },
          },
        },
      ],
    },
    fulfillment: {
      title: "Fulfillment path",
      description: "oneOf branches use the same dropdown selector layout as anyOf.",
      oneOf: [
        {
          type: "object",
          title: "Self serve",
          description: "Collect details for a self-serve fulfillment path.",
          required: ["portal"],
          properties: {
            portal: {
              type: "string",
              title: "Portal URL",
              description: "URI format strings render as URL inputs inside branch variants.",
              format: "uri",
            },
          },
        },
        {
          type: "object",
          title: "Assisted",
          description: "Collect details for an assisted fulfillment path.",
          required: ["manager"],
          properties: {
            manager: {
              type: "string",
              title: "Manager",
              description: "Short strings render as single-line inputs inside branch variants.",
              maxLength: 120,
            },
          },
        },
      ],
    },
    mixedItems: {
      type: "array",
      title: "Mixed items",
      description: "Array items can choose between object, enum string, null, and boolean oneOf variants.",
      maxItems: 4,
      items: {
        title: "Mixed item",
        description: "Each item selects one of four different schema shapes.",
        default: {label: ""},
        oneOf: [
          {
            type: "object",
            title: "Object",
            description: "Collects a labeled note for this item.",
            required: ["label"],
            properties: {
              label: {
                type: "string",
                title: "Label",
                description: "Short label for the object item.",
                maxLength: 80,
              },
              note: {
                type: "string",
                title: "Note",
                description: "Optional note for the object item.",
                maxLength: 160,
              },
            },
          },
          {
            type: "string",
            title: "Enum string",
            description: "Choose a named string value.",
            enum: ["Alpha", "Beta", "Gamma"],
          },
          {
            type: "null",
            title: "Null",
            description: "Represents an intentionally empty item.",
          },
          {
            type: "boolean",
            title: "Boolean",
            description: "Toggle a true or false item value.",
          },
        ],
      },
    },
    untitledMixedItems: {
      type: "array",
      maxItems: 3,
      items: {
        oneOf: [
          {
            type: "object",
            required: ["name"],
            properties: {
              name: {
                type: "string",
                maxLength: 80,
              },
              active: {
                type: "boolean",
              },
            },
          },
          {
            type: "string",
            enum: ["Red", "Green", "Blue"],
          },
          {
            type: "boolean",
          },
        ],
      },
    },
    milestones: {
      type: "array",
      title: "Milestones",
      description: "Array fields render item controls and an add button until maxItems is reached.",
      maxItems: 3,
      items: {
        type: "object",
        title: "Milestone",
        description: "Each milestone is wrapped as a nested object level.",
        required: ["name"],
        properties: {
          name: {
            type: "string",
            title: "Name",
            description: "Short milestone names render as single-line inputs by default.",
            maxLength: 80,
          },
          due: {
            type: "string",
            title: "Due date",
            description: "Optional milestone due dates render with HeroUI DatePicker.",
            format: "date",
          },
        },
      },
    },
  },
} satisfies JsonSchema;

export const primitiveSchema = {
  type: "object",
  title: "Primitive fields",
  description: "A smaller schema showing primitive field rendering.",
  required: ["name", "email"],
  properties: {
    name: {
      type: "string",
      title: "Name",
      description: "Required short string rendered as a single-line text field.",
      minLength: 2,
    },
    email: {
      type: "string",
      title: "Email",
      description: "Email strings render as HeroUI text fields with email input semantics.",
      format: "email",
    },
    age: {
      type: "integer",
      title: "Age",
      description: "Integer values with minimum and maximum render as a horizontal slider.",
      minimum: 18,
      maximum: 80,
    },
    newsletter: {
      type: "boolean",
      title: "Subscribe to newsletter",
      description: "Boolean fields render with HeroUI switch controls.",
    },
  },
} satisfies JsonSchema;

export const kitchenSinkSchema = {
  "title": "Form Meta Schema",
  "description": "A meta schema for describing a form as an array of recursive field definitions.",
  "type": ["object"],
  "default": {},
  "properties": {
    "form": {
      "type": ["array"],
      "title": "Form",
      "description": "Array of field definitions used to build the form.",
      "items": {
        "$ref": "#/$defs/field"
      }
    }
  },
  "required": ["form"],
  "additionalProperties": false,
  "$defs": {
    "field": {
      "title": "Field",
      "description": "A recursive field definition represented by one of the supported JSON Schema-like field types.",
      "type": ["object"],
      "default": {},
      "oneOf": [
        {
          "title": "String Field",
          "description": "A field that describes a string value.",
          "type": ["object"],
          "default": {},
          "properties": {
            "key": {
              "type": ["string"],
              "title": "Key",
              "description": "Unique field key.",
              "default": ""
            },
            "type": {
              "type": ["string"],
              "title": "Type",
              "description": "Field value type.",
              "default": "string",
              "enum": ["string"]
            },
            "title": {
              "type": ["string"],
              "title": "Title",
              "description": "Human-readable field title.",
              "default": ""
            },
            "description": {
              "type": ["string"],
              "title": "Description",
              "description": "Human-readable field description.",
              "default": ""
            },
            "default": {
              "type": ["string"],
              "title": "Default",
              "description": "Default string value.",
              "default": ""
            },
            "required": {
              "type": ["boolean"],
              "title": "Required",
              "description": "Whether this field is required.",
              "default": false
            },
            "minLength": {
              "type": ["integer"],
              "title": "Minimum Length",
              "description": "Minimum allowed string length.",
              "default": 0,
              "minimum": 0
            },
            "maxLength": {
              "type": ["integer"],
              "title": "Maximum Length",
              "description": "Maximum allowed string length.",
              "default": 255,
              "minimum": 0
            },
            "enum": {
              "type": ["array"],
              "title": "Enum",
              "description": "Allowed string values.",
              "items": {
                "type": ["string"],
                "title": "Enum Value",
                "description": "Single allowed string value.",
                "default": ""
              }
            },
            "format": {
              "type": ["string"],
              "title": "Format",
              "description": "String format hint, such as email, uri, date, or date-time.",
              "default": ""
            },
            "pattern": {
              "type": ["string"],
              "title": "Pattern",
              "description": "Regular expression pattern for validating the string.",
              "default": ""
            }
          },
          "required": ["key", "type", "title", "description", "default", "required"],
          "additionalProperties": false
        },
        {
          "title": "Number Field",
          "description": "A field that describes a number value.",
          "type": ["object"],
          "default": {},
          "properties": {
            "key": {
              "type": ["string"],
              "title": "Key",
              "description": "Unique field key.",
              "default": ""
            },
            "type": {
              "type": ["string"],
              "title": "Type",
              "description": "Field value type.",
              "default": "number",
              "enum": ["number"]
            },
            "title": {
              "type": ["string"],
              "title": "Title",
              "description": "Human-readable field title.",
              "default": ""
            },
            "description": {
              "type": ["string"],
              "title": "Description",
              "description": "Human-readable field description.",
              "default": ""
            },
            "default": {
              "type": ["number"],
              "title": "Default",
              "description": "Default number value.",
              "default": 0
            },
            "required": {
              "type": ["boolean"],
              "title": "Required",
              "description": "Whether this field is required.",
              "default": false
            },
            "minimum": {
              "type": ["number"],
              "title": "Minimum",
              "description": "Minimum allowed number.",
              "default": 0
            },
            "maximum": {
              "type": ["number"],
              "title": "Maximum",
              "description": "Maximum allowed number.",
              "default": 100
            },
            "multipleOf": {
              "type": ["number"],
              "title": "Multiple Of",
              "description": "The number must be a multiple of this value.",
              "default": 1,
              "minimum": 0
            },
            "enum": {
              "type": ["array"],
              "title": "Enum",
              "description": "Allowed number values.",
              "items": {
                "type": ["number"],
                "title": "Enum Value",
                "description": "Single allowed number value.",
                "default": 0
              }
            }
          },
          "required": ["key", "type", "title", "description", "default", "required"],
          "additionalProperties": false
        },
        {
          "title": "Integer Field",
          "description": "A field that describes an integer value.",
          "type": ["object"],
          "default": {},
          "properties": {
            "key": {
              "type": ["string"],
              "title": "Key",
              "description": "Unique field key.",
              "default": ""
            },
            "type": {
              "type": ["string"],
              "title": "Type",
              "description": "Field value type.",
              "default": "integer",
              "enum": ["integer"]
            },
            "title": {
              "type": ["string"],
              "title": "Title",
              "description": "Human-readable field title.",
              "default": ""
            },
            "description": {
              "type": ["string"],
              "title": "Description",
              "description": "Human-readable field description.",
              "default": ""
            },
            "default": {
              "type": ["integer"],
              "title": "Default",
              "description": "Default integer value.",
              "default": 0
            },
            "required": {
              "type": ["boolean"],
              "title": "Required",
              "description": "Whether this field is required.",
              "default": false
            },
            "minimum": {
              "type": ["integer"],
              "title": "Minimum",
              "description": "Minimum allowed integer.",
              "default": 0
            },
            "maximum": {
              "type": ["integer"],
              "title": "Maximum",
              "description": "Maximum allowed integer.",
              "default": 100
            },
            "multipleOf": {
              "type": ["integer"],
              "title": "Multiple Of",
              "description": "The integer must be a multiple of this value.",
              "default": 1,
              "minimum": 1
            },
            "enum": {
              "type": ["array"],
              "title": "Enum",
              "description": "Allowed integer values.",
              "items": {
                "type": ["integer"],
                "title": "Enum Value",
                "description": "Single allowed integer value.",
                "default": 0
              }
            }
          },
          "required": ["key", "type", "title", "description", "default", "required"],
          "additionalProperties": false
        },
        {
          "title": "Boolean Field",
          "description": "A field that describes a boolean value.",
          "type": ["object"],
          "default": {},
          "properties": {
            "key": {
              "type": ["string"],
              "title": "Key",
              "description": "Unique field key.",
              "default": ""
            },
            "type": {
              "type": ["string"],
              "title": "Type",
              "description": "Field value type.",
              "default": "boolean",
              "enum": ["boolean"]
            },
            "title": {
              "type": ["string"],
              "title": "Title",
              "description": "Human-readable field title.",
              "default": ""
            },
            "description": {
              "type": ["string"],
              "title": "Description",
              "description": "Human-readable field description.",
              "default": ""
            },
            "default": {
              "type": ["boolean"],
              "title": "Default",
              "description": "Default boolean value.",
              "default": false
            },
            "required": {
              "type": ["boolean"],
              "title": "Required",
              "description": "Whether this field is required.",
              "default": false
            },
            "enum": {
              "type": ["array"],
              "title": "Enum",
              "description": "Allowed boolean values.",
              "items": {
                "type": ["boolean"],
                "title": "Enum Value",
                "description": "Single allowed boolean value.",
                "default": false
              }
            }
          },
          "required": ["key", "type", "title", "description", "default", "required"],
          "additionalProperties": false
        },
        {
          "title": "Null Field",
          "description": "A field that describes a null value.",
          "type": ["object"],
          "default": {},
          "properties": {
            "key": {
              "type": ["string"],
              "title": "Key",
              "description": "Unique field key.",
              "default": ""
            },
            "type": {
              "type": ["string"],
              "title": "Type",
              "description": "Field value type.",
              "default": "null",
              "enum": ["null"]
            },
            "title": {
              "type": ["string"],
              "title": "Title",
              "description": "Human-readable field title.",
              "default": ""
            },
            "description": {
              "type": ["string"],
              "title": "Description",
              "description": "Human-readable field description.",
              "default": ""
            },
            "default": {
              "type": ["null"],
              "title": "Default",
              "description": "Default null value.",
              "default": null
            },
            "required": {
              "type": ["boolean"],
              "title": "Required",
              "description": "Whether this field is required.",
              "default": false
            },
            "enum": {
              "type": ["array"],
              "title": "Enum",
              "description": "Allowed null values.",
              "items": {
                "type": ["null"],
                "title": "Enum Value",
                "description": "Single allowed null value.",
                "default": null
              }
            }
          },
          "required": ["key", "type", "title", "description", "default", "required"],
          "additionalProperties": false
        },
        {
          "title": "Array Field",
          "description": "A field that describes an array value.",
          "type": ["object"],
          "default": {},
          "properties": {
            "key": {
              "type": ["string"],
              "title": "Key",
              "description": "Unique field key.",
              "default": ""
            },
            "type": {
              "type": ["string"],
              "title": "Type",
              "description": "Field value type.",
              "default": "array",
              "enum": ["array"]
            },
            "title": {
              "type": ["string"],
              "title": "Title",
              "description": "Human-readable field title.",
              "default": ""
            },
            "description": {
              "type": ["string"],
              "title": "Description",
              "description": "Human-readable field description.",
              "default": ""
            },
            "required": {
              "type": ["boolean"],
              "title": "Required",
              "description": "Whether this field is required.",
              "default": false
            },
            "items": {
              "$ref": "#/$defs/field",
              "title": "Items",
              "description": "Recursive field definition for array items.",
              "default": {
                "key": "",
                "type": "string",
                "title": "",
                "description": "",
                "default": "",
                "required": false
              }
            },
            "minItems": {
              "type": ["integer"],
              "title": "Minimum Items",
              "description": "Minimum number of array items.",
              "default": 0,
              "minimum": 0
            },
            "maxItems": {
              "type": ["integer"],
              "title": "Maximum Items",
              "description": "Maximum number of array items.",
              "default": 10,
              "minimum": 0
            },
            "uniqueItems": {
              "type": ["boolean"],
              "title": "Unique Items",
              "description": "Whether array items must be unique.",
              "default": false
            }
          },
          "required": ["key", "type", "title", "description", "required", "items"],
          "additionalProperties": false
        },
        {
          "title": "Object Field",
          "description": "A field that describes an object value.",
          "type": ["object"],
          "default": {},
          "properties": {
            "key": {
              "type": ["string"],
              "title": "Key",
              "description": "Unique field key.",
              "default": ""
            },
            "type": {
              "type": ["string"],
              "title": "Type",
              "description": "Field value type.",
              "default": "object",
              "enum": ["object"]
            },
            "title": {
              "type": ["string"],
              "title": "Title",
              "description": "Human-readable field title.",
              "default": ""
            },
            "description": {
              "type": ["string"],
              "title": "Description",
              "description": "Human-readable field description.",
              "default": ""
            },
            "default": {
              "type": ["object"],
              "title": "Default",
              "description": "Default object value.",
              "default": {},
              "properties": {}
            },
            "required": {
              "type": ["boolean"],
              "title": "Required",
              "description": "Whether this field is required.",
              "default": false
            },
            "properties": {
              "type": ["array"],
              "title": "Properties",
              "description": "Recursive child field definitions.",
              "items": {
                "$ref": "#/$defs/field",
                "title": "Property Field",
                "description": "Recursive field definition for an object property.",
                "default": {
                  "key": "",
                  "type": "string",
                  "title": "",
                  "description": "",
                  "default": "",
                  "required": false
                }
              }
            },
            "additionalProperties": {
              "type": ["boolean"],
              "title": "Additional Properties",
              "description": "Whether additional object properties are allowed.",
              "default": false
            }
          },
          "required": ["key", "type", "title", "description", "default", "required", "properties"],
          "additionalProperties": false
        }
      ]
    }
  }
} satisfies JsonSchema;
