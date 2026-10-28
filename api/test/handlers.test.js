const test = require("node:test");
const assert = require("node:assert/strict");
const { emptyProfile } = require("../src/profiles");
const { deleteMe, getMe } = require("../src/functions/me");
const { submitClear } = require("../src/functions/clear");
const { readLeaderboard } = require("../src/functions/leaderboard");
const { saveProgress } = require("../src/functions/progress");

const config = { entraTenantId: "tenant-a", entraApiAudience: "api://a" };
const principal = { tenantId: "tenant-a", objectId: "user-a", displayName: "Kim Player" };
function setup(initial = null) {
  let stored = initial;
  const calls = [];
  const repository = {
    get: async (tenant, objectId) => { calls.push(["get", tenant, objectId]); return stored; },
    upsert: async (profile) => { calls.push(["upsert", profile.id]); stored = profile; return profile; },
    listByTenant: async (tenant) => { calls.push(["list", tenant]); return stored ? [stored] : []; },
    delete: async (tenant, objectId) => { calls.push(["delete", tenant, objectId]); stored = null; },
  };
  return {
    deps: { getConfig: () => config, getPrincipal: async () => principal, getRepository: () => repository },
    calls,
    repository,
    read: () => stored,
  };
}
const request = (method = "GET", body, url = "https://example.test/api/me") => new Request(url, {
  method,
  headers: body ? { "content-type": "application/json" } : {},
  body: body ? JSON.stringify(body) : undefined,
});

test("first signed-in map entry creates a profile without immutable IDs", async () => {
  const state = setup();
  const response = await getMe(request(), state.deps);
  assert.equal(response.status, 200);
  assert.equal(response.jsonBody.profile.displayName, "Kim Player");
  assert.equal("tenantId" in response.jsonBody.profile, false);
  assert.equal("objectId" in response.jsonBody.profile, false);
});

test("progress merge cannot unset progress and omits private identity fields", async () => {
  const state = setup(emptyProfile(principal));
  const response = await saveProgress(request("POST", { clearedStageIds: [0, 1], bonusStageUnlocked: true }), state.deps);
  assert.equal(response.status, 200);
  assert.deepEqual(response.jsonBody.profile.clearedStageIds, [0, 1]);
  assert.equal("objectId" in response.jsonBody.profile, false);
  await saveProgress(request("POST", { clearedStageIds: [], bonusStageUnlocked: false }), state.deps);
  assert.deepEqual(state.read().clearedStageIds, [0, 1]);
  assert.equal(state.read().bonusStageUnlocked, true);
});

test("clear route checks stage unlock and builds team name from verified identity", async () => {
  const state = setup(emptyProfile(principal));
  const body = { stageId: 1, elapsedMs: 50_000, partnerName: "Lee" };
  await assert.rejects(submitClear(request("POST", body), state.deps), { status: 403 });
  await saveProgress(request("POST", { clearedStageIds: [0], bonusStageUnlocked: false }), state.deps);
  const response = await submitClear(request("POST", body), state.deps);
  assert.equal(response.status, 200);
  assert.equal(response.jsonBody.teamLabel, "Kim Player with Lee");
  assert.equal(state.read().stageRecords["1"].bestMs, 50_000);
});

test("leaderboard ranks ties equally and includes an unrecorded account without IDs", async () => {
  const first = {
    ...emptyProfile(principal),
    clearedStageIds: [0],
    stageRecords: { "0": { bestMs: 44_000, teamLabel: "Kim Player with Lee", updatedAt: "2026-10-28T00:00:00.000Z" } },
  };
  const state = setup(first);
  state.repository.listByTenant = async () => [
    first,
    emptyProfile({ tenantId: "tenant-a", objectId: "user-b", displayName: "Park" }),
    { ...emptyProfile({ tenantId: "tenant-a", objectId: "user-c", displayName: "Choi" }), stageRecords: { "0": { bestMs: 44_000, teamLabel: "Choi with Han", updatedAt: "2026-10-28T00:00:00.000Z" } } },
  ];
  const response = await readLeaderboard(request("GET", undefined, "https://example.test/api/leaderboard?stageId=0"), state.deps);
  const rows = response.jsonBody.entries;
  assert.deepEqual(rows.map((row) => row.rank), [1, 1, null]);
  assert.equal(rows[2].record, null);
  assert.equal("objectId" in rows[0], false);
  assert.equal("tenantId" in rows[0], false);
  assert.equal("email" in rows[0], false);
});

test("delete route uses only the verified account identity", async () => {
  const state = setup(emptyProfile(principal));
  const response = await deleteMe(request("DELETE"), state.deps);
  assert.deepEqual(response.jsonBody, { deleted: true });
  assert.deepEqual(state.calls.at(-1), ["delete", "tenant-a", "user-a"]);
  assert.equal(state.read(), null);
});
