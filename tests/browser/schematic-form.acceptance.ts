import {expect, test, type Locator, type Page} from "@playwright/test";

const draftKey = "schematic-form:proto-schema-demo";

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
  await page.locator('[data-sf-path="/properties"]').getByRole("button", {name: /add property/i}).click();
  const row = page.locator(`[data-sf-path="/properties/${index}"]`);
  await expect(row.getByText(`Property #${index + 1}`)).toBeVisible();
  await expect(row.getByLabel("Key")).toBeVisible();
  return row;
}

async function selectValidation(page: Page, row: Locator, validationName: string) {
  await row.getByRole("button", {name: /property type/i}).first().click();
  await page.getByRole("option", {name: validationName}).click();
  await expect(row.getByRole("button", {name: new RegExp(`${validationName} property type`, "i")})).toBeVisible();
}

test("loads the demo without browser runtime errors", async ({page}) => {
  const errors = collectRuntimeErrors(page);

  await resetDemo(page);

  await expect(page.getByRole("heading", {level: 2, name: "Form Meta Schema"})).toBeVisible();
  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(page.getByLabel("Title")).toBeVisible();
  await expect(page.getByLabel("Description")).toBeVisible();
  await expect(page.getByLabel("JSON Schema Draft")).toHaveCount(0);
  await expect(page.getByLabel("Type")).toHaveCount(0);
  await expect(page.getByLabel("Current form state")).toBeVisible();
  await expect(page.locator('[data-sf-path="/properties"]').getByRole("button", {name: /add property/i})).toBeVisible();
  await expect(page.getByText("A meta schema for describing a form as an array of recursive field definitions.")).toBeVisible();
  await expectNoRuntimeErrors(errors);
});

test("invalid submit shows the summary and focuses the first invalid field", async ({page}) => {
  const errors = collectRuntimeErrors(page);

  await resetDemo(page);
  await page.getByRole("button", {name: "Submit"}).click();

  await expect(page.getByRole("alert")).toContainText("Please review the highlighted fields.");
  await expect(page.locator('[data-sf-path="/properties"]').getByRole("button", {name: /add property/i})).toBeFocused();
  await expectNoRuntimeErrors(errors);
});

test("recursive array rows add, move, and remove while preserving sibling values", async ({page}) => {
  const errors = collectRuntimeErrors(page);

  await resetDemo(page);

  await addField(page, 0);
  await page.locator('[data-sf-path="/properties/0"]').getByLabel("Key").fill("first");
  await addField(page, 1);
  await page.locator('[data-sf-path="/properties/1"]').getByLabel("Key").fill("second");

  await page.locator('[data-sf-path="/properties/0"]').getByRole("button", {name: /move down/i}).click();

  await expect(page.locator('[data-sf-path="/properties/0"]').getByLabel("Key")).toHaveValue("second");
  await expect(page.locator('[data-sf-path="/properties/1"]').getByLabel("Key")).toHaveValue("first");

  await page.locator('[data-sf-path="/properties/0"]').getByRole("button", {name: /remove/i}).click();

  await expect(page.locator('[data-sf-path="/properties/0"]').getByLabel("Key")).toHaveValue("first");
  await expect(page.getByLabel("Current form state").locator("pre")).toContainText('"key": "first"');
  await expectNoRuntimeErrors(errors);
});

test("branch selectors switch and validate only the active branch", async ({page}) => {
  const errors = collectRuntimeErrors(page);

  await resetDemo(page);
  const row = await addField(page, 0);
  await selectValidation(page, row, "Array");

  await expect(row.getByText("Items", {exact: true})).toBeVisible();
  await expect(page.getByText("Properties", {exact: true})).toHaveCount(0);

  await page.getByRole("button", {name: "Submit"}).click();

  await expect(page.getByText(/must have required property 'properties'/i)).toHaveCount(0);
  await expect(page.getByText(/must match exactly one schema/i)).toHaveCount(0);
  await expectNoRuntimeErrors(errors);
});

test("valid proto-schema submit opens a generated form preview drawer", async ({page}) => {
  const errors = collectRuntimeErrors(page);

  await resetDemo(page);
  await page.getByLabel("Title").fill("Generated Customer");
  const row = await addField(page, 0);
  await row.getByLabel("Key").fill("customerName");
  await selectValidation(page, row, "String");
  await row.getByLabel("Title").fill("Customer name");
  await page.getByRole("button", {name: "Submit"}).click();

  const drawer = page.getByRole("dialog", {name: "Generated Form Preview"});
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("heading", {level: 2, name: "Generated Customer"})).toBeVisible();
  await expect(drawer.getByLabel("Customer name")).toBeVisible();
  await expectNoRuntimeErrors(errors);
});

test("draft persistence restores uncontrolled form data after reload", async ({page}) => {
  const errors = collectRuntimeErrors(page);

  await resetDemo(page);
  const row = await addField(page, 0);
  await row.getByLabel("Key").fill("persistent_key");
  await page.waitForFunction(
    (key) => window.localStorage.getItem(key)?.includes("persistent_key"),
    draftKey,
  );

  await page.reload();

  await expect(page.locator('[data-sf-path="/properties/0"]').getByLabel("Key")).toHaveValue("persistent_key");
  await expect(page.getByLabel("Current form state").locator("pre")).toContainText("persistent_key");
  await expectNoRuntimeErrors(errors);
});
