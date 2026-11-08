import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth", () => ({ auth: {} }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { isPlatformAdmin } from "@/lib/server/access";

describe("isPlatformAdmin", () => {
  const prev = process.env.SUPER_ADMIN_EMAILS;
  afterEach(() => {
    process.env.SUPER_ADMIN_EMAILS = prev;
  });
  it("matches listed emails case- and space-insensitively", () => {
    process.env.SUPER_ADMIN_EMAILS = " Boss@x.uz, two@x.uz ,";
    expect(isPlatformAdmin("boss@X.uz")).toBe(true);
    expect(isPlatformAdmin("two@x.uz")).toBe(true);
  });
  it("rejects empty and unlisted emails", () => {
    process.env.SUPER_ADMIN_EMAILS = " Boss@x.uz, two@x.uz ,";
    expect(isPlatformAdmin("")).toBe(false);
    expect(isPlatformAdmin("other@x.uz")).toBe(false);
  });
  it("nobody is admin when the variable is unset", () => {
    delete process.env.SUPER_ADMIN_EMAILS;
    expect(isPlatformAdmin("boss@x.uz")).toBe(false);
  });
});
