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

    expect(screen.getByRole("heading", {level: 4, name: "Scope"})).toHaveClass("typography", "typography--h4");
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
  });

  test("wraps checkbox groups in a transparent surface", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} />);

    expect(screen.getByRole("checkbox", {name: "Figma"}).closest(".schematic-form__surface")).toBeInTheDocument();
    expect(container.querySelector(".schematic-form__form")).toHaveClass("flex", "flex-col", "gap-4");
    expect(container.querySelector(".schematic-form__field-group")).toHaveClass("flex", "flex-col", "gap-4");
  });

  test("renders single input descriptions below the field control with HeroUI Description", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} />);
    const field = container.querySelector('[data-sf-path="/projectName"]');
    expect(field).toBeInTheDocument();

    const control = screen.getByLabelText("Project name");
    const description = screen.getByText("Unformatted short strings render as multiline fields by default.");

    expect(field).toContainElement(control);
    expect(field).toContainElement(description);
    expect(description).toHaveClass("description", "schematic-form__description");
    expect(description).toHaveAttribute("data-slot", "schema-description");
    expectBefore(control, description);
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
      expect(description).toHaveClass("description", "schematic-form__description");
      expectBefore(label, description);
    }
  });

  test("renders enum and branch dropdown descriptions below matching selector lines without tags", () => {
    const {container} = render(
      <SchematicForm
        defaultValue={{channels: ["Email", "Web"], status: "Draft"}}
        schema={kitchenSinkSchema}
      />,
    );
    const cases = [
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
      {
        containerSelector: '.schematic-form__surface[data-sf-path="/payment"]',
        fieldSelector: ".schematic-form__field",
        description: "Branching uses a dropdown and anyOf is intentionally treated as oneOf in V1.",
      },
    ];

    for (const item of cases) {
      const fieldContainer = container.querySelector(item.containerSelector);
      expect(fieldContainer).toBeInTheDocument();
      const field = fieldContainer?.matches(item.fieldSelector)
        ? fieldContainer
        : fieldContainer?.querySelector(item.fieldSelector);
      const trigger = field?.querySelector(".select__trigger");
      const description = within(field as HTMLElement).getByText(item.description);

      expect(field).toHaveClass("flex", "flex-col", "gap-2");
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveClass("select__trigger", "select__trigger--full-width");
      expect(description).toHaveClass("description", "schematic-form__description");
      expectBefore(trigger as Element, description);
    }

    expect(container.querySelector(".schematic-form__tags")).not.toBeInTheDocument();
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
    expect(branch).toHaveClass("surface--transparent", "rounded-lg", "border", "p-3", "flex", "flex-col", "gap-4");
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
    expect(branch.querySelector(".fieldset__legend")).toHaveTextContent("Pickup");
    expect(screen.getByLabelText("Store")).toBeInTheDocument();
    expect(screen.queryByLabelText("Address")).not.toBeInTheDocument();
  });

  test("adds array rows with an Add label button", async () => {
    const user = userEvent.setup();

    render(<SchematicForm schema={kitchenSinkSchema} />);

    await user.click(screen.getByRole("button", {name: /\+ add milestone/i}));

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByText("Milestone #1")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /remove/i})).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", {name: /\+ add/i}));

    expect(screen.getByText("Item #1")).toBeInTheDocument();
  });

  test("renders array item buttons as evenly spaced full-width secondary buttons", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} />);

    await user.click(screen.getByRole("button", {name: /\+ add milestone/i}));

    const actions = container.querySelector(".schematic-form__row-actions");
    expect(actions).toBeInTheDocument();
    expect(actions).toHaveClass("grid", "grid-cols-3", "gap-2");

    for (const name of [/move up/i, /move down/i, /remove/i]) {
      const button = within(actions as HTMLElement).getByRole("button", {name});
      expect(button).toHaveClass("button--secondary", "button--full-width");
    }
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
