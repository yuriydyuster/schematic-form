import {render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, test, vi} from "vitest";

import {SchematicForm} from "./SchematicForm";
import type {JsonSchema, SchematicFormState} from "./types";

function getSurface(container: HTMLElement, pointer: string) {
  const surface = container.querySelector(`.schematic-form__surface[data-sf-path="${pointer}"]`);
  expect(surface).toBeInTheDocument();
  return surface as HTMLElement;
}

const profileSchema = {
  type: "object",
  title: "Profile form",
  properties: {
    owner: {
      type: "object",
      title: "Owner",
      description: "Nested owner fields.",
      required: ["name"],
      properties: {
        name: {type: "string", title: "Owner name"},
        email: {type: "string", title: "Owner email", format: "email"},
      },
    },
  },
} satisfies JsonSchema;

const rowsSchema = {
  type: "object",
  title: "Rows form",
  properties: {
    milestones: {
      type: "array",
      title: "Milestones",
      items: {
        type: "object",
        title: "Milestone",
        properties: {
          name: {type: "string", title: "Name"},
        },
      },
    },
  },
} satisfies JsonSchema;

const branchSchema = {
  type: "object",
  title: "Branch form",
  properties: {
    delivery: {
      title: "Delivery",
      oneOf: [
        {
          title: "Pickup",
          type: "object",
          properties: {
            store: {type: "string", title: "Store"},
          },
        },
        {
          title: "Shipping",
          type: "object",
          properties: {
            address: {type: "string", title: "Address"},
          },
        },
      ],
    },
  },
} satisfies JsonSchema;

const summarySchema = {
  type: "object",
  title: "Summary form",
  properties: {
    section: {
      type: "object",
      title: "Section",
      description: "Summary section description.",
      required: ["kind"],
      properties: {
        kind: {type: "string", title: "Kind", enum: ["fixed"]},
        short: {type: "string", title: "Short label"},
        longValue: {type: "string", title: "Extremely long label title"},
        nested: {
          type: "object",
          title: "Nested group",
          properties: {
            deep: {type: "string", title: "Deepest label"},
          },
        },
        enabled: {type: "boolean", title: "Enabled"},
      },
    },
  },
} satisfies JsonSchema;

const overflowSummarySchema = {
  type: "object",
  title: "Overflow summary form",
  properties: {
    section: {
      type: "object",
      title: "Section",
      properties: Object.fromEntries(
        Array.from({length: 11}, (_, index) => [
          `field${index + 1}`,
          {type: "string", title: `Field ${index + 1}`},
        ]),
      ),
    },
  },
} satisfies JsonSchema;

