import {render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, test, vi} from "vitest";

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

describe("SchematicForm collapsible object surfaces", () => {
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
});
