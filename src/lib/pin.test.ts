import { afterEach, describe, expect, it, vi } from "vitest";
import { appPin, pinOk } from "./pin";

describe("pin", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("reads APP_PIN only when it is 4-12 digits", () => {
    vi.stubEnv("APP_PIN", "");
    expect(appPin()).toBeNull();
    vi.stubEnv("APP_PIN", "12a4");
    expect(appPin()).toBeNull();
    vi.stubEnv("APP_PIN", "123");
    expect(appPin()).toBeNull();
    vi.stubEnv("APP_PIN", "123456");
    expect(appPin()).toBe("123456");
  });
  it("compares exactly", () => {
    expect(pinOk("123456", "123456")).toBe(true);
    expect(pinOk("12345", "123456")).toBe(false);
    expect(pinOk(123456, "123456")).toBe(false);
  });
});