describe("SchematicForm collapsible object surfaces", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("renders nested object surfaces with an expand and collapse toggle", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={profileSchema} />);

    const owner = getSurface(container, "/owner");
    const toggle = within(owner).getByRole("button", {name: "Collapse Owner"});

    expect(owner).toHaveClass("schematic-form__object-surface");
    expect(owner).not.toHaveAttribute("data-sf-collapsed");
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(toggle);

    expect(owner).toHaveAttribute("data-sf-collapsed", "true");
    expect(within(owner).getByRole("button", {name: "Expand Owner"})).toHaveAttribute("aria-expanded", "false");
    expect(within(owner).getByText("Nested owner fields.")).toBeVisible();

    await user.click(within(owner).getByRole("button", {name: "Expand Owner"}));

    expect(owner).not.toHaveAttribute("data-sf-collapsed");
    expect(within(owner).getByRole("button", {name: "Collapse Owner"})).toHaveAttribute("aria-expanded", "true");
  });

  test("collapsing a nested object surface preserves form data", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const {container} = render(
      <SchematicForm
        schema={profileSchema}
        defaultValue={{owner: {name: "Ada"}}}
        onStateChange={onStateChange}
      />,
    );

    await waitFor(() => {
      expect(onStateChange.mock.calls.at(-1)?.[0].data).toMatchObject({owner: {name: "Ada"}});
    });

    await user.click(within(getSurface(container, "/owner")).getByRole("button", {name: "Collapse Owner"}));

    expect(onStateChange.mock.calls.at(-1)?.[0].data).toMatchObject({owner: {name: "Ada"}});
  });

  test("invalid submit expands collapsed object ancestors before focusing invalid fields", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={profileSchema} defaultValue={{owner: {}}} />);

    const owner = getSurface(container, "/owner");
    await user.click(within(owner).getByRole("button", {name: "Collapse Owner"}));
    expect(owner).toHaveAttribute("data-sf-collapsed", "true");

    await user.click(screen.getByRole("button", {name: "Submit"}));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please review the highlighted fields.");
    await waitFor(() => expect(owner).not.toHaveAttribute("data-sf-collapsed"));
    expect(within(owner).getByRole("button", {name: "Collapse Owner"})).toHaveAttribute("aria-expanded", "true");
  });

  test("renders collapsible toggles for object rows inside arrays", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={rowsSchema} defaultValue={{milestones: [{name: "Kickoff"}]}} />);

    const row = getSurface(container, "/milestones/0");
    const toggle = within(row).getByRole("button", {name: "Collapse Milestone #1"});

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(row).getByLabelText("Name")).toBeInTheDocument();

    await user.click(toggle);

    expect(within(row).getByRole("button", {name: "Expand Milestone #1"})).toHaveAttribute("aria-expanded", "false");
    expect(within(row).getByLabelText("Name")).not.toBeVisible();
  });

  test("renders collapsible toggles for selected object branch variants", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={branchSchema} defaultValue={{delivery: {}}} />);

    const branch = getSurface(container, "/delivery");
    await user.click(within(branch).getByRole("button", {name: /select an option delivery/i}));
    await user.click(await screen.findByRole("option", {name: "Pickup"}));

    const toggle = within(branch).getByRole("button", {name: "Collapse Pickup"});
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(branch).getByLabelText("Store")).toBeInTheDocument();

    await user.click(toggle);

    expect(within(branch).getByRole("button", {name: "Expand Pickup"})).toHaveAttribute("aria-expanded", "false");
    expect(within(branch).getByLabelText("Store")).not.toBeVisible();
  });

  test("shows collapsed object values as primary default small chips", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm
        schema={summarySchema}
        defaultValue={{
          section: {
            short: "Alpha",
            longValue: "abcdefghijklmnopqrstuvwxyz",
            nested: {deep: "Nested value"},
            enabled: false,
          },
        }}
      />,
    );

    const section = getSurface(container, "/section");
    await user.click(within(section).getByRole("button", {name: "Collapse Section"}));

    const summary = section.querySelector(".schematic-form__object-summary");
    expect(summary).toBeInTheDocument();
    expect(within(section).getByText("Summary section description.")).toBeVisible();

    const chips = Array.from(section.querySelectorAll(".schematic-form__object-summary-chip"));
    expect(chips).toHaveLength(5);
    for (const chip of chips) {
      expect(chip).toHaveClass("chip--default", "chip--primary", "chip--sm");
    }
    expect(within(summary as HTMLElement).getByText("Alpha").tagName).toBe("STRONG");
    expect(summary).toHaveTextContent("Kind: fixed");
    expect(summary).toHaveTextContent("Short label: Alpha");
    expect(summary).toHaveTextContent("Extremely long label...: abcdefghijklmnopqrst...");
    expect(summary).toHaveTextContent("Deepest label: Nested value");
    expect(summary).toHaveTextContent("Enabled: Off");
  });

  test("limits collapsed object value chips to ten plus overflow marker", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm
        schema={overflowSummarySchema}
        defaultValue={{
          section: Object.fromEntries(Array.from({length: 11}, (_, index) => [`field${index + 1}`, `Value ${index + 1}`])),
        }}
      />,
    );

    const section = getSurface(container, "/section");
    await user.click(within(section).getByRole("button", {name: "Collapse Section"}));

    const chips = Array.from(section.querySelectorAll(".schematic-form__object-summary-chip"));
    expect(chips).toHaveLength(11);
    expect(chips.at(-1)).toHaveTextContent("...");
    expect(section.querySelector(".schematic-form__object-summary")).not.toHaveTextContent("Value 11");
  });

  test("persists collapsed and expanded object state across remounts", async () => {
    const user = userEvent.setup();

    const first = render(<SchematicForm schema={profileSchema} />);
    await user.click(within(getSurface(first.container, "/owner")).getByRole("button", {name: "Collapse Owner"}));
    await waitFor(() => expect(getSurface(first.container, "/owner")).toHaveAttribute("data-sf-collapsed", "true"));
    first.unmount();

    const second = render(<SchematicForm schema={profileSchema} />);
    expect(getSurface(second.container, "/owner")).toHaveAttribute("data-sf-collapsed", "true");

    await user.click(within(getSurface(second.container, "/owner")).getByRole("button", {name: "Expand Owner"}));
    await waitFor(() => expect(getSurface(second.container, "/owner")).not.toHaveAttribute("data-sf-collapsed"));
    second.unmount();

    const third = render(<SchematicForm schema={profileSchema} />);
    expect(getSurface(third.container, "/owner")).not.toHaveAttribute("data-sf-collapsed");
  });
});
