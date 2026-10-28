const { app } = require("@azure/functions");
const { getPrincipal } = require("../auth");
const { getConfig, getRepository } = require("../app-state");
const { VALID_STAGE_IDS } = require("../profiles");
const { HttpError, handle, json } = require("../http");

async function readLeaderboard(request, deps = {}) {
  const config = (deps.getConfig || getConfig)();
  const principal = await (deps.getPrincipal || getPrincipal)(request, config);
  const stageId = Number(new URL(request.url).searchParams.get("stageId"));
  if (!VALID_STAGE_IDS.has(stageId)) throw new HttpError(400, "invalid_stage", "스테이지 번호가 올바르지 않습니다.");
  const profiles = await (deps.getRepository || getRepository)(config).listByTenant(principal.tenantId);
  const rows = profiles.map((profile) => {
    const record = profile.stageRecords[String(stageId)] || null;
    return {
      displayName: profile.displayName,
      isCurrentUser: profile.objectId === principal.objectId,
      record: record ? { teamLabel: record.teamLabel, bestMs: record.bestMs, updatedAt: record.updatedAt } : null,
      progress: { clearedCampaignStages: profile.clearedStageIds.length, bonusStageUnlocked: profile.bonusStageUnlocked },
    };
  });
  rows.sort((a, b) => {
    if (a.record && b.record && a.record.bestMs !== b.record.bestMs) return a.record.bestMs - b.record.bestMs;
    if (a.record && !b.record) return -1;
    if (!a.record && b.record) return 1;
    return a.displayName.localeCompare(b.displayName, "ko");
  });
  let priorTime = null;
  let priorRank = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const time = rows[index].record?.bestMs ?? null;
    if (time === null) {
      rows[index].rank = null;
    } else {
      if (time !== priorTime) priorRank = index + 1;
      rows[index].rank = priorRank;
      priorTime = time;
    }
  }
  return json(200, { stageId, entries: rows });
}

app.http("leaderboard", {
  route: "leaderboard",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: (request, context) => handle(() => readLeaderboard(request), request, context),
});

module.exports = { readLeaderboard };
