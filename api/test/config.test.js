const test = require("node:test");
const assert = require("node:assert/strict");
const { getPublicAuthConfig, readConfig } = require("../src/config");

test("public auth config exposes only tenant and client values", () => {
  const result = getPublicAuthConfig({
    ENTRA_TENANT_ID: "tenant-a",
    ENTRA_CLIENT_ID: "client-a",
    ENTRA_API_SCOPE: "api://api-a/access_as_user",
    COSMOS_KEY: "must-not-leak",
    COSMOS_TABLE_CONNECTION_STRING: "also-secret",
  });
  assert.deepEqual(result, {
    tenantId: "tenant-a",
    clientId: "client-a",
    apiScope: "api://api-a/access_as_user",
    configured: true,
  });
  assert.equal(JSON.stringify(result).includes("must-not-leak"), false);
});

test("storage config fails closed when required settings are absent or unsupported", () => {
  assert.throws(() => readConfig({}), /ENTRA_TENANT_ID/u);
  assert.throws(() => readConfig({ ENTRA_TENANT_ID: "t", ENTRA_API_AUDIENCE: "a", COSMOS_API_KIND: "mongodb" }), /nosql.*table/u);
  assert.throws(() => readConfig({ ENTRA_TENANT_ID: "t", ENTRA_API_AUDIENCE: "a", COSMOS_API_KIND: "nosql" }), /COSMOS_ENDPOINT/u);
});
