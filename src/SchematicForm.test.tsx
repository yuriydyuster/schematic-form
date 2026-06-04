import {render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, test, vi} from "vitest";

import {SchematicForm} from "./SchematicForm";
import {kitchenSinkSchema} from "./sampleSchemas";
import type {JsonSchema, SchematicFormState} from "./types";

function expectBefore(first: Element, second: Element) {
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

function getSurface(container: HTMLElement, pointer: string) {
  const surface = container.querySelector(`.schematic-form__surface[data-sf-path="${pointer}"]`);
  expect(surface).toBeInTheDocument();
  return surface as HTMLElement;
}

describe("SchematicForm", () => {
  test("renders root schema title and description with Typography", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} />);

    const title = screen.getByRole("heading", {level: 2, name: "Project Intake"});
    const description = screen.getByText("Descriptions render above fields and every level is wrapped in a transparent surface.");

    expect(title).toHaveClass("typography", "typography--h2");
    expect(description).toHaveClass("typography", "typography--body");
    expect(container.querySelector(".schematic-form__surface[data-sf-path=\"/\"]")).toContainElement(title);
  });

  test("uses schema name before title for the root form label", () => {
    const schema = {
      type: "object",
      name: "Schema name",
      title: "Schema title",
      properties: {},
    } satisfies JsonSchema;

    render(<SchematicForm schema={schema} />);

    expect(screen.getByRole("form", {name: "Schema name"})).toBeInTheDocument();
    expect(screen.getByRole("heading", {level: 2, name: "Schema name"})).toBeInTheDocument();
    expect(screen.queryByRole("heading", {level: 2, name: "Schema title"})).not.toBeInTheDocument();
  });

  test("renders display-only null fields and excludes them from data state", async () => {
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();

    render(<SchematicForm schema={kitchenSinkSchema} onStateChange={onStateChange} />);

    expect(screen.getByText("Scope")).toHaveClass("fieldset__legend");
    expect(screen.getByText("This block is display-only and will not be present in data.")).toHaveClass(
      "typography",
      "typography--body-sm",
    );

    await waitFor(() => expect(onStateChange).toHaveBeenCalled());
    const lastState = onStateChange.mock.calls.at(-1)?.[0];
    expect(lastState?.data).not.toHaveProperty("intro");
  });

  test("wraps nested object and array levels with full-width surfaces and fieldsets", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} />);

    expect(container.querySelectorAll(".schematic-form__surface").length).toBeGreaterThan(1);
    expect(container.querySelectorAll(".schematic-form__fieldset").length).toBeGreaterThan(1);
    expect(container.querySelectorAll(".schematic-form__field").length).toBeGreaterThan(1);
    for (const surface of container.querySelectorAll(".schematic-form__surface")) {
      expect(surface).toHaveClass("rounded-lg", "border", "p-3");
    }

    const owner = getSurface(container, "/owner");
    const ownerLegend = owner.querySelector(".fieldset__legend");
    const ownerDescription = within(owner).getByText("Nested objects render inside their own transparent surface.");
    expect(ownerLegend).not.toBeNull();
    expect(ownerLegend?.parentElement).toHaveClass("schematic-form__fieldset");
    expect(ownerDescription.closest(".schematic-form__field-group")).toBeInTheDocument();

    const milestones = getSurface(container, "/milestones");
    const milestonesLegend = milestones.querySelector(".fieldset__legend");
    const milestonesDescription = within(milestones).getByText("Array fields render item controls and an add button until maxItems is reached.");
    expect(milestonesLegend).not.toBeNull();
    expect(milestonesLegend?.parentElement).toHaveClass("schematic-form__fieldset");
    expect(milestonesDescription.closest(".schematic-form__field-group")).toBeInTheDocument();
  });

  test("wraps radio and checkbox groups in transparent surfaces", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} />);

    expect(screen.getByRole("radio", {name: "Internal"}).closest(".schematic-form__surface")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", {name: "Figma"}).closest(".schematic-form__surface")).toBeInTheDocument();
    expect(container.querySelector(".schematic-form__form")).toHaveClass("flex", "flex-col", "gap-3");
    expect(container.querySelector(".schematic-form__field-group")).toHaveClass("flex", "flex-col", "gap-0");
  });

  test("renders single input descriptions below the field control with HeroUI Description", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} />);
    const field = container.querySelector('[data-sf-path="/projectName"]');
    expect(field).toBeInTheDocument();

    const control = screen.getByLabelText("Project name");
    const description = screen.getByText("Short unformatted strings render as single-line inputs by default.");

    expect(field).toContainElement(control);
    expect(field).toContainElement(description);
    expect(description).toHaveClass("description", "schematic-form__description");
    expect(description).toHaveAttribute("data-slot", "schema-description");
    expectBefore(control, description);
  });

  test("renders text inputs single-line by default and multiline only for long unformatted strings", () => {
    const schema = {
      type: "object",
      title: "Text fields",
      properties: {
        shortText: {
          type: "string",
          title: "Short text",
          description: "Short text description.",
        },
        longText: {
          type: "string",
          title: "Long text",
          description: "Long text description.",
          maxLength: 256,
        },
        email: {
          type: "string",
          title: "Email",
          description: "Email description.",
          format: "email",
          maxLength: 512,
        },
      },
    } satisfies JsonSchema;

    render(<SchematicForm schema={schema} />);

    expect(screen.getByLabelText("Short text").tagName).toBe("INPUT");
    expect(screen.getByLabelText("Long text").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("Email").tagName).toBe("INPUT");
  });

  test("renders boolean fields as switches with labels before the control", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} />);
    const field = container.querySelector('[data-sf-path="/requiresReview"]');
    expect(field).toBeInTheDocument();

    const label = within(field as HTMLElement).getByText("Requires review");
    const control = screen.getByRole("switch", {name: "Requires review"});
    const switchRoot = control.closest(".switch");
    const row = field?.querySelector(".schematic-form__switch-row");

    expect(switchRoot).toBeInTheDocument();
    expect(row).toHaveClass("flex", "items-center", "justify-between", "gap-2");
    expect(row).toContainElement(label);
    expect(row).toContainElement(switchRoot as HTMLElement);
    expectBefore(label, switchRoot as Element);
  });

  test("kitchen sink demo schema exposes every supported field layout", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} />);

    expect(screen.getByLabelText("Project name").tagName).toBe("INPUT");
    expect(screen.getByLabelText("Project summary").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("Contact email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Reference URL")).toHaveAttribute("type", "url");
    expect(screen.getByRole("switch", {name: "Requires review"})).toBeInTheDocument();
    expect(screen.getByRole("radio", {name: "Internal"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /select an option status/i})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /select an option channels/i})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /select an option review tags/i})).toBeInTheDocument();
    expect(screen.getByRole("checkbox", {name: "Figma"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /select an option payment method/i})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /select an option fulfillment path/i})).toBeInTheDocument();
    expect(container.querySelector(".slider")).toBeInTheDocument();
    expect(container.querySelector(".number-field")).toBeInTheDocument();
    expect(container.querySelector(".date-picker")).toBeInTheDocument();
    expect(container.querySelector(".time-field")).toBeInTheDocument();
    expect(container.querySelector('.schematic-form__surface[data-sf-path="/owner"]')).toBeInTheDocument();
    expect(container.querySelector('.schematic-form__surface[data-sf-path="/milestones"]')).toBeInTheDocument();
  });

  test("cleans empty string values unless minLength is explicitly zero", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const schema = {
      type: "object",
      title: "Empty strings",
      properties: {
        name: {
          type: "string",
          title: "Name",
          description: "Name description.",
        },
        note: {
          type: "string",
          title: "Note",
          description: "Note description.",
          minLength: 0,
        },
      },
    } satisfies JsonSchema;

    render(
      <SchematicForm
        defaultValue={{name: "Ada", note: "Keep"}}
        schema={schema}
        onStateChange={onStateChange}
      />,
    );

    await user.clear(screen.getByLabelText("Name"));

    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      expect(lastState?.data).not.toHaveProperty("name");
    });

    await user.clear(screen.getByLabelText("Note"));

    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      expect(lastState?.data).toHaveProperty("note", "");
    });
  });

  test("replaces field descriptions with visible field errors", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} />);

    await user.click(screen.getByRole("button", {name: "Submit"}));

    const field = container.querySelector('[data-sf-path="/projectName"]');
    expect(field).toBeInTheDocument();
    expect(within(field as HTMLElement).queryByText("Short unformatted strings render as single-line inputs by default.")).not.toBeInTheDocument();
    expect(within(field as HTMLElement).getByText(/must have required property 'projectName'/i)).toBeInTheDocument();
  });

  test("renders complex field descriptions below labels inside transparent surfaces", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} />);
    const channels = container.querySelector('.schematic-form__field[data-sf-path="/channels"]');
    expect(channels).toBeInTheDocument();
    expect(container.querySelector('.schematic-form__surface[data-sf-path="/channels"]')).not.toBeInTheDocument();
    expect(within(channels as HTMLElement).getByText("Channels")).toBeInTheDocument();
    expect(within(channels as HTMLElement).getByText("Six or more enum string options render as a multiselect dropdown.")).toHaveClass(
      "description",
      "schematic-form__description",
    );

    const cases = [
      {
        pointer: "/audience",
        label: "Audience",
        description: "Fewer than six enum options render as radio buttons.",
      },
      {
        pointer: "/tools",
        label: "Tools",
        description: "Fewer than six enum string options render as a checkbox group.",
      },
      {
        pointer: "/milestones",
        label: "Milestones",
        description: "Array fields render item controls and an add button until maxItems is reached.",
      },
    ];

    for (const item of cases) {
      const surface = getSurface(container, item.pointer);
      const label = within(surface).getByText(item.label);
      const description = within(surface).getByText(item.description);

      expect(surface).toHaveClass("surface--transparent", "rounded-lg", "border", "p-3");
      expect(label).toHaveClass("fieldset__legend");
      expect(description).toHaveClass("description", "schematic-form__description");
      expectBefore(label, description);
    }
  });

  test("renders dropdown descriptions in the expected semantic position without tags", () => {
    const {container} = render(
      <SchematicForm
        defaultValue={{channels: ["Email", "Web"], status: "Draft"}}
        schema={kitchenSinkSchema}
      />,
    );
    const enumCases = [
      {
        containerSelector: '[data-sf-path="/status"]',
        fieldSelector: '[data-sf-path="/status"]',
        description: "Six enum options render as a dropdown.",
      },
      {
        containerSelector: '[data-sf-path="/channels"]',
        fieldSelector: '[data-sf-path="/channels"]',
        description: "Six or more enum string options render as a multiselect dropdown.",
      },
    ];

    for (const item of enumCases) {
      const fieldContainer = container.querySelector(item.containerSelector);
      expect(fieldContainer).toBeInTheDocument();
      const field = fieldContainer?.matches(item.fieldSelector)
        ? fieldContainer
        : fieldContainer?.querySelector(item.fieldSelector);
      const trigger = field?.querySelector(".select__trigger");
      const description = within(field as HTMLElement).getByText(item.description);

      expect(field).toHaveClass("flex", "flex-col", "gap-1");
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveClass("select__trigger", "select__trigger--full-width");
      expect(description).toHaveClass("description", "schematic-form__description");
      expectBefore(trigger as Element, description);
    }

    const branch = getSurface(container, "/payment");
    const branchField = branch.querySelector(".schematic-form__field");
    const branchTrigger = branchField?.querySelector(".select__trigger");
    const branchDescription = within(branch).getByText("Branching uses a dropdown and anyOf is intentionally treated as oneOf in V1.");

    expect(branchField).toHaveClass("flex", "flex-col", "gap-1");
    expect(branchTrigger).toBeInTheDocument();
    expect(branchDescription).toHaveClass("description", "schematic-form__description");
    expect(branchDescription.closest(".schematic-form__branch-group")).toBeInTheDocument();
    expect(branchDescription.closest(".schematic-form__field")).not.toBeInTheDocument();
    expectBefore(within(branch).getByText("Payment method"), branchDescription);
    expectBefore(branchDescription, branchTrigger as Element);

    expect(container.querySelector(".schematic-form__tags")).not.toBeInTheDocument();
    expect(within(branch).getByText("Payment method")).toHaveClass("fieldset__legend");
  });

  test("updates form data when selecting multiselect enum array options", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();

    render(<SchematicForm schema={kitchenSinkSchema} onStateChange={onStateChange} />);

    await user.click(screen.getByRole("button", {name: /select an option channels/i}));
    await user.click(await screen.findByRole("option", {name: "Email"}));

    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      expect(lastState?.data).toMatchObject({channels: ["Email"]});
    });
  });

  test("leaves oneOf and anyOf selectors empty until a default or user selection exists", async () => {
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} onStateChange={onStateChange} />);

    expect(screen.getByRole("button", {name: /select an option payment method/i})).toBeInTheDocument();
    expect(screen.queryByLabelText(/card number/i)).not.toBeInTheDocument();

    const branch = container.querySelector('.schematic-form__branch[data-sf-path="/payment"]');
    expect(branch).toBeInTheDocument();
    expect(branch).toHaveClass("surface--transparent", "rounded-lg", "border", "p-3", "flex", "flex-col", "gap-0");
    expect(within(branch as HTMLElement).getByText("Payment method")).toHaveClass("fieldset__legend");
    expect(within(branch as HTMLElement).getByRole("button", {name: /select an option payment method/i})).toBeInTheDocument();

    await waitFor(() => expect(onStateChange).toHaveBeenCalled());
    const lastState = onStateChange.mock.calls.at(-1)?.[0];
    expect(lastState?.data).not.toHaveProperty("payment");
  });

  test("shows branch selector errors inside the branch surface and validates only the selected branch", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} onStateChange={onStateChange} />);

    await user.click(screen.getByRole("button", {name: "Submit"}));

    const branch = getSurface(container, "/payment");
    expect(within(branch).getByText(/must have required property 'payment'/i)).toBeInTheDocument();

    await user.click(within(branch).getByRole("button", {name: /select an option payment method/i}));
    await user.click(await screen.findByRole("option", {name: "Card"}));

    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      const errors = lastState?.errors.join("\n") ?? "";
      expect(errors).toMatch(/cardNumber/i);
      expect(errors).not.toMatch(/iban/i);
      expect(errors).not.toMatch(/oneOf/i);
    });

    expect(within(branch).queryByText(/must have required property 'payment'/i)).not.toBeInTheDocument();
    expect(within(branch).queryByText(/must match exactly one schema/i)).not.toBeInTheDocument();
    expect(within(branch).getByText(/must have required property 'cardNumber'/i)).toBeInTheDocument();
    const branchGroup = branch.querySelector(".schematic-form__branch-group");
    expect(branchGroup).toHaveClass("space-y-4");
    expect(branchGroup?.children[0]).toHaveClass("schematic-form__description");
    expect(branchGroup?.children[1]).toHaveClass("schematic-form__field");
    expect(branchGroup?.children[2]).toHaveClass("schematic-form__fieldset");
    await waitFor(() => expect(screen.getByLabelText("Card number")).toHaveFocus());
  });

  test("uses explicit branch defaults to select and render a nested oneOf structure", () => {
    const schema = {
      type: "object",
      title: "Default branch",
      properties: {
        delivery: {
          title: "Delivery type",
          oneOf: [
            {
              type: "object",
              title: "Pickup",
              default: {store: "Main"},
              properties: {
                store: {
                  type: "string",
                  title: "Store",
                  description: "Pickup location.",
                },
              },
            },
            {
              type: "object",
              title: "Shipping",
              properties: {
                address: {
                  type: "string",
                  title: "Address",
                  description: "Shipping address.",
                },
              },
            },
          ],
        },
      },
    } satisfies JsonSchema;

    const {container} = render(<SchematicForm schema={schema} />);

    expect(screen.getByRole("button", {name: /pickup delivery type/i})).toBeInTheDocument();
    const branch = getSurface(container, "/delivery");
    expect(branch).toHaveClass("schematic-form__branch");
    expect(within(branch).getByText("Delivery type")).toHaveClass("fieldset__legend");
    const branchGroup = branch.querySelector(".schematic-form__branch-group");
    expect(branchGroup).toHaveClass("space-y-4");
    expect(branchGroup?.children[0]).toHaveClass("schematic-form__field");
    expect(branchGroup?.children[1]).toHaveClass("schematic-form__fieldset");
    expect(branch.querySelectorAll(".fieldset__legend")[1]).toHaveTextContent("Pickup");
    expect(screen.getByLabelText("Store")).toBeInTheDocument();
    expect(screen.queryByLabelText("Address")).not.toBeInTheDocument();
  });

  test("adds array rows with an Add label button", async () => {
    const user = userEvent.setup();

    render(<SchematicForm schema={kitchenSinkSchema} />);

    await user.click(screen.getByRole("button", {name: /add milestone/i}));

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByText("Milestone #1")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /remove/i})).toBeInTheDocument();
  });

  test("renders mixed oneOf array items in one row surface and preserves rows when switching branches", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} onStateChange={onStateChange} />);

    await user.click(screen.getByRole("button", {name: /add mixed item/i}));

    expect(container.querySelectorAll('.schematic-form__surface[data-sf-path="/mixedItems/0"]')).toHaveLength(1);
    const item = getSurface(container, "/mixedItems/0");
    expect(item.children[0]).toHaveClass("schematic-form__fieldset");
    expect(item.children[0]).not.toHaveClass("schematic-form__branch");
    expect(within(item).getByRole("button", {name: /object mixed item #1/i})).toBeInTheDocument();
    const branchGroup = item.querySelector(".schematic-form__branch-group");
    expect(branchGroup).toHaveClass("space-y-4");
    expect(item.querySelector(".schematic-form__row-actions")).toHaveClass("mt-4");

    await user.click(within(item).getByRole("button", {name: /object mixed item #1/i}));
    await user.click(await screen.findByRole("option", {name: "Enum string"}));

    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      expect(lastState?.data).toMatchObject({mixedItems: ["Alpha"]});
    });
    const updatedBranchGroup = item.querySelector(".schematic-form__branch-group");
    expect(item.querySelector(".schematic-form__row-actions")?.previousElementSibling).toBe(item.children[0]);
    expect(updatedBranchGroup?.lastElementChild).toHaveClass("schematic-form__fieldset");
    expect(getSurface(container, "/mixedItems/0")).toBeInTheDocument();

    await user.click(within(item).getByRole("button", {name: /enum string mixed item #1/i}));
    await user.click(await screen.findByRole("option", {name: "Null"}));

    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      expect(lastState?.data).toMatchObject({mixedItems: [null]});
    });
    expect(getSurface(container, "/mixedItems/0")).toBeInTheDocument();

    await user.click(within(item).getByRole("button", {name: /null mixed item #1/i}));
    await user.click(await screen.findByRole("option", {name: "Boolean"}));

    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      expect(lastState?.data).toMatchObject({mixedItems: [false]});
    });
    expect(getSurface(container, "/mixedItems/0")).toBeInTheDocument();
  });

  test("falls back to indexed Item labels for array items without titles", async () => {
    const user = userEvent.setup();
    const schema = {
      type: "object",
      title: "Fallback arrays",
      properties: {
        rows: {
          type: "array",
          title: "Rows",
          items: {
            type: "object",
            properties: {
              value: {
                type: "string",
                title: "Value",
                description: "Value entered for this row.",
              },
            },
          },
        },
      },
    } satisfies JsonSchema;

    render(<SchematicForm schema={schema} />);

    await user.click(screen.getByRole("button", {name: /add/i}));

    expect(screen.getByText("Item #1")).toBeInTheDocument();
  });

  test("renders array item buttons inside the item surface with Gravity icons and labels", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} />);

    await user.click(screen.getByRole("button", {name: /add milestone/i}));

    const itemSurface = getSurface(container, "/milestones/0");
    const actions = itemSurface.querySelector(".schematic-form__row-actions");
    expect(actions).toBeInTheDocument();
    expect(actions).toHaveClass("mt-4", "grid", "grid-cols-3", "gap-1");

    for (const name of [/move up/i, /move down/i]) {
      const button = within(actions as HTMLElement).getByRole("button", {name});
      expect(button).toHaveClass("button--secondary", "button--full-width");
      expect(button).not.toHaveClass("button--icon-only");
      expect(button.querySelector(".schematic-form__button-icon")).toBeInTheDocument();
      expect(button).toHaveTextContent(name);
    }

    const removeButton = within(actions as HTMLElement).getByRole("button", {name: /remove/i});
    expect(removeButton).toHaveClass("button--danger-soft", "button--full-width");
    expect(removeButton).not.toHaveClass("button--icon-only");
    expect(removeButton.querySelector(".schematic-form__button-icon")).toBeInTheDocument();
    expect(removeButton).toHaveTextContent(/remove/i);
  });

  test("shows required validation errors after submit", async () => {
    const user = userEvent.setup();

    render(<SchematicForm schema={kitchenSinkSchema} />);

    await user.click(screen.getByRole("button", {name: "Submit"}));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please review the highlighted fields.");
    expect(screen.getAllByText(/must have required property/i).length).toBeGreaterThan(0);
  });

  test("renders date and time formats with HeroUI components", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} />);

    expect(container.querySelectorAll(".date-picker").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector(".time-field")).toBeInTheDocument();
    expect(container.querySelector('.schematic-form__control[type="date"]')).not.toBeInTheDocument();
    expect(container.querySelector('.schematic-form__control[type="time"]')).not.toBeInTheDocument();
    expect(container.querySelector('.schematic-form__control[type="datetime-local"]')).not.toBeInTheDocument();
  });
});
