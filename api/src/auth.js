const { HttpError } = require("./http");

let josePromise;
let jwksByTenant = new Map();

function parseBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+([^\s]+)$/iu.exec(header);
  if (!match) throw new HttpError(401, "unauthorized", "회사 계정으로 로그인해 주세요.");
  return match[1];
}

async function getPrincipal(request, config, verify = defaultVerifyToken) {
  const token = parseBearerToken(request);
  let claims;
  try {
    claims = await verify(token, config);
  } catch {
    throw new HttpError(401, "unauthorized", "로그인 정보가 만료되었거나 유효하지 않습니다.");
  }
  if (claims.tid !== config.entraTenantId) {
    throw new HttpError(403, "wrong_tenant", "DEX Consulting 회사 계정만 이용할 수 있습니다.");
  }
  const objectId = typeof claims.oid === "string" ? claims.oid.trim() : "";
  const displayName = typeof claims.name === "string" ? claims.name.trim().replace(/\s+/gu, " ") : "";
  if (!objectId || !displayName || displayName.length > 80) {
    throw new HttpError(401, "invalid_identity", "회사 계정의 사용자 정보를 확인할 수 없습니다.");
  }
  return { tenantId: claims.tid, objectId, displayName };
}

async function defaultVerifyToken(token, config) {
  josePromise ||= import("jose");
  const { createRemoteJWKSet, jwtVerify } = await josePromise;
  const tenantId = config.entraTenantId;
  let jwks = jwksByTenant.get(tenantId);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/discovery/v2.0/keys`));
    jwksByTenant.set(tenantId, jwks);
  }
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
    audience: config.entraApiAudience,
    algorithms: ["RS256"],
  });
  return payload;
}

module.exports = { defaultVerifyToken, getPrincipal, parseBearerToken };
