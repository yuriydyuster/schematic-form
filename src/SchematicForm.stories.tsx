import type {Meta, StoryObj} from "@storybook/react-vite";

import {SchematicForm} from "./SchematicForm";
import {kitchenSinkSchema, primitiveSchema} from "./sampleSchemas";
import type {JsonSchema} from "./types";

const meta = {
  title: "SchematicForm/SchematicForm",
  component: SchematicForm,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof SchematicForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PrimitiveFields: Story = {
  args: {
    schema: primitiveSchema,
  },
};

export const KitchenSink: Story = {
  args: {
    schema: kitchenSinkSchema,
  },
};

export const OneOfBranchSelector: Story = {
  args: {
    schema: {
      type: "object",
      title: "Branching",
      properties: {
        delivery: {
          title: "Delivery type",
          oneOf: [
            {
              type: "object",
              title: "Pickup",
              properties: {
                store: {type: "string", title: "Store", maxLength: 120},
              },
            },
            {
              type: "object",
              title: "Shipping",
              properties: {
                address: {type: "string", title: "Address", maxLength: 180},
              },
            },
          ],
        },
      },
    } satisfies JsonSchema,
  },
};

export const NullDisplayBlock: Story = {
  args: {
    schema: {
      type: "object",
      title: "Display block",
      properties: {
        info: {
          type: "null",
          title: "Section title",
          description: "This is not stored in form data.",
        },
        name: {type: "string", title: "Name"},
      },
    } satisfies JsonSchema,
  },
};
