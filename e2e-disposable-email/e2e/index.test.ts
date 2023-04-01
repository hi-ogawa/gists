import { test } from "@playwright/test";
import { tinyassert } from "@hiogawa/utils";

test("disposablemail.com + gitlab.com", async ({ page, context }) => {
  //
  // obtain email
  //
  const emailPage = await context.newPage();
  await emailPage.goto("https://www.disposablemail.com");
  await emailPage.waitForFunction(() =>
    document.querySelector("#email")?.textContent?.includes("@")
  );
  const email = await emailPage.locator("#email").textContent();
  console.log({ email });
  tinyassert(email);

  //
  // signup on gitlab
  //
  const name = email.split("@")[0];
  const password = "B3txWgGXh8PYwd";
  await page.goto("https://gitlab.com/users/sign_up");
  await page.getByLabel("First name").fill(name);
  await page.getByLabel("Last name").fill(name);
  await page.getByLabel("Username").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.waitForTimeout(1000); // TODO: flaky?
  await page.getByRole("button", { name: "Register" }).click();
  await page.waitForURL("https://gitlab.com/users/identity_verification");

  //
  // find verification code from email
  //
  await emailPage.getByRole("cell", { name: "Confirm your email" }).click();
  const confirmEmailContent = await emailPage
    .frameLocator("#iframeMail")
    .locator(".wrapper-cell")
    .textContent();
  tinyassert(confirmEmailContent);
  const verificationCode = confirmEmailContent.match(/(\d{6})/)?.[1];
  console.log({ verificationCode });
  tinyassert(verificationCode);

  //
  // input verification code
  //
  await page.locator('[id="__BVID__8"]').fill(verificationCode);
  await page.getByRole("button", { name: "Verify email address" }).click();

  //
  // check welcome page
  //
  await page.waitForURL("https://gitlab.com/users/sign_up/welcome");
  await page.getByRole("heading", { name: "Welcome to GitLab" }).isVisible();
});
