import {expect, test, type Page} from "@playwright/test";

const draftKey = "schematic-form:kitchen-sink-demo";

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

test("loads the demo without browser runtime errors", async ({page}) => {
  const errors = collectRuntimeErrors(page);

  await resetDemo(page);

  await expect(page.getByRole("heading", {level: 2, name: "Project Intake"})).toBeVisible();
  await expect(page.getByLabel("Current form state")).toBeVisible();
  await expect(page.locator(".slider").first()).toBeVisible();
  await expect(page.locator(".date-picker")).toHaveCount(2);
  await expect(page.locator(".time-field")).toBeVisible();
  await expect(page.locator('.schematic-form__control[type="date"], .schematic-form__control[type="time"], .schematic-form__control[type="datetime-local"]')).toHaveCount(0);
  await expectNoRuntimeErrors(errors);
});

test("invalid submit shows the summary and focuses the first invalid field", async ({page}) => {
  const errors = collectRuntimeErrors(page);

  await resetDemo(page);
  await page.getByRole("button", {name: "Submit"}).click();

  await expect(page.getByRole("alert")).toContainText("Please review the highlighted fields.");
  await expect(page.getByLabel("Project name")).toBeFocused();
  await expectNoRuntimeErrors(errors);
});

test("array rows add, move, and remove while preserving sibling values", async ({page}) => {
  const errors = collectRuntimeErrors(page);

  await resetDemo(page);
  const milestones = page.locator('[data-sf-path="/milestones"]');

  await milestones.getByRole("button", {name: /add milestone/i}).click();
  await page.locator('[data-sf-path="/milestones/0"]').getByLabel("Name").fill("First");
  await milestones.getByRole("button", {name: /add milestone/i}).click();
  await page.locator('[data-sf-path="/milestones/1"]').getByLabel("Name").fill("Second");

  await page.locator('[data-sf-path="/milestones/0"]').getByRole("button", {name: /move down/i}).click();

  await expect(page.locator('[data-sf-path="/milestones/0"]').getByLabel("Name")).toHaveValue("Second");
  await expect(page.locator('[data-sf-path="/milestones/1"]').getByLabel("Name")).toHaveValue("First");

  await page.locator('[data-sf-path="/milestones/0"]').getByRole("button", {name: /remove/i}).click();

  await expect(page.locator('[data-sf-path="/milestones/0"]').getByLabel("Name")).toHaveValue("First");
  await expect(page.getByLabel("Current form state").locator("pre")).toContainText('"name": "First"');
  await expectNoRuntimeErrors(errors);
});

test("branch selectors switch and validate only the active branch", async ({page}) => {
  const errors = collectRuntimeErrors(page);

  await resetDemo(page);
  await page.getByRole("button", {name: /select an option payment method/i}).click();
  await page.getByRole("option", {name: "Card"}).click();

  await expect(page.getByLabel("Card number")).toBeVisible();
  await expect(page.getByLabel("IBAN")).toHaveCount(0);

  await page.getByRole("button", {name: "Submit"}).click();

  await expect(page.locator('[data-sf-path="/payment"]').getByText(/must have required property 'cardNumber'/i).first()).toBeVisible();
  await expect(page.getByText(/must have required property 'iban'/i)).toHaveCount(0);
  await expect(page.getByText(/must match exactly one schema/i)).toHaveCount(0);
  await expectNoRuntimeErrors(errors);
});

test("draft persistence restores uncontrolled form data after reload", async ({page}) => {
  const errors = collectRuntimeErrors(page);

  await resetDemo(page);
  await page.getByLabel("Project name").fill("Persistent Project");
  await page.waitForFunction(
    (key) => window.localStorage.getItem(key)?.includes("Persistent Project"),
    draftKey,
  );

  await page.reload();

  await expect(page.getByLabel("Project name")).toHaveValue("Persistent Project");
  await expect(page.getByLabel("Current form state").locator("pre")).toContainText("Persistent Project");
  await expectNoRuntimeErrors(errors);
});
