import {act, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, test, vi} from "vitest";

import {SchematicForm} from "./SchematicForm";
import {createDraftPayload, createSchemaFingerprint} from "./persistence";
import {kitchenSinkSchema, kitchenSinkSchemaOld} from "./sampleSchemas";
import type {JsonSchema, SchematicFormDraftStorage, SchematicFormState} from "./types";

function expectBefore(first: Element, second: Element) {
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

function getSurface(container: HTMLElement, pointer: string) {
  const surface = container.querySelector(`.schematic-form__surface[data-sf-path="${pointer}"]`);
  expect(surface).toBeInTheDocument();
  return surface as HTMLElement;
}

function createMemoryStorage(): SchematicFormDraftStorage & {values: Map<string, string>} {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

function recursiveBranchSchema(): JsonSchema {
  return {
    type: "object",
    title: "Recursive branches",
    properties: {
      nodes: {
        type: "array",
        title: "Nodes",
        items: {
          $ref: "#/$defs/node",
          title: "Node",
          description: "A recursive node.",
        },
      },
    },
    $defs: {
      node: {
        title: "Node",
        oneOf: [
          {
            title: "Text Node",
            type: "object",
            properties: {
              kind: {type: "string", enum: ["text"]},
              label: {type: "string", title: "Label"},
            },
            required: ["kind", "label"],
          },
          {
            title: "Group Node",
            type: "object",
            properties: {
              kind: {type: "string", enum: ["group"]},
              children: {
                type: "array",
                title: "Children",
                items: {
                  $ref: "#/$defs/node",
                  title: "Child Node",
                },
              },
            },
            required: ["kind", "children"],
          },
        ],
      },
    },
  };
}

describe("SchematicForm", () => {
  test("renders root schema title and description with Typography", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} />);

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

    render(<SchematicForm schema={kitchenSinkSchemaOld} onStateChange={onStateChange} />);

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
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} />);

    expect(container.querySelectorAll(".schematic-form__surface").length).toBeGreaterThan(1);
    expect(container.querySelectorAll(".schematic-form__fieldset").length).toBeGreaterThan(1);
    expect(container.querySelectorAll(".schematic-form__field").length).toBeGreaterThan(1);
    for (const surface of container.querySelectorAll(".schematic-form__surface")) {
      expect(surface).toHaveClass("schematic-form__surface");
    }

    const owner = getSurface(container, "/owner");
    const ownerLegend = owner.querySelector(".fieldset__legend");
    const ownerHeader = owner.querySelector(".schematic-form__object-header");
    const ownerDescription = within(owner).getByText("Nested objects render inside their own transparent surface.");
    expect(ownerLegend).not.toBeNull();
    expect(ownerLegend).toHaveClass("schematic-form__object-header");
    expect(ownerHeader).toBe(ownerLegend);
    expect(ownerHeader).toContainElement(within(owner).getByRole("button", {name: "Collapse Owner"}));
    expect(ownerDescription.closest(".schematic-form__object-description")).toBeInTheDocument();

    const milestones = getSurface(container, "/milestones");
    const milestonesLegend = milestones.querySelector(".fieldset__legend");
    const milestonesDescription = within(milestones).getByText("Array fields render item controls and an add button until maxItems is reached.");
    expect(milestonesLegend).not.toBeNull();
    expect(milestonesLegend?.parentElement).toHaveClass("schematic-form__fieldset");
    expect(milestonesDescription.closest(".schematic-form__field-group")).toBeInTheDocument();
  });

  test("wraps radio and checkbox groups in transparent surfaces", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} />);

    expect(screen.getByRole("radio", {name: "Internal"}).closest(".schematic-form__surface")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", {name: "Figma"}).closest(".schematic-form__surface")).toBeInTheDocument();
    expect(container.querySelector(".schematic-form__form")).toHaveClass("schematic-form__form");
    expect(container.querySelector(".schematic-form__field-group")).toHaveClass("schematic-form__field-group");
  });

  test("marks required group-style fields with the required label class", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} />);

    const payment = getSurface(container, "/payment");
    expect(within(payment).getByText("Payment method")).toHaveClass("schematic-form__required-label");

    const priority = container.querySelector('[data-sf-path="/priority"]');
    expect(priority).toBeInTheDocument();
    expect(within(priority as HTMLElement).getByText("Priority")).toHaveClass("schematic-form__required-label");
  });

  test("renders single input descriptions below the field control with HeroUI Description", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} />);
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

  test("renders formatted email and uri fields with InputGroup suffix icons", () => {
    const schema = {
      type: "object",
      title: "Formatted fields",
      properties: {
        email: {
          type: "string",
          title: "Email",
          format: "email",
        },
        website: {
          type: "string",
          title: "Website",
          format: "uri",
        },
      },
    } satisfies JsonSchema;

    const {container} = render(<SchematicForm schema={schema} />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Website")).toHaveAttribute("type", "url");
    expect(container.querySelector('[data-sf-path="/email"] .input-group__suffix .schematic-form__field-icon')).toBeInTheDocument();
    expect(container.querySelector('[data-sf-path="/website"] .input-group__suffix .schematic-form__field-icon')).toBeInTheDocument();
  });

  test("applies schema defaults across supported field types", async () => {
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const schema = {
      type: "object",
      title: "Defaults",
      properties: {
        shortText: {type: "string", title: "Short text", default: "Ada"},
        longText: {type: "string", title: "Long text", maxLength: 256, default: "Long default"},
        email: {type: "string", title: "Email", format: "email", default: "ada@example.com"},
        website: {type: "string", title: "Website", format: "uri", default: "https://example.com"},
        dueDate: {type: "string", title: "Due date", format: "date", default: "2026-06-05"},
        dueTime: {type: "string", title: "Due time", format: "time", default: "09:30:00"},
        amount: {type: "number", title: "Amount", default: 42.5},
        priority: {type: "integer", title: "Priority", minimum: 1, maximum: 5, default: 3},
        enabled: {type: "boolean", title: "Enabled", default: true},
        status: {type: "string", title: "Status", enum: ["Draft", "Ready"], default: "Ready"},
        tags: {
          type: "array",
          title: "Tags",
          uniqueItems: true,
          items: {type: "string", enum: ["One", "Two", "Three"]},
          default: ["One", "Three"],
        },
        owner: {
          type: "object",
          title: "Owner",
          properties: {
            name: {type: "string", title: "Owner name", default: "Grace"},
          },
        },
        milestones: {
          type: "array",
          title: "Milestones",
          items: {
            type: "object",
            properties: {
              label: {type: "string", title: "Milestone label"},
            },
          },
          default: [{label: "Kickoff"}],
        },
      },
    } satisfies JsonSchema;

    const {container} = render(<SchematicForm schema={schema} onStateChange={onStateChange} />);

    expect(screen.getByLabelText("Short text")).toHaveValue("Ada");
    expect(screen.getByLabelText("Long text")).toHaveValue("Long default");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    expect(screen.getByLabelText("Website")).toHaveValue("https://example.com");
    expect(container.querySelector('[data-sf-path="/amount"] input')).toHaveValue("42.5");
    expect(screen.getByRole("switch", {name: "Enabled"})).toBeChecked();
    expect(screen.getByRole("radio", {name: "Ready"})).toBeChecked();
    expect(screen.getByRole("checkbox", {name: "One"})).toBeChecked();
    expect(screen.getByRole("checkbox", {name: "Three"})).toBeChecked();
    expect(screen.getByLabelText("Owner name")).toHaveValue("Grace");
    expect(screen.getByLabelText("Milestone label")).toHaveValue("Kickoff");

    await waitFor(() => expect(onStateChange).toHaveBeenCalled());
    expect(onStateChange.mock.calls.at(-1)?.[0].data).toEqual({
      shortText: "Ada",
      longText: "Long default",
      email: "ada@example.com",
      website: "https://example.com",
      dueDate: "2026-06-05",
      dueTime: "09:30:00",
      amount: 42.5,
      priority: 3,
      enabled: true,
      status: "Ready",
      tags: ["One", "Three"],
      owner: {name: "Grace"},
      milestones: [{label: "Kickoff"}],
    });
  });

  test("hides required single-value enum fields and materializes their values", async () => {
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const schema = {
      type: "object",
      title: "Implicit enum fields",
      required: ["kind", "version", "enabled", "referenced"],
      properties: {
        kind: {type: "string", title: "Kind", enum: ["fixed"]},
        version: {type: "integer", title: "Version", enum: [1]},
        enabled: {type: "boolean", title: "Enabled", enum: [true]},
        referenced: {$ref: "#/$defs/referenced", title: "Referenced"},
        optionalKind: {type: "string", title: "Optional kind", enum: ["optional"]},
        name: {type: "string", title: "Name"},
      },
      $defs: {
        referenced: {type: "string", enum: ["from-ref"]},
      },
    } satisfies JsonSchema;

    render(
      <SchematicForm
        schema={schema}
        defaultValue={{kind: "wrong", version: 2, enabled: false, referenced: "wrong-ref"}}
        onStateChange={onStateChange}
      />,
    );

    expect(screen.queryByText("Kind")).not.toBeInTheDocument();
    expect(screen.queryByText("Version")).not.toBeInTheDocument();
    expect(screen.queryByText("Enabled")).not.toBeInTheDocument();
    expect(screen.queryByText("Referenced")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", {name: "optional"})).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();

    await waitFor(() => expect(onStateChange).toHaveBeenCalled());
    expect(onStateChange.mock.calls.at(-1)?.[0].data).toEqual({
      kind: "fixed",
      version: 1,
      enabled: true,
      referenced: "from-ref",
    });
  });

  test("keeps integer slider UI and data state aligned for required and optional fields", async () => {
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const schema = {
      type: "object",
      title: "Slider semantics",
      required: ["requiredPriority"],
      properties: {
        requiredPriority: {
          type: "integer",
          title: "Required priority",
          minimum: 1,
          maximum: 5,
        },
        optionalScore: {
          type: "integer",
          title: "Optional score",
          minimum: 1,
          maximum: 5,
        },
        steppedScore: {
          type: "integer",
          title: "Stepped score",
          minimum: 10,
          maximum: 20,
          multipleOf: 5,
        },
      },
    } satisfies JsonSchema;

    const {container} = render(<SchematicForm schema={schema} onStateChange={onStateChange} />);

    const requiredSlider = container.querySelector('[data-sf-path="/requiredPriority"] input');
    const optionalSlider = container.querySelector('[data-sf-path="/optionalScore"] input');
    const steppedSlider = container.querySelector('[data-sf-path="/steppedScore"] input');

    expect(requiredSlider).toHaveAttribute("min", "1");
    expect(requiredSlider).toHaveValue("1");
    expect(optionalSlider).toHaveAttribute("min", "0");
    expect(optionalSlider).toHaveValue("0");
    expect(steppedSlider).toHaveAttribute("min", "5");
    expect(steppedSlider).toHaveValue("5");
    expect(container.querySelector('[data-sf-path="/optionalScore"]')).toHaveAttribute("data-sf-empty", "true");
    expect(container.querySelector('[data-sf-path="/optionalScore"] .schematic-form__slider-output--empty')).toBeInTheDocument();

    await waitFor(() => {
      expect(onStateChange.mock.calls.at(-1)?.[0].data).toEqual({requiredPriority: 1});
    });

    fireEvent.change(optionalSlider as HTMLInputElement, {target: {value: "1"}});
    await waitFor(() => {
      expect(onStateChange.mock.calls.at(-1)?.[0].data).toEqual({requiredPriority: 1, optionalScore: 1});
    });
    expect(container.querySelector('[data-sf-path="/optionalScore"]')).not.toHaveAttribute("data-sf-empty");

    fireEvent.change(optionalSlider as HTMLInputElement, {target: {value: "0"}});
    await waitFor(() => {
      expect(onStateChange.mock.calls.at(-1)?.[0].data).toEqual({requiredPriority: 1});
    });
    expect(container.querySelector('[data-sf-path="/optionalScore"]')).toHaveAttribute("data-sf-empty", "true");

    fireEvent.change(steppedSlider as HTMLInputElement, {target: {value: "10"}});
    await waitFor(() => {
      expect(onStateChange.mock.calls.at(-1)?.[0].data).toEqual({requiredPriority: 1, steppedScore: 10});
    });

    fireEvent.click(screen.getByRole("button", {name: /reset/i}));
    await waitFor(() => {
      expect(onStateChange.mock.calls.at(-1)?.[0].data).toEqual({requiredPriority: 1});
    });
    expect(container.querySelector('[data-sf-path="/optionalScore"] input')).toHaveValue("0");
    expect(container.querySelector('[data-sf-path="/steppedScore"] input')).toHaveValue("5");
  });

  test("renders boolean fields as switches with labels before the control", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} />);
    const field = container.querySelector('[data-sf-path="/requiresReview"]');
    expect(field).toBeInTheDocument();

    const label = within(field as HTMLElement).getByText("Requires review");
    const control = screen.getByRole("switch", {name: "Requires review"});
    const switchRoot = control.closest(".switch");
    const row = field?.querySelector(".schematic-form__switch-row");

    expect(switchRoot).toBeInTheDocument();
    expect(row).toHaveClass("schematic-form__switch-row");
    expect(row).toContainElement(label);
    expect(row).toContainElement(switchRoot as HTMLElement);
    expectBefore(label, switchRoot as Element);
  });

  test("kitchen sink demo schema exposes every supported field layout", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} />);

    expect(screen.getByLabelText("Project name").tagName).toBe("INPUT");
    expect(screen.getByLabelText("Project summary").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("Contact email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Reference URL")).toHaveAttribute("type", "url");
    expect(screen.getByRole("switch", {name: "Requires review"})).toBeInTheDocument();
    expect(screen.getByRole("radio", {name: "Internal"})).toBeInTheDocument();
    expect(within(container.querySelector('[data-sf-path="/confidence"]') as HTMLElement).getByText("Confidence")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /select an option status/i})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /select an option channels/i})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /select an option review tags/i})).toBeInTheDocument();
    expect(container.querySelector('.schematic-form__surface[data-sf-path="/keywords"]')).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Add Keyword"})).toBeInTheDocument();
    expect(container.querySelector('.schematic-form__surface[data-sf-path="/labels"]')).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Add Label"})).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", {name: "Discovery"})).not.toBeInTheDocument();
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

  test("cleans optional empty array fields while preserving required empty arrays", async () => {
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const schema = {
      type: "object",
      title: "Array cleanup",
      required: ["requiredItems"],
      properties: {
        optionalItems: {
          type: "array",
          title: "Optional items",
          items: {type: "string", title: "Optional item"},
        },
        requiredItems: {
          type: "array",
          title: "Required items",
          items: {type: "string", title: "Required item"},
        },
      },
    } satisfies JsonSchema;

    render(
      <SchematicForm
        defaultValue={{optionalItems: [], requiredItems: []}}
        schema={schema}
        onStateChange={onStateChange}
      />,
    );

    await waitFor(() => {
      expect(onStateChange.mock.calls.at(-1)?.[0].data).toEqual({requiredItems: []});
    });
  });

  test("removes optional array fields when the last repeatable row is removed", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const schema = {
      type: "object",
      title: "Array row cleanup",
      required: ["requiredItems"],
      properties: {
        optionalItems: {
          type: "array",
          title: "Optional items",
          items: {type: "string", title: "Optional item"},
        },
        requiredItems: {
          type: "array",
          title: "Required items",
          items: {type: "string", title: "Required item"},
        },
      },
    } satisfies JsonSchema;
    const {container} = render(
      <SchematicForm
        defaultValue={{optionalItems: ["draft"], requiredItems: ["fixed"]}}
        schema={schema}
        onStateChange={onStateChange}
      />,
    );

    const optionalRow = container.querySelector('.schematic-form__array-row[data-sf-path="/optionalItems/0"]');
    expect(optionalRow).toBeInTheDocument();
    await user.click(within(optionalRow as HTMLElement).getByRole("button", {name: /remove/i}));

    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      expect(lastState?.data).not.toHaveProperty("optionalItems");
      expect(lastState?.data).toMatchObject({requiredItems: ["fixed"]});
    });

    const requiredRow = container.querySelector('.schematic-form__array-row[data-sf-path="/requiredItems/0"]');
    expect(requiredRow).toBeInTheDocument();
    await user.click(within(requiredRow as HTMLElement).getByRole("button", {name: /remove/i}));

    await waitFor(() => {
      expect(onStateChange.mock.calls.at(-1)?.[0].data).toEqual({requiredItems: []});
    });
  });

  test("restores uncontrolled drafts after remount", async () => {
    const user = userEvent.setup();
    const storage = createMemoryStorage();
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const schema = {
      type: "object",
      title: "Draft form",
      properties: {
        name: {
          type: "string",
          title: "Name",
          description: "Draft name.",
        },
      },
    } satisfies JsonSchema;

    const {unmount} = render(
      <SchematicForm
        schema={schema}
        persistence={{key: "draft-form", storage, debounceMs: 1000}}
        onStateChange={onStateChange}
      />,
    );

    await user.type(screen.getByLabelText("Name"), "Ada");
    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      expect(lastState?.data).toEqual({name: "Ada"});
    });

    unmount();
    expect(storage.getItem("draft-form")).toContain("Ada");

    render(<SchematicForm schema={schema} persistence={{key: "draft-form", storage, debounceMs: 1000}} />);

    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue("Ada"));
  });

  test("restores persisted multiselect enum array labels after remount", async () => {
    const user = userEvent.setup();
    const storage = createMemoryStorage();
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    storage.setItem(
      "kitchen-draft",
      JSON.stringify(
        createDraftPayload({
          schemaFingerprint: createSchemaFingerprint(kitchenSinkSchemaOld as unknown as JsonSchema),
          data: {
            channels: ["Email", "Web"],
            reviewTags: ["Accessibility", "Security"],
          },
          branchSelection: {},
          branchValueCache: {},
        }),
      ),
    );

    render(
      <SchematicForm
        schema={kitchenSinkSchemaOld}
        persistence={{key: "kitchen-draft", storage, debounceMs: 0}}
        onStateChange={onStateChange}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", {name: /email.*web.*channels/i})).toBeInTheDocument();
      expect(screen.getByRole("button", {name: /accessibility.*security.*review tags/i})).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", {name: /email.*web.*channels/i}));
    expect(await screen.findByRole("option", {name: "Email"})).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", {name: "Web"})).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", {name: /accessibility.*security.*review tags/i}));
    expect(await screen.findByRole("option", {name: "Accessibility"})).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", {name: "Security"})).toHaveAttribute("aria-selected", "true");

    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      expect(lastState?.data).toMatchObject({
        channels: ["Email", "Web"],
        reviewTags: ["Accessibility", "Security"],
      });
    });
  });

  test("clears persisted drafts only after valid submit", async () => {
    const user = userEvent.setup();
    const storage = createMemoryStorage();
    const schema = {
      type: "object",
      title: "Submit draft",
      required: ["name"],
      properties: {
        name: {
          type: "string",
          title: "Name",
          description: "Required name.",
          minLength: 1,
        },
      },
    } satisfies JsonSchema;

    const {unmount} = render(
      <SchematicForm
        defaultValue={{name: "Ada"}}
        schema={schema}
        persistence={{key: "submit-draft", storage, debounceMs: 0}}
      />,
    );

    await waitFor(() => expect(storage.getItem("submit-draft")).toContain("Ada"));
    await user.click(screen.getByRole("button", {name: "Submit"}));
    await waitFor(() => expect(storage.getItem("submit-draft")).toBeNull());

    unmount();

    const fingerprint = createSchemaFingerprint(schema);
    storage.setItem(
      "submit-draft",
      JSON.stringify(
        createDraftPayload({
          schemaFingerprint: fingerprint,
          data: {},
          branchSelection: {},
          branchValueCache: {},
        }),
      ),
    );

    render(<SchematicForm schema={schema} persistence={{key: "submit-draft", storage, debounceMs: 0}} />);

    await user.click(screen.getByRole("button", {name: "Submit"}));

    expect(storage.getItem("submit-draft")).not.toBeNull();
  });

  test("does not hydrate controlled forms over the value prop", () => {
    const storage = createMemoryStorage();
    const schema = {
      type: "object",
      title: "Controlled draft",
      properties: {
        name: {
          type: "string",
          title: "Name",
          description: "Controlled name.",
        },
      },
    } satisfies JsonSchema;
    storage.setItem(
      "controlled-draft",
      JSON.stringify(
        createDraftPayload({
          schemaFingerprint: createSchemaFingerprint(schema),
          data: {name: "Stored draft"},
          branchSelection: {},
          branchValueCache: {},
        }),
      ),
    );

    render(
      <SchematicForm
        schema={schema}
        value={{name: "Controlled value"}}
        persistence={{key: "controlled-draft", storage, debounceMs: 0}}
      />,
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Controlled value");
  });

  test("resets uncontrolled fields, branch choices, and validation UI", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const schema = {
      type: "object",
      title: "Reset form",
      required: ["name", "payment"],
      properties: {
        name: {
          type: "string",
          title: "Name",
          description: "Required name.",
          minLength: 1,
        },
        payment: {
          title: "Payment method",
          anyOf: [
            {
              type: "object",
              title: "Card",
              required: ["cardNumber"],
              properties: {
                cardNumber: {
                  type: "string",
                  title: "Card number",
                  description: "Card number.",
                },
              },
            },
            {
              type: "object",
              title: "Bank transfer",
              required: ["iban"],
              properties: {
                iban: {
                  type: "string",
                  title: "IBAN",
                  description: "IBAN.",
                },
              },
            },
          ],
        },
      },
    } satisfies JsonSchema;

    render(<SchematicForm schema={schema} onStateChange={onStateChange} />);

    await user.click(screen.getByRole("button", {name: "Submit"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please review the highlighted fields.");

    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.click(screen.getByRole("button", {name: /select an option payment method/i}));
    await user.click(await screen.findByRole("option", {name: "Card"}));
    await user.type(await screen.findByLabelText("Card number"), "4242");

    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      expect(lastState?.data).toMatchObject({
        name: "Ada",
        payment: {cardNumber: "4242"},
      });
    });

    await user.click(screen.getByRole("button", {name: /reset/i}));

    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.queryByLabelText("Card number")).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: /select an option payment method/i})).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      expect(lastState?.data).not.toHaveProperty("name");
      expect(lastState?.data).not.toHaveProperty("payment");
    });
  });

  test("replaces field descriptions with visible field errors", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} />);

    await user.click(screen.getByRole("button", {name: "Submit"}));

    const field = container.querySelector('[data-sf-path="/projectName"]');
    expect(field).toBeInTheDocument();
    expect(within(field as HTMLElement).queryByText("Short unformatted strings render as single-line inputs by default.")).not.toBeInTheDocument();
    expect(within(field as HTMLElement).getByText(/must have required property 'projectName'/i).closest(".field-error")).toHaveClass(
      "schematic-form__field-error",
    );
  });

  test("renders complex field descriptions below labels inside transparent surfaces", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} />);
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

      expect(surface).toHaveClass("surface--transparent", "schematic-form__surface");
      expect(label).toHaveClass("fieldset__legend");
      expect(description).toHaveClass("description", "schematic-form__description");
      expectBefore(label, description);
    }
  });

  test("renders dropdown descriptions in the expected semantic position without tags", () => {
    const {container} = render(
      <SchematicForm
        defaultValue={{channels: ["Email", "Web"], status: "Draft"}}
        schema={kitchenSinkSchemaOld}
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

      expect(field).toHaveClass("schematic-form__field");
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveClass("select__trigger", "select__trigger--full-width");
      expect(description).toHaveClass("description", "schematic-form__description");
      expectBefore(trigger as Element, description);
    }

    const branch = getSurface(container, "/payment");
    const branchField = branch.querySelector(".schematic-form__field");
    const branchTrigger = branchField?.querySelector(".select__trigger");
    const branchDescription = within(branch).getByText("Branching uses a dropdown and anyOf is intentionally treated as oneOf in Beta.");

    expect(branchField).toHaveClass("schematic-form__field");
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

    render(<SchematicForm schema={kitchenSinkSchemaOld} onStateChange={onStateChange} />);

    await user.click(screen.getByRole("button", {name: /select an option channels/i}));
    await user.click(await screen.findByRole("option", {name: "Email"}));

    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      expect(lastState?.data).toMatchObject({channels: ["Email"]});
    });
  });

  test("renders non-unique enum string arrays as repeatable select rows", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} onStateChange={onStateChange} />);

    await user.click(screen.getByRole("button", {name: "Add Label"}));

    const labelRow = container.querySelector('.schematic-form__array-row[data-sf-path="/labels/0"]');
    expect(labelRow).toBeInTheDocument();
    expect(within(labelRow as HTMLElement).queryByRole("checkbox", {name: "Discovery"})).not.toBeInTheDocument();

    const trigger = within(labelRow as HTMLElement).getByRole("button", {name: /select an option label #1/i});
    expect(trigger.closest(".select")).toBeInTheDocument();

    await user.click(trigger);
    await user.click(await screen.findByRole("option", {name: "Discovery"}));

    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      expect(lastState?.data).toMatchObject({labels: ["Discovery"]});
    });
  });

  test("leaves oneOf and anyOf selectors empty until a default or user selection exists", async () => {
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} onStateChange={onStateChange} />);

    expect(screen.getByRole("button", {name: /select an option payment method/i})).toBeInTheDocument();
    expect(screen.queryByLabelText(/card number/i)).not.toBeInTheDocument();

    const branch = container.querySelector('.schematic-form__branch[data-sf-path="/payment"]');
    expect(branch).toBeInTheDocument();
    expect(branch).toHaveClass("surface--transparent", "schematic-form__surface", "schematic-form__branch");
    expect(within(branch as HTMLElement).getByText("Payment method")).toHaveClass("fieldset__legend");
    const anyOfSelector = within(branch as HTMLElement).getByRole("button", {name: /select an option payment method/i});
    const oneOfSelector = screen.getByRole("button", {name: /select an option fulfillment path/i});
    const enumSelector = screen.getByRole("button", {name: /select an option status/i});
    expect(anyOfSelector).toBeInTheDocument();
    expect(anyOfSelector.closest(".select")).toHaveClass("select--secondary");
    expect(oneOfSelector.closest(".select")).toHaveClass("select--secondary");
    expect(enumSelector.closest(".select")).not.toHaveClass("select--secondary");

    await waitFor(() => expect(onStateChange).toHaveBeenCalled());
    const lastState = onStateChange.mock.calls.at(-1)?.[0];
    expect(lastState?.data).not.toHaveProperty("payment");
  });

  test("shows branch selector errors inside the branch surface and validates only the selected branch", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} onStateChange={onStateChange} />);

    await user.click(screen.getByRole("button", {name: "Submit"}));

    const branch = getSurface(container, "/payment");
    expect(within(branch).getByText(/must have required property 'payment'/i)).toBeInTheDocument();
    const invalidBranchSelector = within(branch).getByRole("button", {name: /select an option payment method/i}).closest(".select");
    expect(invalidBranchSelector).toHaveClass("schematic-form__branch-selector", "select--secondary");
    expect(invalidBranchSelector).toHaveAttribute("data-invalid", "true");

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
    expect(branchGroup).toHaveClass("schematic-form__branch-group");
    expect(branchGroup?.children[0]).toHaveClass("schematic-form__description");
    expect(branchGroup?.children[1]).toHaveClass("schematic-form__field");
    expect(branchGroup?.children[2]).toHaveClass("schematic-form__fieldset");
    await waitFor(() => expect(screen.getByLabelText("Card number")).toHaveFocus());
  });

  test("restores cached oneOf branch values without submitting inactive branch data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(state: SchematicFormState, event: React.FormEvent) => void>();
    const schema = {
      type: "object",
      title: "Payment",
      properties: {
        payment: {
          title: "Payment method",
          oneOf: [
            {
              type: "object",
              title: "Card",
              required: ["cardNumber"],
              properties: {
                cardNumber: {
                  type: "string",
                  title: "Card number",
                  description: "Card number.",
                },
              },
            },
            {
              type: "object",
              title: "Bank transfer",
              required: ["iban"],
              properties: {
                iban: {
                  type: "string",
                  title: "IBAN",
                  description: "IBAN.",
                },
              },
            },
          ],
        },
      },
    } satisfies JsonSchema;

    render(<SchematicForm schema={schema} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", {name: /select an option payment method/i}));
    await user.click(await screen.findByRole("option", {name: "Card"}));
    await user.type(screen.getByLabelText("Card number"), "411111");

    await user.click(screen.getByRole("button", {name: /card payment method/i}));
    await user.click(await screen.findByRole("option", {name: "Bank transfer"}));
    await user.type(screen.getByLabelText("IBAN"), "DE89");

    await user.click(screen.getByRole("button", {name: "Submit"}));

    expect(onSubmit).toHaveBeenCalled();
    expect(onSubmit.mock.calls.at(-1)?.[0].data).toEqual({payment: {iban: "DE89"}});

    await user.click(screen.getByRole("button", {name: /bank transfer payment method/i}));
    await user.click(await screen.findByRole("option", {name: "Card"}));

    await waitFor(() => expect(screen.getByLabelText("Card number")).toHaveValue("411111"));
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
    expect(branchGroup).toHaveClass("schematic-form__branch-group");
    expect(branchGroup?.children[0]).toHaveClass("schematic-form__field");
    expect(branchGroup?.children[1]).toHaveClass("schematic-form__fieldset");
    expect(branch.querySelectorAll(".fieldset__legend")[1]).toHaveTextContent("Pickup");
    expect(screen.getByLabelText("Store")).toBeInTheDocument();
    expect(screen.queryByLabelText("Address")).not.toBeInTheDocument();
  });

  test("adds array rows with an Add label button", async () => {
    const user = userEvent.setup();

    render(<SchematicForm schema={kitchenSinkSchemaOld} />);

    await user.click(screen.getByRole("button", {name: /add milestone/i}));

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByText("Milestone #1")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /remove/i})).toBeInTheDocument();
  });

  test("renders local $ref array items with sibling title and description", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} />);

    expect(screen.getByRole("heading", {level: 2, name: "Form Meta Schema"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /add property/i})).toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: /add property/i}));

    const item = getSurface(container, "/properties/0");
    expect(within(item).getByText("Property #1")).toBeInTheDocument();
    expect(within(item).getByText("A single recursive property definition.")).toBeInTheDocument();
    expect(within(item).getByLabelText("Key")).toBeInTheDocument();
  });

  test("validates an added local ref item that keeps its nested branch unselected", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} />);

    await user.click(screen.getByRole("button", {name: /add property/i}));

    const item = getSurface(container, "/properties/0");
    expect(within(item).getByRole("button", {name: /select an option property type/i})).toBeInTheDocument();
    expect(within(item).getByRole("switch", {name: "Required"})).not.toBeChecked();

    await user.click(screen.getByRole("button", {name: "Submit"}));

    await waitFor(() => {
      expect(within(item).getByText(/must have required property 'key'/i)).toBeInTheDocument();
      expect(within(item).getByText(/must have required property 'propertyAnnotation'/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Schema could not be compiled/i)).not.toBeInTheDocument();
  });

  test("replaces local ref array descriptions with schema-level errors", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} />);

    const schemaArray = getSurface(container, "/properties");
    expect(within(schemaArray).getByText("Array of property definitions used to build the form.")).toHaveClass(
      "schematic-form__description",
    );

    await user.click(screen.getByRole("button", {name: "Submit"}));

    expect(within(schemaArray).queryByText("Array of property definitions used to build the form.")).not.toBeInTheDocument();
    expect(within(schemaArray).getByText(/must NOT have fewer than 1 items/i).closest("[data-slot='schema-error-message']")).toHaveClass(
      "schematic-form__error-message",
    );
  });

  test("selecting a property type branch for an added local ref item does not toggle its required switch", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const {container} = render(<SchematicForm schema={kitchenSinkSchema} onStateChange={onStateChange} />);

    await user.click(screen.getByRole("button", {name: /add property/i}));
    const item = getSurface(container, "/properties/0");
    expect(within(item).getByRole("switch", {name: "Required"})).not.toBeChecked();

    await user.click(within(item).getByRole("button", {name: /select an option property type/i}));
    await user.click(await screen.findByRole("option", {name: "String"}));

    expect(within(item).getByLabelText("Default")).toBeInTheDocument();
    await waitFor(() => {
      const latestData = onStateChange.mock.calls.at(-1)?.[0].data as {properties?: Array<{propertyAnnotation?: {type?: string}}>};
      expect(latestData.properties?.[0]).toMatchObject({
        propertyAnnotation: {type: "string"},
      });
    });
    expect(within(item).getByRole("switch", {name: "Required"})).not.toBeChecked();
  });

  test("renders local $ref nodes with sibling title and description", async () => {
    const user = userEvent.setup();
    const schema = {
      type: "object",
      title: "Referenced fields",
      properties: {
        rows: {
          type: "array",
          title: "Rows",
          items: {
            $ref: "#/$defs/row",
            title: "Local row",
            description: "Local row description.",
          },
        },
      },
      $defs: {
        row: {
          type: "object",
          title: "Base row",
          description: "Base row description.",
          properties: {
            name: {type: "string", title: "Name"},
          },
        },
      },
    } satisfies JsonSchema;

    const {container} = render(<SchematicForm schema={schema} />);

    await user.click(screen.getByRole("button", {name: /add local row/i}));

    const item = getSurface(container, "/rows/0");
    expect(within(item).getByText("Local row #1")).toBeInTheDocument();
    expect(within(item).getByText("Local row description.")).toBeInTheDocument();
    expect(within(item).getByLabelText("Name")).toBeInTheDocument();
  });

  test("adds nested recursive rows through local refs without expanding infinitely", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={recursiveBranchSchema()} />);

    await user.click(screen.getByRole("button", {name: /add node/i}));
    await user.click(within(getSurface(container, "/nodes/0")).getByRole("button", {name: /select an option node #1/i}));
    await user.click(await screen.findByRole("option", {name: "Group Node"}));

    await waitFor(() => {
      expect(within(getSurface(container, "/nodes/0")).getByRole("button", {name: /add child node/i})).toBeInTheDocument();
    });

    await user.click(within(getSurface(container, "/nodes/0")).getByRole("button", {name: /add child node/i}));

    await waitFor(() => {
      const nestedItem = getSurface(container, "/nodes/0/children/0");
      expect(within(nestedItem).getByRole("button", {name: /select an option child node #1/i})).toBeInTheDocument();
    });
    const rowCount = container.querySelectorAll(".schematic-form__array-row").length;
    expect(rowCount).toBeGreaterThanOrEqual(2);
    expect(rowCount).toBeLessThan(5);
  });

  test("validates selected recursive ref branches without sibling branch noise", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={recursiveBranchSchema()} />);

    await user.click(screen.getByRole("button", {name: /add node/i}));
    await user.click(within(getSurface(container, "/nodes/0")).getByRole("button", {name: /select an option node #1/i}));
    await user.click(await screen.findByRole("option", {name: "Text Node"}));
    await user.click(screen.getByRole("button", {name: "Submit"}));

    const row = getSurface(container, "/nodes/0");
    await waitFor(() => {
      expect(within(row).getAllByText(/must have required property 'label'/i)).toHaveLength(1);
    });
    expect(within(row).queryByText(/must be object/i)).not.toBeInTheDocument();
    expect(within(row).queryByText(/must match exactly one schema in oneOf/i)).not.toBeInTheDocument();
  });

  test("shows one concise error for an unselected recursive branch", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={recursiveBranchSchema()} />);

    await user.click(screen.getByRole("button", {name: /add node/i}));
    await user.click(screen.getByRole("button", {name: "Submit"}));

    const row = getSurface(container, "/nodes/0");
    await waitFor(() => {
      expect(within(row).getAllByText(/must match exactly one schema in oneOf/i)).toHaveLength(1);
    });
    expect(within(row).queryByText(/must be object/i)).not.toBeInTheDocument();
  });

  test("validates nested selected recursive ref branches without sibling branch noise", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={recursiveBranchSchema()} />);

    await user.click(screen.getByRole("button", {name: /add node/i}));
    await user.click(within(getSurface(container, "/nodes/0")).getByRole("button", {name: /select an option node #1/i}));
    await user.click(await screen.findByRole("option", {name: "Group Node"}));
    await user.click(within(getSurface(container, "/nodes/0")).getByRole("button", {name: /add child node/i}));
    const child = getSurface(container, "/nodes/0/children/0");
    await user.click(within(child).getByRole("button", {name: /select an option child node #1/i}));
    await user.click(await screen.findByRole("option", {name: "Text Node"}));
    await user.click(screen.getByRole("button", {name: "Submit"}));

    await waitFor(() => {
      expect(within(child).getAllByText(/must have required property 'label'/i)).toHaveLength(1);
    });
    expect(within(child).queryByText(/must be object/i)).not.toBeInTheDocument();
    expect(within(child).queryByText(/must match exactly one schema in oneOf/i)).not.toBeInTheDocument();
  });

  test("uses exact property keys and generic item add labels for untitled arrays", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} />);

    const untitledMixedItems = getSurface(container, "/untitledMixedItems");

    expect(within(untitledMixedItems).getByText("untitledMixedItems")).toHaveClass("fieldset__legend");
    expect(within(untitledMixedItems).getByRole("button", {name: /^add item$/i})).toBeInTheDocument();
    expect(within(untitledMixedItems).queryByText("Untitled Mixed Items")).not.toBeInTheDocument();
  });

  test("renders mixed oneOf array items in one row surface and preserves rows when switching branches", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} onStateChange={onStateChange} />);

    await user.click(screen.getByRole("button", {name: /add mixed item/i}));

    expect(container.querySelectorAll('.schematic-form__surface[data-sf-path="/mixedItems/0"]')).toHaveLength(1);
    const item = getSurface(container, "/mixedItems/0");
    expect(item.children[0]).toHaveClass("schematic-form__fieldset");
    expect(item.children[0]).not.toHaveClass("schematic-form__branch");
    expect(within(item).getByRole("button", {name: /select an option mixed item #1/i})).toBeInTheDocument();
    expect(within(item).queryByLabelText("Label")).not.toBeInTheDocument();
    const branchGroup = item.querySelector(".schematic-form__branch-group");
    expect(branchGroup).toHaveClass("schematic-form__branch-group");
    expect(item.querySelector(".schematic-form__row-actions")).toHaveClass("schematic-form__row-actions");

    await user.click(within(item).getByRole("button", {name: /select an option mixed item #1/i}));
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

  test("validates mixed oneOf array rows against their own selected branches", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} onStateChange={onStateChange} />);

    await user.click(screen.getByRole("button", {name: /add mixed item/i}));
    await user.click(within(getSurface(container, "/mixedItems/0")).getByRole("button", {name: /select an option mixed item #1/i}));
    await user.click(await screen.findByRole("option", {name: "Boolean"}));

    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      expect(lastState?.data).toMatchObject({mixedItems: [false]});
    });

    await user.click(screen.getByRole("button", {name: /add mixed item/i}));
    await user.click(within(getSurface(container, "/mixedItems/1")).getByRole("button", {name: /select an option mixed item #2/i}));
    await user.click(await screen.findByRole("option", {name: "Object"}));

    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      const errors = lastState?.errors.join("\n") ?? "";
      expect(lastState?.data).toMatchObject({mixedItems: [false, {}]});
      expect(errors).toMatch(/mixedItems\.1\.label: must have required property 'label'/i);
      expect(errors).not.toMatch(/mixedItems\.1: must be boolean/i);
    });
  });

  test("rebases mixed oneOf array branch selections when rows move", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} />);

    await user.click(screen.getByRole("button", {name: /add mixed item/i}));
    await user.click(screen.getByRole("button", {name: /add mixed item/i}));

    const firstItem = getSurface(container, "/mixedItems/0");
    await user.click(within(firstItem).getByRole("button", {name: /select an option mixed item #1/i}));
    await user.click(await screen.findByRole("option", {name: "Enum string"}));

    await waitFor(() => {
      expect(within(getSurface(container, "/mixedItems/0")).getByRole("button", {name: /enum string mixed item #1/i})).toBeInTheDocument();
      expect(within(getSurface(container, "/mixedItems/1")).getByRole("button", {name: /select an option mixed item #2/i})).toBeInTheDocument();
    });

    await user.click(within(getSurface(container, "/mixedItems/0")).getByRole("button", {name: /move down/i}));

    await waitFor(() => {
      expect(within(getSurface(container, "/mixedItems/0")).getByRole("button", {name: /select an option mixed item #1/i})).toBeInTheDocument();
      expect(within(getSurface(container, "/mixedItems/1")).getByRole("button", {name: /enum string mixed item #2/i})).toBeInTheDocument();
    });
  });

  test("keeps persisted empty mixed oneOf array items unselected after remount", async () => {
    const storage = createMemoryStorage();
    const onStateChange = vi.fn<(state: SchematicFormState) => void>();
    storage.setItem(
      "empty-mixed-row",
      JSON.stringify(
        createDraftPayload({
          schemaFingerprint: createSchemaFingerprint(kitchenSinkSchemaOld as unknown as JsonSchema),
          data: {
            mixedItems: [null],
          },
          branchSelection: {
            "/mixedItems/0": null,
          },
          branchValueCache: {},
        }),
      ),
    );

    const {container} = render(
      <SchematicForm
        schema={kitchenSinkSchemaOld}
        persistence={{key: "empty-mixed-row", storage, debounceMs: 0}}
        onStateChange={onStateChange}
      />,
    );

    await waitFor(() => {
      expect(within(getSurface(container, "/mixedItems/0")).getByRole("button", {name: /select an option mixed item #1/i})).toBeInTheDocument();
      expect(within(getSurface(container, "/mixedItems/0")).queryByLabelText("Label")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const lastState = onStateChange.mock.calls.at(-1)?.[0];
      expect((lastState?.data as {mixedItems?: unknown[]}).mixedItems).toHaveLength(1);
      expect((lastState?.data as {mixedItems?: unknown[]}).mixedItems?.[0]).toBeUndefined();
    });
  });

  test("uses property keys for untitled object, radio, and checkbox group labels", () => {
    const schema = {
      type: "object",
      title: "Key labels",
      properties: {
        contactDetails: {
          type: "object",
          properties: {
            name: {
              type: "string",
            },
          },
        },
        deliveryChoice: {
          type: "string",
          enum: ["Pickup", "Ship"],
        },
        reviewTags: {
          type: "array",
          uniqueItems: true,
          items: {
            type: "string",
            enum: ["Design", "Security"],
          },
        },
      },
    } satisfies JsonSchema;

    render(<SchematicForm schema={schema} />);

    expect(screen.getByText("contactDetails").closest(".fieldset__legend")).toBeInTheDocument();
    expect(screen.getByText("deliveryChoice")).toHaveClass("fieldset__legend");
    expect(screen.getByText("reviewTags")).toHaveClass("fieldset__legend");
    expect(screen.getByLabelText("name")).toBeInTheDocument();
  });

  test("keeps synthetic array item legends and omits only untitled nested branch variant labels", () => {
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
                description: "Value entered for this row.",
              },
            },
          },
        },
        toggles: {
          type: "array",
          items: {
            default: false,
            oneOf: [
              {
                type: "boolean",
              },
              {
                type: "string",
              },
            ],
          },
        },
        choices: {
          type: "array",
          items: {
            default: {value: ""},
            oneOf: [
              {
                type: "object",
                properties: {
                  value: {
                    type: "string",
                  },
                },
              },
            ],
          },
        },
      },
    } satisfies JsonSchema;

    const {container} = render(<SchematicForm schema={schema} defaultValue={{rows: [{}], toggles: [false], choices: [{value: ""}]}} />);

    const objectItem = getSurface(container, "/rows/0");
    expect(within(objectItem).getByText("Item #1")).toBeInTheDocument();
    expect(within(objectItem).getByLabelText("value")).toBeInTheDocument();

    const choiceBranch = getSurface(container, "/choices/0");
    expect(Array.from(choiceBranch.querySelectorAll(".fieldset__legend")).map((legend) => legend.textContent)).toEqual(["Item #1"]);
    expect(within(choiceBranch).getByLabelText("value")).toBeInTheDocument();

    const toggleBranch = getSurface(container, "/toggles/0");
    expect(within(toggleBranch).getByText("Item #1")).toBeInTheDocument();
    expect(within(toggleBranch).getByText("Off")).toBeInTheDocument();
  });

  test("renders array item buttons inside the item surface with Gravity icons and labels", async () => {
    const user = userEvent.setup();
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} />);

    await user.click(screen.getByRole("button", {name: /add milestone/i}));

    const itemSurface = getSurface(container, "/milestones/0");
    const actions = itemSurface.querySelector(".schematic-form__row-actions");
    expect(actions).toBeInTheDocument();
    expect(actions).toHaveClass("schematic-form__row-actions");

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

  test("renders reset and submit as full-width form actions", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} />);

    const actions = container.querySelector(".schematic-form__form-actions");
    expect(actions).toBeInTheDocument();
    expect(actions).toHaveClass("schematic-form__form-actions");

    const resetButton = within(actions as HTMLElement).getByRole("button", {name: /reset/i});
    const submitButton = within(actions as HTMLElement).getByRole("button", {name: "Submit"});

    expect(resetButton).toHaveClass("button--secondary", "button--full-width");
    expect(resetButton).not.toHaveClass("button--icon-only");
    expect(resetButton.querySelector(".schematic-form__button-icon")).toBeInTheDocument();
    expect(resetButton).toHaveTextContent("Reset");
    expect(submitButton).toHaveClass("button--full-width");
    expect(submitButton.querySelector(".schematic-form__button-icon")).toBeInTheDocument();
    expectBefore(resetButton, submitButton);
  });

  test("marks submit button pending while async submit is running", async () => {
    const user = userEvent.setup();
    let resolveSubmit: () => void = () => undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const schema = {
      type: "object",
      title: "Async submit",
      properties: {
        name: {type: "string", title: "Name", default: "Ada"},
      },
    } satisfies JsonSchema;

    render(<SchematicForm schema={schema} onSubmit={onSubmit} />);

    const submitButton = screen.getByRole("button", {name: "Submit"});
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalled();
    await waitFor(() => expect(submitButton).toHaveAttribute("data-pending"));
    expect(submitButton.querySelector(".spinner")).toBeInTheDocument();
    expect(submitButton.querySelector(".schematic-form__button-icon")).not.toBeInTheDocument();

    await act(async () => {
      resolveSubmit();
    });

    await waitFor(() => expect(submitButton).not.toHaveAttribute("data-pending"));
    expect(submitButton.querySelector(".schematic-form__button-icon")).toBeInTheDocument();
  });

  test("shows required validation errors after submit", async () => {
    const user = userEvent.setup();

    render(<SchematicForm schema={kitchenSinkSchemaOld} />);

    await user.click(screen.getByRole("button", {name: "Submit"}));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please review the highlighted fields.");
    expect(screen.getAllByText(/must have required property/i).length).toBeGreaterThan(0);
  });

  test("renders date and time formats with HeroUI components", () => {
    const {container} = render(<SchematicForm schema={kitchenSinkSchemaOld} />);

    expect(container.querySelectorAll(".date-picker").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector(".time-field")).toBeInTheDocument();
    expect(container.querySelector('.schematic-form__control[type="date"]')).not.toBeInTheDocument();
    expect(container.querySelector('.schematic-form__control[type="time"]')).not.toBeInTheDocument();
    expect(container.querySelector('.schematic-form__control[type="datetime-local"]')).not.toBeInTheDocument();
  });
});
