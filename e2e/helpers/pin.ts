import type { Page } from "@playwright/test";

/** Type the PIN "999999" on the PinModal keypad */
export async function enterPin(page: Page, pin = "999999") {
  for (const digit of pin) {
    await page.locator(`button:has-text("${digit}")`).first().click();
  }
}
