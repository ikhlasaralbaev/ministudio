import { describe, expect, it } from "vitest";
import { memberInput } from "@/lib/server/projects";

describe("memberInput", () => {
  it("normalizes email and keeps grant", () =>
    expect(memberInput({ email: " Ali@Gmail.com ", access: "update", manageMembers: true, deleteProject: false })).toEqual({
      ok: true,
      email: "ali@gmail.com",
      grant: { access: "update", manageMembers: true, deleteProject: false },
    }));
  it("rejects a malformed email", () => expect(memberInput({ email: "not-an-email", access: "read" }).ok).toBe(false));
  it("rejects an unknown access level", () => expect(memberInput({ email: "a@b.uz", access: "admin" }).ok).toBe(false));
  it("defaults extra rights to false", () => {
    const r = memberInput({ email: "a@b.uz", access: "read" });
    expect(r.ok && r.grant.manageMembers === false && r.grant.deleteProject === false).toBe(true);
  });
});
