const { app } = require("@azure/functions");
const { getPrincipal } = require("../auth");
const { getConfig, getRepository } = require("../app-state");
const { mergeProgress, normalizeProfile } = require("../profiles");
const { HttpError, handle, json, parseJson } = require("../http");

async function saveProgress(request) {
  const config = getConfig();
  const principal = await getPrincipal(request, config);
  const body = await parseJson(request);
  if (!Array.isArray(body.clearedStageIds) || typeof body.bonusStageUnlocked !== "boolean"
    || body.clearedStageIds.some((id) => !Number.isInteger(id) || id < 0 || id > 2)) {
    throw new HttpError(400, "invalid_progress", "스테이지 진행 정보가 올바르지 않습니다.");
  }
  const store = getRepository(config);
  const current = await store.get(principal.tenantId, principal.objectId) || { ...principal, ...{
    id: `${principal.tenantId}:${principal.objectId}`, clearedStageIds: [], bonusStageUnlocked: false, stageRecords: {}, updatedAt: new Date().toISOString(),
  } };
  const next = mergeProgress(normalizeProfile({ ...current, displayName: principal.displayName }), body);
  return json(200, { profile: await store.upsert(next) });
}

app.http("progress", {
  route: "progress",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: (request, context) => handle(() => saveProgress(request), request, context),
});

module.exports = { saveProgress };
