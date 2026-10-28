const { app } = require("@azure/functions");
const { getPrincipal } = require("../auth");
const { getConfig, getRepository } = require("../app-state");
const { mergeProgress, normalizeProfile } = require("../profiles");
const { HttpError, handle, json, parseJson } = require("../http");

async function saveProgress(request, deps = {}) {
  const config = (deps.getConfig || getConfig)();
  const principal = await (deps.getPrincipal || getPrincipal)(request, config);
  const body = await parseJson(request);
  if (!Array.isArray(body.clearedStageIds) || typeof body.bonusStageUnlocked !== "boolean"
    || body.clearedStageIds.some((id) => !Number.isInteger(id) || id < 0 || id > 2)) {
    throw new HttpError(400, "invalid_progress", "스테이지 진행 정보가 올바르지 않습니다.");
  }
  const store = (deps.getRepository || getRepository)(config);
  const current = await store.get(principal.tenantId, principal.objectId) || { ...principal, ...{
    id: `${principal.tenantId}:${principal.objectId}`, clearedStageIds: [], bonusStageUnlocked: false, stageRecords: {}, updatedAt: new Date().toISOString(),
  } };
  const next = mergeProgress(normalizeProfile({ ...current, displayName: principal.displayName }), body);
  const saved = await store.upsert(next);
  return json(200, { profile: publicProfile(saved) });
}

function publicProfile(profile) {
  return {
    displayName: profile.displayName,
    clearedStageIds: profile.clearedStageIds,
    bonusStageUnlocked: profile.bonusStageUnlocked,
    stageRecords: profile.stageRecords,
    updatedAt: profile.updatedAt,
  };
}

app.http("progress", {
  route: "progress",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: (request, context) => handle(() => saveProgress(request), request, context),
});

module.exports = { publicProfile, saveProgress };
