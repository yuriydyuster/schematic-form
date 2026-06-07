import {render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, test, vi} from "vitest";

import {SchematicForm} from "./SchematicForm";
import {kitchenSinkSchema, kitchenSinkSchemaInitialValue} from "./sampleSchemas";
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

const scalarArraySummarySchema = {
  type: "object",
  title: "Scalar array summary form",
  properties: {
    section: {
      type: "object",
      title: "Section",
      properties: {
        aliases: {
          type: "array",
          title: "Aliases",
          items: {type: "string", title: "Alias"},
        },
      },
    },
  },
} satisfies JsonSchema;

const implicitSummaryLabelSchema = {
  type: "object",
  title: "Implicit summary label form",
  properties: {
    section: {
      type: "object",
      title: "Section",
      properties: {
        untitled: {type: "string"},
      },
    },
  },
} satisfies JsonSchema;

const chipFocusSafetySchema = {
  type: "object",
  title: "Chip focus safety form",
  properties: {
    section: {
      type: "object",
      title: "Section",
      properties: {
        note: {type: "string", title: "Note"},
        count: {type: "integer", title: "Count"},
        enabled: {type: "boolean", title: "Enabled"},
        status: {type: "string", title: "Status", enum: ["A", "B", "C", "D", "E", "F"]},
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

const overflowValidationSchema = {
  type: "object",
  title: "Overflow validation form",
  properties: {
    section: {
      type: "object",
      title: "Section",
      properties: Object.fromEntries(
        Array.from({length: 12}, (_, index) => [
          `field${index + 1}`,
          {type: "string", title: `Field ${index + 1}`, format: "email"},
        ]),
      ),
    },
  },
} satisfies JsonSchema;

const recursiveOverflowSchema = {
  type: "object",
  title: "Recursive overflow form",
  properties: {
    tree: {
      $ref: "#/$defs/node",
      title: "Tree",
    },
  },
  $defs: {
    node: {
      type: "object",
      title: "Node",
      properties: {
        email: {type: "string", title: "Email", format: "email"},
        children: {
          type: "array",
          title: "Children",
          items: {$ref: "#/$defs/node"},
        },
      },
    },
  },
} satisfies JsonSchema;

function createOverflowEmailValues(overrides: Record<string, string> = {}) {
  return {
    ...Object.fromEntries(
      Array.from({length: 12}, (_, index) => [`field${index + 1}`, `field${index + 1}@example.com`]),
    ),
    ...overrides,
  };
}

function createRecursiveNodeChain(depth: number, invalidDepth?: number): Record<string, unknown> {
  let next: Record<string, unknown> | undefined;
  for (let level = depth; level >= 1; level -= 1) {
    const node: Record<string, unknown> = {
      email: level === invalidDepth ? "invalid email" : `node${level}@example.com`,
      children: next ? [next] : [],
    };
    next = node;
  }
  return next ?? {};
}

function getSummaryChipByTitle(section: HTMLElement, title: string): HTMLElement {
  const summary = section.querySelector(".schematic-form__object-summary");
  const chip = summary?.querySelector(`.schematic-form__object-summary-chip[title="${title}"]`);
  expect(chip).toBeInTheDocument();
  return chip as HTMLElement;
}

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
    const {container} = render(
      <SchematicForm schema={rowsSchema} defaultValue={{milestones: [{name: "Kickoff"}, {name: "Launch"}]}} />,
    );

    const firstRow = getSurface(container, "/milestones/0");
    const secondRow = getSurface(container, "/milestones/1");
    const toggle = within(firstRow).getByRole("button", {name: "Collapse Milestone #1"});

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(firstRow).getByLabelText("Name")).toBeInTheDocument();

    await user.click(toggle);
    await user.click(within(secondRow).getByRole("button", {name: "Collapse Milestone #2"}));

    expect(within(firstRow).getByRole("button", {name: "Expand Milestone #1"})).toHaveAttribute("aria-expanded", "false");
    expect(within(secondRow).getByRole("button", {name: "Expand Milestone #2"})).toHaveAttribute("aria-expanded", "false");
    expect(firstRow.querySelector(".schematic-form__object-summary")).toHaveTextContent("Name: Kickoff");
    expect(secondRow.querySelector(".schematic-form__object-summary")).toHaveTextContent("Name: Launch");
    expect(firstRow.querySelector(".schematic-form__object-summary")).not.toHaveTextContent("Name #1");
    expect(secondRow.querySelector(".schematic-form__object-summary")).not.toHaveTextContent("Name #2");
    expect(within(firstRow).getByLabelText("Name")).not.toBeVisible();
  });

  test("renders collapsible toggles for selected object branch variants", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={branchSchema} />);

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

  test("uses array item indexes in chips only when the expanded field label is indexed", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm schema={scalarArraySummarySchema} defaultValue={{section: {aliases: ["Alpha", "Beta"]}}} />,
    );

    const section = getSurface(container, "/section");
    expect(within(section).getByLabelText("Alias #1")).toBeInTheDocument();
    expect(within(section).getByLabelText("Alias #2")).toBeInTheDocument();

    await user.click(within(section).getByRole("button", {name: "Collapse Section"}));

    const summary = section.querySelector(".schematic-form__object-summary");
    expect(summary).toHaveTextContent("Alias #1: Alpha");
    expect(summary).toHaveTextContent("Alias #2: Beta");
  });

  test("clicking explicit-label chips expands and focuses the exact field", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm
        schema={summarySchema}
        defaultValue={{
          section: {
            short: "Alpha",
            longValue: "abcdefghijklmnopqrstuvwxyz",
          },
        }}
      />,
    );

    const section = getSurface(container, "/section");
    await user.click(within(section).getByRole("button", {name: "Collapse Section"}));
    expect(section).toHaveAttribute("data-sf-collapsed", "true");

    const summary = section.querySelector(".schematic-form__object-summary");
    const shortChip = (summary as HTMLElement).querySelector('.schematic-form__object-summary-chip[title="Short label: Alpha"]');
    expect(shortChip).toBeInTheDocument();
    expect(shortChip).toHaveAttribute("data-clickable", "true");

    await user.click(shortChip as HTMLElement);

    await waitFor(() => expect(section).not.toHaveAttribute("data-sf-collapsed"));
    expect(within(section).getByLabelText("Short label")).toHaveFocus();
  });

  test("hidden required single-value enum summary chips are not clickable", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm
        schema={summarySchema}
        defaultValue={{
          section: {
            short: "Alpha",
            kind: "fixed",
          },
        }}
      />,
    );

    const section = getSurface(container, "/section");
    await user.click(within(section).getByRole("button", {name: "Collapse Section"}));
    expect(section).toHaveAttribute("data-sf-collapsed", "true");

    const kindChip = getSummaryChipByTitle(section, "Kind: fixed");
    expect(kindChip).not.toHaveAttribute("data-clickable");

    await user.click(kindChip);

    expect(section).toHaveAttribute("data-sf-collapsed", "true");
  });

  test("chips without explicit labels are not clickable", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm schema={implicitSummaryLabelSchema} defaultValue={{section: {untitled: "Alpha"}}} />,
    );

    const section = getSurface(container, "/section");
    await user.click(within(section).getByRole("button", {name: "Collapse Section"}));
    expect(section).toHaveAttribute("data-sf-collapsed", "true");

    const summary = section.querySelector(".schematic-form__object-summary");
    const untitledChip = (summary as HTMLElement).querySelector('.schematic-form__object-summary-chip[title="untitled: Alpha"]');
    expect(untitledChip).toBeInTheDocument();
    expect(untitledChip).not.toHaveAttribute("data-clickable");

    await user.click(untitledChip as HTMLElement);

    expect(section).toHaveAttribute("data-sf-collapsed", "true");
  });

  test("chip navigation focuses controls without changing values", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm
        schema={chipFocusSafetySchema}
        defaultValue={{section: {note: "Alpha", count: 7, enabled: true, status: "A"}}}
      />,
    );

    const section = getSurface(container, "/section");
    const countField = section.querySelector('[data-sf-path="/section/count"] input');
    expect(countField).toBeInTheDocument();
    const enabledField = within(section.querySelector('[data-sf-path="/section/enabled"]') as HTMLElement).getByRole("switch", {name: "Enabled"});
    const scrollBySpy = vi.spyOn(window, "scrollBy").mockImplementation(() => undefined);
    const enabledRectSpy = vi.spyOn(enabledField, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 760,
      width: 16,
      height: 40,
      top: 760,
      right: 16,
      bottom: 800,
      left: 0,
      toJSON: () => ({}) as unknown,
    } as DOMRect);
    const statusTrigger = section.querySelector('[data-sf-path="/section/status"] .select__trigger');
    expect(statusTrigger).toBeInTheDocument();

    await user.click(within(section).getByRole("button", {name: "Collapse Section"}));
    await user.click(getSummaryChipByTitle(section, "Note: Alpha"));
    expect(within(section).getByLabelText("Note")).toHaveFocus();

    await user.click(within(section).getByRole("button", {name: "Collapse Section"}));
    await user.click(getSummaryChipByTitle(section, "Count: 7"));
    expect(countField as HTMLElement).toHaveFocus();
    expect(countField).toHaveValue("7");

    await user.click(within(section).getByRole("button", {name: "Collapse Section"}));
    await user.click(getSummaryChipByTitle(section, "Enabled: On"));
    await waitFor(() => expect(enabledField).toHaveFocus());
    expect(scrollBySpy).toHaveBeenCalledWith(expect.objectContaining({behavior: "smooth"}));
    expect(document.activeElement).toHaveAttribute("role", "switch");
    const enabledSwitchRoot = enabledField.closest(".switch");
    expect(enabledSwitchRoot).toHaveAttribute("data-sf-force-focus-visible", "true");
    expect(enabledField).toBeChecked();

    await user.click(within(section).getByRole("button", {name: "Collapse Section"}));
    await user.click(getSummaryChipByTitle(section, "Status: A"));
    expect(statusTrigger).toHaveFocus();
    expect(enabledSwitchRoot).not.toHaveAttribute("data-sf-force-focus-visible");
    expect(section.querySelector('[data-sf-path="/section/status"]')).toHaveTextContent("A");
    expect(screen.queryByRole("option", {name: "A"})).not.toBeInTheDocument();

    enabledRectSpy.mockRestore();
    scrollBySpy.mockRestore();
  });

  test("shows invalid collapsed fields as danger soft chips", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm
        schema={profileSchema}
        defaultValue={{owner: {email: "not an email"}}}
        validationMode="change"
      />,
    );

    const owner = getSurface(container, "/owner");
    await user.click(within(owner).getByRole("button", {name: "Collapse Owner"}));

    const chips = Array.from(owner.querySelectorAll(".schematic-form__object-summary-chip"));
    expect(chips).toHaveLength(2);
    for (const chip of chips) {
      expect(chip).toHaveClass("chip--danger", "chip--soft", "chip--sm");
    }
    expect(chips[0]).toHaveTextContent("Owner name");
    expect(chips[0]).not.toHaveTextContent(":");
    expect(chips[1]).toHaveTextContent("Owner email: not an email");
  });

  test("shows required empty key field in collapsed demo property summary", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} defaultValue={{properties: [{}]}} />);

    const property = getSurface(container, "/properties/0");
    await user.click(within(property).getByRole("button", {name: "Collapse Property #1"}));

    const summary = property.querySelector(".schematic-form__object-summary");
    expect(summary).toBeInTheDocument();
    const keyChip = within(summary as HTMLElement).getByText("Key").closest(".schematic-form__object-summary-chip");
    expect(keyChip).toBeInTheDocument();
    expect(keyChip).toHaveClass("chip--danger", "chip--soft", "chip--sm");
    expect(keyChip).not.toHaveTextContent(":");
    expect(summary).not.toHaveTextContent("Key #1");
  });

  test("shows collapsed branch summaries from valid initial data without invalid chips", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm schema={kitchenSinkSchema} defaultValue={kitchenSinkSchemaInitialValue} />,
    );

    const property = getSurface(container, "/properties/0");
    await user.click(within(property).getByRole("button", {name: "Collapse Property #1"}));

    const summary = property.querySelector(".schematic-form__object-summary");
    expect(summary).toBeInTheDocument();
    expect(summary).not.toHaveTextContent("propertyAnnotation");
    expect(summary?.querySelectorAll(".schematic-form__object-summary-chip.chip--danger")).toHaveLength(0);
  });

  test("does not render invalid branch wrapper chips for company schema summary", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm schema={kitchenSinkSchema} defaultValue={kitchenSinkSchemaInitialValue} />,
    );

    const property = getSurface(container, "/properties/3");
    await user.click(within(property).getByRole("button", {name: "Collapse Property #4"}));

    const summary = property.querySelector(".schematic-form__object-summary");
    expect(summary).toBeInTheDocument();
    expect(summary).not.toHaveTextContent("propertyAnnotation");
    expect(summary?.querySelectorAll(".schematic-form__object-summary-chip.chip--danger")).toHaveLength(0);
  });

  test("does not render invalid branch wrapper chips for array items schema summary", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm schema={kitchenSinkSchema} defaultValue={kitchenSinkSchemaInitialValue} />,
    );

    const property = getSurface(container, "/properties/4");
    await user.click(within(property).getByRole("button", {name: "Collapse Property #5"}));

    const summary = property.querySelector(".schematic-form__object-summary");
    expect(summary).toBeInTheDocument();
    expect(summary).not.toHaveTextContent("Items");
    expect(summary?.querySelectorAll(".schematic-form__object-summary-chip.chip--danger")).toHaveLength(0);
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
    expect(chips.at(-1)).toHaveClass("chip--default", "chip--primary", "chip--sm");
    expect(section.querySelector(".schematic-form__object-summary")).not.toHaveTextContent("Value 11");
  });

  test("shows danger overflow chip when hidden collapsed fields are invalid", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm
        schema={overflowValidationSchema}
        defaultValue={{
          section: createOverflowEmailValues({field12: "invalid email"}),
        }}
        validationMode="change"
      />,
    );

    const section = getSurface(container, "/section");
    await user.click(within(section).getByRole("button", {name: "Collapse Section"}));

    const summary = section.querySelector(".schematic-form__object-summary");
    const chips = Array.from(section.querySelectorAll(".schematic-form__object-summary-chip"));
    expect(chips).toHaveLength(11);
    const overflowChip = chips.at(-1);
    expect(overflowChip).toHaveTextContent("...");
    expect(overflowChip).toHaveClass("chip--danger", "chip--soft", "chip--sm");
    expect(summary).not.toHaveTextContent("Field 12: invalid email");
    for (const chip of chips.slice(0, -1)) {
      expect(chip).toHaveClass("chip--default", "chip--primary", "chip--sm");
    }
  });

  test("clicking overflow chip navigates to first hidden invalid field", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm
        schema={overflowValidationSchema}
        defaultValue={{
          section: createOverflowEmailValues({field12: "invalid email"}),
        }}
        validationMode="change"
      />,
    );

    const section = getSurface(container, "/section");
    await user.click(within(section).getByRole("button", {name: "Collapse Section"}));
    expect(section).toHaveAttribute("data-sf-collapsed", "true");

    const chips = Array.from(section.querySelectorAll(".schematic-form__object-summary-chip"));
    const overflowChip = chips.at(-1);
    expect(overflowChip).toHaveTextContent("...");
    expect(overflowChip).toHaveAttribute("data-clickable", "true");

    await user.click(overflowChip as HTMLElement);

    await waitFor(() => expect(section).not.toHaveAttribute("data-sf-collapsed"));
    expect(within(section).getByLabelText("Field 12")).toHaveFocus();
  });

  test("keeps neutral overflow chip when hidden collapsed fields are valid", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm
        schema={overflowValidationSchema}
        defaultValue={{
          section: createOverflowEmailValues(),
        }}
        validationMode="change"
      />,
    );

    const section = getSurface(container, "/section");
    await user.click(within(section).getByRole("button", {name: "Collapse Section"}));

    const chips = Array.from(section.querySelectorAll(".schematic-form__object-summary-chip"));
    expect(chips).toHaveLength(11);
    const overflowChip = chips.at(-1);
    expect(overflowChip).toHaveClass("chip--default", "chip--primary", "chip--sm");
    expect(overflowChip).not.toHaveAttribute("data-clickable");

    await user.click(overflowChip as HTMLElement);
    expect(section).toHaveAttribute("data-sf-collapsed", "true");
  });

  test("keeps overflow chip neutral when only visible collapsed fields are invalid", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm
        schema={overflowValidationSchema}
        defaultValue={{
          section: createOverflowEmailValues({field2: "invalid email"}),
        }}
        validationMode="change"
      />,
    );

    const section = getSurface(container, "/section");
    await user.click(within(section).getByRole("button", {name: "Collapse Section"}));

    const summary = section.querySelector(".schematic-form__object-summary");
    const chips = Array.from(section.querySelectorAll(".schematic-form__object-summary-chip"));
    const visibleInvalidChip = within(summary as HTMLElement)
      .getByText(/Field 2:/)
      .closest(".schematic-form__object-summary-chip");
    expect(visibleInvalidChip).toHaveClass("chip--danger", "chip--soft", "chip--sm");
    expect(chips.at(-1)).toHaveClass("chip--default", "chip--primary", "chip--sm");
  });

  test("shows danger overflow chip when both visible and hidden collapsed fields are invalid", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm
        schema={overflowValidationSchema}
        defaultValue={{
          section: createOverflowEmailValues({field2: "invalid email", field12: "invalid email"}),
        }}
        validationMode="change"
      />,
    );

    const section = getSurface(container, "/section");
    await user.click(within(section).getByRole("button", {name: "Collapse Section"}));

    const summary = section.querySelector(".schematic-form__object-summary");
    const chips = Array.from(section.querySelectorAll(".schematic-form__object-summary-chip"));
    const visibleInvalidChip = within(summary as HTMLElement)
      .getByText(/Field 2:/)
      .closest(".schematic-form__object-summary-chip");
    expect(visibleInvalidChip).toHaveClass("chip--danger", "chip--soft", "chip--sm");
    expect(chips.at(-1)).toHaveClass("chip--danger", "chip--soft", "chip--sm");
  });

  test("supports recursive $ref summaries and marks invalid hidden overflow", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm
        schema={recursiveOverflowSchema}
        defaultValue={{
          tree: createRecursiveNodeChain(12, 12),
        }}
        validationMode="change"
      />,
    );

    const tree = getSurface(container, "/tree");
    await user.click(within(tree).getByRole("button", {name: "Collapse Tree"}));

    const summary = tree.querySelector(".schematic-form__object-summary");
    expect(summary).toBeInTheDocument();
    const chips = Array.from(tree.querySelectorAll(".schematic-form__object-summary-chip"));
    expect(chips).toHaveLength(11);
    expect(chips.at(-1)).toHaveClass("chip--danger", "chip--soft", "chip--sm");
  });

  test("stops deep recursive collapsed summary traversal without blocking rendering", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <SchematicForm
        schema={recursiveOverflowSchema}
        defaultValue={{
          tree: createRecursiveNodeChain(15),
        }}
      />,
    );

    const tree = getSurface(container, "/tree");
    await user.click(within(tree).getByRole("button", {name: "Collapse Tree"}));

    const summary = tree.querySelector(".schematic-form__object-summary");
    expect(summary).toBeInTheDocument();
    const chips = Array.from(tree.querySelectorAll(".schematic-form__object-summary-chip"));
    expect(chips).toHaveLength(11);
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

  test("resets collapsed object state when the form is reset", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={profileSchema} defaultValue={{owner: {}}} />);

    const owner = getSurface(container, "/owner");
    await user.click(within(owner).getByRole("button", {name: "Collapse Owner"}));
    expect(owner).toHaveAttribute("data-sf-collapsed", "true");

    await user.click(screen.getByRole("button", {name: "Reset"}));

    expect(owner).not.toHaveAttribute("data-sf-collapsed");
    expect(within(owner).getByRole("button", {name: "Collapse Owner"})).toHaveAttribute("aria-expanded", "true");
  });

  test("resets collapsed object state when the source schema changes", async () => {
    const user = userEvent.setup();
    const nextSchema = {
      type: "object",
      title: "Updated profile form",
      properties: {
        owner: {
          type: "object",
          title: "Owner",
          description: "Updated nested owner fields.",
          properties: {
            name: {type: "string", title: "Owner name"},
          },
        },
      },
    } satisfies JsonSchema;
    const {container, rerender} = render(<SchematicForm schema={profileSchema} />);

    await user.click(within(getSurface(container, "/owner")).getByRole("button", {name: "Collapse Owner"}));
    expect(getSurface(container, "/owner")).toHaveAttribute("data-sf-collapsed", "true");

    rerender(<SchematicForm schema={nextSchema} />);

    expect(getSurface(container, "/owner")).not.toHaveAttribute("data-sf-collapsed");
    expect(within(getSurface(container, "/owner")).getByRole("button", {name: "Collapse Owner"})).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
