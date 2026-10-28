const { app } = require("@azure/functions");
const { getPrincipal } = require("../auth");
const { getConfig, getRepository } = require("../app-state");
const { emptyProfile, normalizeProfile } = require("../profiles");
const { HttpError, handle, json } = require("../http");

async function getMe(request, deps = {}) {
  const config = (deps.getConfig || getConfig)();
  const principal = await (deps.getPrincipal || getPrincipal)(request, config);
  const store = (deps.getRepository || getRepository)(config);
  const current = await store.get(principal.tenantId, principal.objectId);
  const profile = current
    ? normalizeProfile({ ...current, displayName: principal.displayName })
    : emptyProfile(principal);
  const saved = await store.upsert(profile);
  return json(200, { profile: toPublicProfile(saved) });
}

async function deleteMe(request, deps = {}) {
  const config = (deps.getConfig || getConfig)();
  const principal = await (deps.getPrincipal || getPrincipal)(request, config);
  await (deps.getRepository || getRepository)(config).delete(principal.tenantId, principal.objectId);
  return json(200, { deleted: true });
}

function toPublicProfile(profile) {
  return {
    displayName: profile.displayName,
    clearedStageIds: profile.clearedStageIds,
    bonusStageUnlocked: profile.bonusStageUnlocked,
    stageRecords: profile.stageRecords,
    updatedAt: profile.updatedAt,
  };
}

app.http("me", {
  route: "me",
  methods: ["GET", "DELETE"],
  authLevel: "anonymous",
  handler: (request, context) => handle(
    () => request.method === "DELETE" ? deleteMe(request) : getMe(request),
    request,
    context,
  ),
});

module.exports = { deleteMe, getMe, toPublicProfile };
