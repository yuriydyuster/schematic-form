import type {JsonSchema} from "./types";

export const kitchenSinkSchema = {
  type: "object",
  title: "Project Intake",
  description: "Descriptions render above fields and every level is wrapped in a transparent surface.",
  required: ["projectName", "priority", "budget", "payment"],
  propertyOrdering: [
    "intro",
    "projectName",
    "priority",
    "status",
    "channels",
    "tools",
    "budget",
    "launchDate",
    "launchTime",
    "approvalDeadline",
    "payment",
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
      description: "Unformatted short strings render as multiline fields by default.",
      minLength: 2,
      maxLength: 120,
    },
    priority: {
      type: "integer",
      title: "Priority",
      description: "Integer values with minimum and maximum render as a horizontal slider.",
      minimum: 1,
      maximum: 5,
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
    payment: {
      title: "Payment method",
      description: "Branching uses a dropdown and anyOf is intentionally treated as oneOf in V1.",
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
            description: "Short milestone names render as multiline fields by default.",
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
      description: "Required short string rendered as a multiline text field.",
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
      description: "Boolean fields render with HeroUI checkbox controls.",
    },
  },
} satisfies JsonSchema;
