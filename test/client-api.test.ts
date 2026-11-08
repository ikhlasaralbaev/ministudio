import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/client";

function stubFetch(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}
function stubLocation(pathname: string) {
  const replace = vi.fn();
  vi.stubGlobal("window", { location: { pathname, search: "", replace } });
  return replace;
}

describe("api() auth handling", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends an expired session to the login page and back", async () => {
    stubFetch(401, { error: "Kirish talab qilinadi" });
    const replace = stubLocation("/projects/abc/studio");
    await expect(api("/api/projects/abc")).rejects.toThrow();
    expect(replace).toHaveBeenCalledWith("/login?next=%2Fprojects%2Fabc%2Fstudio");
  });

  it("sends a banned user to the login page with the error notice", async () => {
    stubFetch(403, { error: "Akkaunt bloklangan", code: "banned" });
    const replace = stubLocation("/");
    await expect(api("/api/projects")).rejects.toThrow();
    expect(replace).toHaveBeenCalledWith("/login?error=1");
  });

  it("leaves ordinary 403s to the caller", async () => {
    stubFetch(403, { error: "Ruxsat yo'q" });
    const replace = stubLocation("/");
    await expect(api("/api/projects/x", { method: "PATCH" })).rejects.toThrow("Ruxsat yo'q");
    expect(replace).not.toHaveBeenCalled();
  });
});
