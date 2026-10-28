const SUPPORTED_COSMOS_KINDS = new Set(["nosql", "table"]);

function readConfig(env = process.env) {
  const config = {
    entraTenantId: (env.ENTRA_TENANT_ID || "").trim(),
    entraClientId: (env.ENTRA_CLIENT_ID || "").trim(),
    entraApiAudience: (env.ENTRA_API_AUDIENCE || "").trim(),
    entraApiScope: (env.ENTRA_API_SCOPE || "").trim(),
    cosmosApiKind: (env.COSMOS_API_KIND || "").trim().toLowerCase(),
    cosmosEndpoint: (env.COSMOS_ENDPOINT || "").trim(),
    cosmosKey: (env.COSMOS_KEY || "").trim(),
    cosmosDatabaseId: (env.COSMOS_DATABASE_ID || "").trim(),
    cosmosContainerId: (env.COSMOS_CONTAINER_ID || "").trim(),
    cosmosTableConnectionString: (env.COSMOS_TABLE_CONNECTION_STRING || "").trim(),
    cosmosTableName: (env.COSMOS_TABLE_NAME || "").trim(),
  };
  const missing = [];

  for (const [name, value] of [
    ["ENTRA_TENANT_ID", config.entraTenantId],
    ["ENTRA_API_AUDIENCE", config.entraApiAudience],
    ["COSMOS_API_KIND", config.cosmosApiKind],
  ]) {
    if (!value) missing.push(name);
  }

  if (config.cosmosApiKind && !SUPPORTED_COSMOS_KINDS.has(config.cosmosApiKind)) {
    throw new Error("COSMOS_API_KIND must be either 'nosql' or 'table'.");
  }
  if (config.cosmosApiKind === "nosql") {
    for (const [name, value] of [
      ["COSMOS_ENDPOINT", config.cosmosEndpoint],
      ["COSMOS_KEY", config.cosmosKey],
      ["COSMOS_DATABASE_ID", config.cosmosDatabaseId],
      ["COSMOS_CONTAINER_ID", config.cosmosContainerId],
    ]) {
      if (!value) missing.push(name);
    }
  }
  if (config.cosmosApiKind === "table") {
    if (!config.cosmosTableConnectionString) missing.push("COSMOS_TABLE_CONNECTION_STRING");
    if (!config.cosmosTableName) missing.push("COSMOS_TABLE_NAME");
  }
  if (missing.length) throw new Error(`Missing required API settings: ${[...new Set(missing)].join(", ")}`);
  return Object.freeze(config);
}

function getPublicAuthConfig(env = process.env) {
  const tenantId = (env.ENTRA_TENANT_ID || "").trim();
  const clientId = (env.ENTRA_CLIENT_ID || "").trim();
  const apiScope = (env.ENTRA_API_SCOPE || "").trim();
  return {
    tenantId,
    clientId,
    apiScope,
    configured: Boolean(tenantId && clientId && apiScope),
  };
}

module.exports = { SUPPORTED_COSMOS_KINDS, getPublicAuthConfig, readConfig };
