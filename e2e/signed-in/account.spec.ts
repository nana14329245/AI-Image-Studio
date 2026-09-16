import { planById } from "../../src/lib/plans";
import { expect, test } from "../support/signedIn";

test("shows the plan, the renewal disclosure and the legal links", async ({ page }) => {
  await page.goto("/account");
  await expect(page.getByText(/^(Free|Pro|Business) PLAN$/)).toBeVisible();
  await expect(page.getByText(/ต่ออายุอัตโนมัติจนกว่าจะยกเลิก/)).toBeVisible();
  await expect(page.getByText(/ออกใบกำกับภาษีไม่ได้/)).toBeVisible();
  for (const [name, href] of [["ข้อตกลง", "/terms"], ["การยกเลิกและคืนเงิน", "/refund"], ["ความเป็นส่วนตัว", "/privacy"], ["ติดต่อเรา", "/contact"]]) {
    await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  }
});

test("switching plan asks first, and cancelling the question sends nothing", async ({ page, blockedRequests }) => {
  await page.goto("/account");
  const planText = await page.getByText(/^(Free|Pro|Business) PLAN$/).innerText();
  const current = planById(planText.replace(" PLAN", "").toLowerCase());
  test.skip(current.id === "free", "the confirmation only appears for an existing subscriber");

  const target = current.id === "pro" ? planById("business") : planById("pro");
  const dialogs: string[] = [];
  page.once("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: new RegExp(`เปลี่ยนเป็น ${target.name}`) }).click();

  await expect.poll(() => dialogs.length).toBe(1);
  expect(dialogs[0]).toContain(`เปลี่ยนเป็นแพ็ก ${target.name}`);
  expect(blockedRequests.map((request) => request.url())).toEqual([]);
});
