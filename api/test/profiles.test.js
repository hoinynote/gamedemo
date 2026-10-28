const test = require("node:test");
const assert = require("node:assert/strict");
const { emptyProfile, mergeClear, mergeProgress, normalizeProfile, profileId } = require("../src/profiles");

const base = () => emptyProfile({ tenantId: "tenant-a", objectId: "user-a", displayName: "Kim Player", now: "2026-10-28T00:00:00.000Z" });

test("profile IDs use tenant and immutable object IDs", () => {
  assert.equal(profileId("tenant-a", "user-a"), "tenant-a:user-a");
  assert.throws(() => profileId("", "user-a"), /required/u);
});

test("normalization drops email and token data and keeps valid progress", () => {
  const profile = normalizeProfile({ ...base(), email: "private@example.com", accessToken: "secret", clearedStageIds: [2, 0, 2, 99, "1"] });
  assert.deepEqual(profile.clearedStageIds, [0, 2]);
  assert.equal("email" in profile, false);
  assert.equal("accessToken" in profile, false);
});

test("progress merge is monotonic", () => {
  const result = mergeProgress(base(), { clearedStageIds: [1, 0, 1, 9], bonusStageUnlocked: true });
  assert.deepEqual(result.clearedStageIds, [0, 1]);
  assert.equal(result.bonusStageUnlocked, true);
  const later = mergeProgress(result, { clearedStageIds: [], bonusStageUnlocked: false });
  assert.deepEqual(later.clearedStageIds, [0, 1]);
  assert.equal(later.bonusStageUnlocked, true);
});

test("clear merge replaces only a faster result and keeps its team label", () => {
  const first = mergeClear(base(), { stageId: 0, elapsedMs: 60_000, teamLabel: "Kim Player with Lee" }, "2026-10-28T01:00:00.000Z");
  const slower = mergeClear(first.profile, { stageId: 0, elapsedMs: 61_000, teamLabel: "Kim Player with Park" }, "2026-10-28T02:00:00.000Z");
  assert.equal(first.changed, true);
  assert.equal(slower.changed, false);
  assert.equal(slower.profile.stageRecords["0"].teamLabel, "Kim Player with Lee");
  const faster = mergeClear(slower.profile, { stageId: 0, elapsedMs: 59_000, teamLabel: "Kim Player with Park" }, "2026-10-28T03:00:00.000Z");
  assert.equal(faster.changed, true);
  assert.equal(faster.profile.stageRecords["0"].bestMs, 59_000);
});

test("clear merge rejects invalid stage, time, and team label", () => {
  assert.throws(() => mergeClear(base(), { stageId: 4, elapsedMs: 30_000, teamLabel: "Kim Player with Lee" }), /Stage ID/u);
  assert.throws(() => mergeClear(base(), { stageId: 0, elapsedMs: 999, teamLabel: "Kim Player with Lee" }), /Elapsed time/u);
  assert.throws(() => mergeClear(base(), { stageId: 0, elapsedMs: 30_000, teamLabel: "Other with Lee" }), /team label/u);
});

test("historical team labels survive a display-name change", () => {
  const profile = mergeClear(base(), { stageId: 0, elapsedMs: 40_000, teamLabel: "Kim Player with Lee" }).profile;
  const renamed = normalizeProfile({ ...profile, displayName: "Kim New Name" });
  assert.equal(renamed.stageRecords["0"].teamLabel, "Kim Player with Lee");
});
