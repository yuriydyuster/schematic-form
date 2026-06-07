import {expect, test, type Locator, type Page} from "@playwright/test";

const draftKey = "schematic-form:proto-schema-demo";
const initialPropertyCount = 6;

function getBuilderForm(page: Page): Locator {
  return page.locator("section.demo-form .schematic-form__form").first();
}

function getRootTextInput(page: Page, pointer: string): Locator {
  return getBuilderForm(page).locator(`[data-sf-path="${pointer}"]`).getByRole("textbox").first();
}

function getRootPropertiesAddButton(page: Page): Locator {
  return getBuilderForm(page)
    .locator('[data-sf-path="/properties"]')
    .getByRole("button", {name: /add property/i})
    .last();
}

function getTopLevelPropertyKeyInput(page: Page, index: number): Locator {
  return getBuilderForm(page).locator(`[data-sf-path="/properties/${index}"] [name="properties[${index}].key"]`);
}

function collectRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  return errors;
}

async function resetDemo(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), draftKey);
  await page.reload();
}

async function expectNoRuntimeErrors(errors: string[]) {
  expect(errors).toEqual([]);
}

async function addField(page: Page, index: number) {
  await getRootPropertiesAddButton(page).click();
  const row = page.locator(`[data-sf-path="/properties/${index}"]`);
  await expect(row.getByText(`Property #${index + 1}`)).toBeVisible();
  await expect(getTopLevelPropertyKeyInput(page, index)).toBeVisible();
  return row;
}

async function selectValidation(page: Page, row: Locator, validationName: string) {
  await row.getByRole("button", {name: /property type/i}).first().click();
  await page.getByRole("option", {name: validationName}).click();
  await expect(row.getByRole("button", {name: new RegExp(`${validationName} property type`, "i")})).toBeVisible();
}

test("loads the demo without browser runtime errors", async ({page}) => {
  const errors = collectRuntimeErrors(page);
  const form = getBuilderForm(page);

  await resetDemo(page);

  await expect(page.getByRole("heading", {level: 2, name: "SchematicForm Builder"})).toBeVisible();
  await expect(getRootTextInput(page, "/title")).toBeVisible();
  await expect(getRootTextInput(page, "/description")).toBeVisible();
  await expect(page.getByLabel("JSON Schema Draft")).toHaveCount(0);
  await expect(page.getByLabel("Type")).toHaveCount(0);
  await expect(page.getByLabel("Current form state")).toBeVisible();
  await expect(getRootPropertiesAddButton(page)).toBeVisible();
  await expect(page.getByText("Create your own form using this JSON schema editor.")).toBeVisible();
  await expect(getTopLevelPropertyKeyInput(page, 0)).toHaveValue("fullName");
  await expect(getTopLevelPropertyKeyInput(page, 3)).toHaveValue("company");
  await expect(getTopLevelPropertyKeyInput(page, 4)).toHaveValue("topics");
  await expect(form.locator('[data-sf-path="/properties/0"]').getByRole("button", {name: /string property type/i})).toBeVisible();
  await expect(form.locator('[data-sf-path="/properties/3"]').getByRole("button", {name: /object property type/i})).toBeVisible();
  await expect(form.locator('[data-sf-path="/properties/3/propertyAnnotation/properties"]').getByRole("button", {name: /add property/i})).toBeVisible();
  await expect(form.locator('[data-sf-path="/properties/4"]').getByRole("button", {name: /array property type/i})).toBeVisible();
  await expect(form.locator('[data-sf-path="/properties/4/propertyAnnotation/items"]').getByRole("button", {name: /string items/i})).toBeVisible();
  await expectNoRuntimeErrors(errors);
});

test("invalid submit shows the summary and focuses the first invalid field", async ({page}) => {
  const errors = collectRuntimeErrors(page);

  await resetDemo(page);
  const firstKeyInput = getBuilderForm(page).locator('[data-sf-path="/properties/0"]').getByLabel("Key");
  await firstKeyInput.fill("");
  await getBuilderForm(page).getByRole("button", {name: "Submit"}).click();

  await expect(page.getByRole("alert")).toContainText("Please review the highlighted fields.");
  await expect(firstKeyInput).toBeFocused();
  await expectNoRuntimeErrors(errors);
});

