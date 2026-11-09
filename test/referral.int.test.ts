// Integration test (real MongoDB, runs only when MONGODB_TEST_URI is set).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";

const uri = process.env.MONGODB_TEST_URI;

describe("referral code format", () => {
  it("accepts short lowercase codes only", async () => {
    process.env.MONGODB_URI ??= "mongodb://127.0.0.1:1";
    const { validRefCode } = await import("@/lib/server/referral");
    expect(validRefCode("a1b2c3d4")).toBe(true);
    expect(validRefCode("ABC12345")).toBe(false);
    expect(validRefCode("a b")).toBe(false);
    expect(validRefCode("../etc")).toBe(false);
    expect(validRefCode(undefined)).toBe(false);
  });
});

describe.skipIf(!uri)("referral rewards (MongoDB)", () => {
  beforeAll(() => {
    process.env.MONGODB_URI = uri;
    process.env.MONGODB_DB = "ministudio_referral_test";
    process.env.APP_SECRET = "test-secret-test-secret-1234";
    process.env.REFERRAL_CREDITS = "25";
    process.env.MAX_REFERRALS = "2";
  });
  afterAll(async () => {
    const { rawDb } = await import("@/lib/server/db");
    await rawDb().dropDatabase();
  });

  const user = async (ageDays = 0) => {
    const { usersCol } = await import("@/lib/server/users");
    const _id = new ObjectId();
    await usersCol().insertOne({ _id, email: `${_id.toHexString()}@x.uz`, name: "U", emailVerified: true, createdAt: new Date(Date.now() - ageDays * 86400e3), updatedAt: new Date() } as never);
    return _id.toHexString();
  };

  it("pays the referrer once per invited account, 25 credits", async () => {
    const { ensureCode, claimReferral, referralStats } = await import("@/lib/server/referral");
    const { getCredits } = await import("@/lib/server/credits");
    const a = await user();
    const b = await user();
    const code = await ensureCode(a);
    expect(await ensureCode(a)).toBe(code);
    const before = await getCredits(a);
    expect(await claimReferral(b, code)).toEqual({ ok: true, credits: 25 });
    expect(await getCredits(a)).toBe(before + 25);
    expect(await claimReferral(b, code)).toMatchObject({ ok: false, reason: "done" });
    expect(await getCredits(a)).toBe(before + 25);
    expect(await referralStats(a)).toMatchObject({ code, invited: 1, credits: 25 });
  });

  it("refuses yourself, an unknown code and an old account", async () => {
    const { ensureCode, claimReferral } = await import("@/lib/server/referral");
    const a = await user();
    const code = await ensureCode(a);
    expect(await claimReferral(a, code)).toMatchObject({ ok: false, reason: "self" });
    expect(await claimReferral(await user(), "zzzzzzzz")).toMatchObject({ ok: false, reason: "invalid" });
    expect(await claimReferral(await user(30), code)).toMatchObject({ ok: false, reason: "old" });
  });

  it("stops paying after MAX_REFERRALS invited accounts", async () => {
    const { ensureCode, claimReferral } = await import("@/lib/server/referral");
    const a = await user();
    const code = await ensureCode(a);
    expect((await claimReferral(await user(), code)).ok).toBe(true);
    expect((await claimReferral(await user(), code)).ok).toBe(true);
    expect(await claimReferral(await user(), code)).toMatchObject({ ok: false, reason: "limit" });
  });

  it("two racing claims for one account pay once", async () => {
    const { ensureCode, claimReferral } = await import("@/lib/server/referral");
    const { getCredits } = await import("@/lib/server/credits");
    const a = await user();
    const b = await user();
    const code = await ensureCode(a);
    const before = await getCredits(a);
    const r = await Promise.all([claimReferral(b, code), claimReferral(b, code)]);
    expect(r.filter((x) => x.ok)).toHaveLength(1);
    expect(await getCredits(a)).toBe(before + 25);
  });
});
