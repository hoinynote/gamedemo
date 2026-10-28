const MIN_CLEAR_MS = 1_000;
const MAX_CLEAR_MS = 7_200_000;
const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_TEAM_LABEL_LENGTH = 80;
const VALID_STAGE_IDS = new Set([0, 1, 2, 3]);

function profileId(tenantId, objectId) {
  if (typeof tenantId !== "string" || !tenantId.trim() || typeof objectId !== "string" || !objectId.trim()) {
    throw new TypeError("A tenant ID and object ID are required.");
  }
  return `${tenantId.trim()}:${objectId.trim()}`;
}

function cleanDisplayName(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/gu, " ").slice(0, MAX_DISPLAY_NAME_LENGTH);
}

function emptyProfile({ tenantId, objectId, displayName, now = new Date().toISOString() }) {
  const safeName = cleanDisplayName(displayName);
  if (!safeName) throw new TypeError("A valid display name is required.");
  return {
    id: profileId(tenantId, objectId),
    tenantId: tenantId.trim(),
    objectId: objectId.trim(),
    displayName: safeName,
    clearedStageIds: [],
    bonusStageUnlocked: false,
    stageRecords: {},
    updatedAt: now,
  };
}

function normalizeProfile(value) {
  if (!value || typeof value !== "object") return null;
  const { tenantId, objectId } = value;
  if (typeof tenantId !== "string" || !tenantId.trim() || typeof objectId !== "string" || !objectId.trim()) return null;
  const displayName = cleanDisplayName(value.displayName);
  if (!displayName) return null;
  const clearedStageIds = Array.isArray(value.clearedStageIds)
    ? [...new Set(value.clearedStageIds.filter((id) => Number.isInteger(id) && id >= 0 && id <= 2))].sort((a, b) => a - b)
    : [];
  const stageRecords = {};
  if (value.stageRecords && typeof value.stageRecords === "object" && !Array.isArray(value.stageRecords)) {
    for (const [key, record] of Object.entries(value.stageRecords)) {
      const stageId = Number(key);
      const partnerLabel = typeof record?.teamLabel === "string" ? record.teamLabel.trim().replace(/\s+/gu, " ") : "";
      const labelPrefix = `${displayName} with `;
      if (!VALID_STAGE_IDS.has(stageId) || !Number.isInteger(record?.bestMs)
        || record.bestMs < MIN_CLEAR_MS || record.bestMs > MAX_CLEAR_MS
        || !partnerLabel.startsWith(labelPrefix) || partnerLabel.length > MAX_TEAM_LABEL_LENGTH
        || partnerLabel.slice(labelPrefix.length).trim().length === 0) continue;
      stageRecords[String(stageId)] = {
        bestMs: record.bestMs,
        teamLabel: partnerLabel,
        updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date(0).toISOString(),
      };
    }
  }
  return {
    id: profileId(tenantId, objectId),
    tenantId: tenantId.trim(),
    objectId: objectId.trim(),
    displayName,
    clearedStageIds,
    bonusStageUnlocked: value.bonusStageUnlocked === true,
    stageRecords,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
  };
}

function mergeProgress(profile, { clearedStageIds = [], bonusStageUnlocked = false } = {}, now = new Date().toISOString()) {
  const current = normalizeProfile(profile);
  if (!current) throw new TypeError("A valid profile is required.");
  const incoming = Array.isArray(clearedStageIds)
    ? clearedStageIds.filter((id) => Number.isInteger(id) && id >= 0 && id <= 2)
    : [];
  return normalizeProfile({
    ...current,
    clearedStageIds: [...new Set([...current.clearedStageIds, ...incoming])],
    bonusStageUnlocked: current.bonusStageUnlocked || bonusStageUnlocked === true,
    updatedAt: now,
  });
}

function mergeClear(profile, { stageId, elapsedMs, teamLabel }, now = new Date().toISOString()) {
  const current = normalizeProfile(profile);
  if (!current) throw new TypeError("A valid profile is required.");
  if (!VALID_STAGE_IDS.has(stageId)) throw new RangeError("Stage ID must be between 0 and 3.");
  if (!Number.isInteger(elapsedMs) || elapsedMs < MIN_CLEAR_MS || elapsedMs > MAX_CLEAR_MS) {
    throw new RangeError("Elapsed time must be between 1 second and 2 hours.");
  }
  const safeLabel = typeof teamLabel === "string" ? teamLabel.trim().replace(/\s+/gu, " ") : "";
  const prefix = `${current.displayName} with `;
  if (!safeLabel.startsWith(prefix) || safeLabel.length > MAX_TEAM_LABEL_LENGTH || !safeLabel.slice(prefix.length).trim()) {
    throw new TypeError("A valid team label is required.");
  }
  const previous = current.stageRecords[String(stageId)];
  const changed = !previous || elapsedMs < previous.bestMs;
  if (changed) {
    current.stageRecords[String(stageId)] = { bestMs: elapsedMs, teamLabel: safeLabel, updatedAt: now };
  }
  if (stageId < 3) current.clearedStageIds = [...new Set([...current.clearedStageIds, stageId])].sort((a, b) => a - b);
  current.updatedAt = now;
  return { profile: normalizeProfile(current), changed };
}

module.exports = {
  MAX_CLEAR_MS,
  MIN_CLEAR_MS,
  VALID_STAGE_IDS,
  emptyProfile,
  mergeClear,
  mergeProgress,
  normalizeProfile,
  profileId,
};