test("recursive array rows add, move, and remove while preserving sibling values", async ({page}) => {
  const errors = collectRuntimeErrors(page);

  await resetDemo(page);

  await addField(page, initialPropertyCount);
  await getTopLevelPropertyKeyInput(page, initialPropertyCount).fill("first");
  await addField(page, initialPropertyCount + 1);
  await getTopLevelPropertyKeyInput(page, initialPropertyCount + 1).fill("second");

  await page.locator(`[data-sf-path="/properties/${initialPropertyCount}"]`).getByRole("button", {name: /move down/i}).click();

  await expect(getTopLevelPropertyKeyInput(page, initialPropertyCount)).toHaveValue("second");
  await expect(getTopLevelPropertyKeyInput(page, initialPropertyCount + 1)).toHaveValue("first");

  await page.locator(`[data-sf-path="/properties/${initialPropertyCount}"]`).getByRole("button", {name: /remove/i}).click();

  const state = page.getByLabel("Current form state").locator("pre");
  await expect(state).toContainText('"key": "first"');
  await expect(state).not.toContainText('"key": "second"');
  await expectNoRuntimeErrors(errors);
});

test("branch selectors switch and validate only the active branch", async ({page}) => {
  const errors = collectRuntimeErrors(page);

  await resetDemo(page);
  const row = await addField(page, initialPropertyCount);
  await selectValidation(page, row, "Array");

  await expect(row.getByText("Items", {exact: true})).toBeVisible();
  await expect(row.getByText("Properties", {exact: true})).toHaveCount(0);

  await getBuilderForm(page).getByRole("button", {name: "Submit"}).click();

  await expect(page.getByText(/must have required property 'properties'/i)).toHaveCount(0);
  await expect(page.getByText(/must match exactly one schema/i)).toHaveCount(0);
  await expectNoRuntimeErrors(errors);
});

test("valid proto-schema submit opens a generated form preview drawer", async ({page}) => {
  const errors = collectRuntimeErrors(page);

  await resetDemo(page);
  await getRootTextInput(page, "/title").fill("Generated Customer");
  const row = await addField(page, initialPropertyCount);
  await getTopLevelPropertyKeyInput(page, initialPropertyCount).fill("customerName");
  await selectValidation(page, row, "String");
  await row.getByLabel("Title").fill("Customer name");
  await getBuilderForm(page).getByRole("button", {name: "Submit"}).click();

  const drawer = page.getByRole("dialog", {name: "Generated Form Preview"});
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("heading", {name: "Generated Form Preview"})).toHaveCount(0);
  await expect(drawer.getByRole("tab", {name: "Form"})).toHaveAttribute("aria-selected", "true");
  await expect(drawer.getByRole("heading", {level: 2, name: "Generated Customer"})).toBeVisible();
  await expect(drawer.getByLabel("Customer name")).toBeVisible();
  await drawer.getByRole("tab", {name: "JSON"}).click();
  await expect(drawer.getByText('"title": "Generated Customer"')).toBeVisible();
  await expect(drawer.getByRole("button", {name: "Copy generated JSON schema"})).toBeVisible();
  await expectNoRuntimeErrors(errors);
});

test("draft persistence restores uncontrolled form data after reload", async ({page}) => {
  const errors = collectRuntimeErrors(page);

  await resetDemo(page);
  const row = await addField(page, initialPropertyCount);
  await getTopLevelPropertyKeyInput(page, initialPropertyCount).fill("persistent_key");
  await page.waitForFunction(
    (key) => window.localStorage.getItem(key)?.includes("persistent_key"),
    draftKey,
  );

  await page.reload();

  await expect(getTopLevelPropertyKeyInput(page, initialPropertyCount)).toHaveValue("persistent_key");
  await expect(page.getByLabel("Current form state").locator("pre")).toContainText("persistent_key");
  await expectNoRuntimeErrors(errors);
});
