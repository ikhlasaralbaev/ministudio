import { describe, expect, it } from "vitest";
import {
  checkMemberChange,
  effectivePermissions,
  normalizeEmail,
  type Grant,
  type Member,
  type Perms,
} from "@/lib/permissions";

const owner = { id: "u1" };
const stranger = { id: "u9" };
const m = (o: Partial<Member>): Member => ({
  userId: "u2", email: "a@x.uz", access: "read", manageMembers: false, deleteProject: false,
  addedBy: "u1", addedAt: new Date(), ...o,
});
const P = (o: Partial<Perms>): Perms => ({
  read: true, update: false, manageMembers: false, deleteProject: false,
  isOwner: false, isAdmin: false, viaAdmin: false, ...o,
});
const g = (o: Partial<Grant>): Grant => ({ access: "read", manageMembers: false, deleteProject: false, ...o });

describe("normalizeEmail", () => {
  it("trims and lowercases", () => expect(normalizeEmail("  Ali@Gmail.COM ")).toBe("ali@gmail.com"));
});

describe("effectivePermissions", () => {
  it("owner gets everything", () =>
    expect(effectivePermissions({ ownerId: "u1", members: [] }, owner, false)).toMatchObject({
      read: true, update: true, manageMembers: true, deleteProject: true, isOwner: true, viaAdmin: false,
    }));
  it("stranger gets nothing", () => expect(effectivePermissions({ ownerId: "u1", members: [] }, stranger, false)).toBeNull());
  it("read member gets read only", () =>
    expect(effectivePermissions({ ownerId: "u1", members: [m({})] }, { id: "u2" }, false)).toMatchObject({
      read: true, update: false, manageMembers: false, deleteProject: false, isOwner: false,
    }));
  it("pending invite grants nothing", () =>
    expect(effectivePermissions({ ownerId: "u1", members: [m({ userId: null })] }, { id: "u2" }, false)).toBeNull());
  it("ownerless project hidden from non-admin", () =>
    expect(effectivePermissions({ ownerId: null, members: [] }, stranger, false)).toBeNull());
  it("admin sees ownerless project via admin", () =>
    expect(effectivePermissions({ ownerId: null, members: [] }, stranger, true)).toMatchObject({
      update: true, isAdmin: true, viaAdmin: true,
    }));
  it("admin on own project is not viaAdmin", () =>
    expect(effectivePermissions({ ownerId: "u9", members: [] }, stranger, true)).toMatchObject({ isOwner: true, viaAdmin: false }));
});

describe("checkMemberChange", () => {
  const ownerPerms = P({ isOwner: true, update: true, manageMembers: true, deleteProject: true });
  it("owner may grant anything", () =>
    expect(checkMemberChange(ownerPerms, "u1", null, g({ access: "update", deleteProject: true }))).toBeNull());
  it("needs manageMembers", () => expect(checkMemberChange(P({}), "u2", null, g({}))).not.toBeNull());
  it("read manager cannot grant update", () =>
    expect(checkMemberChange(P({ manageMembers: true }), "u2", null, g({ access: "update" }))).not.toBeNull());
  it("cannot grant deleteProject without having it", () =>
    expect(checkMemberChange(P({ manageMembers: true }), "u2", null, g({ deleteProject: true }))).not.toBeNull());
  it("may grant manageMembers it has", () =>
    expect(checkMemberChange(P({ manageMembers: true }), "u2", null, g({ manageMembers: true }))).toBeNull());
  it("cannot remove a stronger member", () =>
    expect(checkMemberChange(P({ manageMembers: true }), "u2", m({ userId: "u3", access: "update" }), null)).not.toBeNull());
  it("cannot change member holding deleteProject", () =>
    expect(checkMemberChange(P({ manageMembers: true, update: true }), "u2", m({ userId: "u3", deleteProject: true }), g({}))).not.toBeNull());
  it("anyone may leave", () => expect(checkMemberChange(P({}), "u2", m({ userId: "u2" }), null)).toBeNull());
  it("cannot raise own access", () =>
    expect(checkMemberChange(P({ manageMembers: true }), "u2", m({ userId: "u2", manageMembers: true }), g({ access: "update" }))).not.toBeNull());
  it("admin may remove anyone", () =>
    expect(checkMemberChange(P({ isAdmin: true, viaAdmin: true, update: true, manageMembers: true, deleteProject: true }), "u9", m({ access: "update", deleteProject: true }), null)).toBeNull());
});
