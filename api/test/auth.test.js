const test = require("node:test");
const assert = require("node:assert/strict");
const { getPrincipal, parseBearerToken } = require("../src/auth");

const config = { entraTenantId: "tenant-a", entraApiAudience: "api://audience" };
const request = (authorization) => new Request("https://example.test/api/me", { headers: authorization ? { authorization } : {} });

test("bearer parsing requires a bearer token", () => {
  assert.equal(parseBearerToken(request("Bearer abc.def.ghi")), "abc.def.ghi");
  assert.throws(() => parseBearerToken(request("Basic abc")), { status: 401 });
  assert.throws(() => parseBearerToken(request()), { status: 401 });
});

test("identity comes from verified tenant and account claims", async () => {
  const principal = await getPrincipal(request("Bearer signed"), config, async (token, expected) => {
    assert.equal(token, "signed");
    assert.equal(expected.entraApiAudience, "api://audience");
    return { tid: "tenant-a", oid: "user-a", name: " Kim  Player " };
  });
  assert.deepEqual(principal, { tenantId: "tenant-a", objectId: "user-a", displayName: "Kim Player" });
});

test("invalid token, wrong tenant, and incomplete claims are rejected", async () => {
  await assert.rejects(getPrincipal(request("Bearer bad"), config, async () => { throw new Error("bad signature"); }), { status: 401 });
  await assert.rejects(getPrincipal(request("Bearer other"), config, async () => ({ tid: "other", oid: "u", name: "User" })), { status: 403 });
  await assert.rejects(getPrincipal(request("Bearer missing"), config, async () => ({ tid: "tenant-a", oid: "u" })), { status: 401 });
});
