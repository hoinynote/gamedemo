const { app } = require("@azure/functions");
const { getPrincipal } = require("../auth");
const { getConfig, getRepository } = require("../app-state");
const { MAX_CLEAR_MS, MIN_CLEAR_MS, mergeClear, normalizeProfile } = require("../profiles");
const { HttpError, handle, json, parseJson } = require("../http");

async function submitClear(request) {
  const config = getConfig();
  const principal = await getPrincipal(request, config);
  const body = await parseJson(request);
  if (!Number.isInteger(body.stageId) || body.stageId < 0 || body.stageId > 3
    || !Number.isInteger(body.elapsedMs) || body.elapsedMs < MIN_CLEAR_MS || body.elapsedMs > MAX_CLEAR_MS
    || typeof body.partnerName !== "string" || body.partnerName.trim().length < 1 || body.partnerName.trim().length > 40) {
    throw new HttpError(400, "invalid_clear", "완료 시간 또는 팀 이름이 올바르지 않습니다.");
  }
  const store = getRepository(config);
  const current = await store.get(principal.tenantId, principal.objectId);
  if (!current) throw new HttpError(409, "profile_required", "먼저 게임 지도를 열어 계정을 등록해 주세요.");
  const profile = normalizeProfile({ ...current, displayName: principal.displayName });
  if (body.stageId > 0 && body.stageId < 3
    && Array.from({ length: body.stageId }, (_, id) => id).some((id) => !profile.clearedStageIds.includes(id))) {
    throw new HttpError(403, "stage_locked", "이전 스테이지를 먼저 완료해 주세요.");
  }
  if (body.stageId === 3 && !profile.bonusStageUnlocked) {
    throw new HttpError(403, "stage_locked", "보너스 스테이지가 아직 해제되지 않았습니다.");
  }
  const teamLabel = `${principal.displayName} with ${body.partnerName.trim().replace(/\s+/gu, " ")}`;
  if (teamLabel.length > 80) throw new HttpError(400, "team_label_too_long", "팀 이름을 더 짧게 입력해 주세요.");
  const result = mergeClear(profile, { stageId: body.stageId, elapsedMs: body.elapsedMs, teamLabel });
  const saved = await store.upsert(result.profile);
  return json(200, {
    accepted: true,
    improved: result.changed,
    stageId: body.stageId,
    bestMs: saved.stageRecords[String(body.stageId)].bestMs,
    teamLabel: saved.stageRecords[String(body.stageId)].teamLabel,
    profile: {
      clearedStageIds: saved.clearedStageIds,
      bonusStageUnlocked: saved.bonusStageUnlocked,
      stageRecords: saved.stageRecords,
    },
  });
}

app.http("clear", {
  route: "clear",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: (request, context) => handle(() => submitClear(request), request, context),
});

module.exports = { submitClear };
