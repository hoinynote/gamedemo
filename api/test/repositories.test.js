const test = require("node:test");
const assert = require("node:assert/strict");
const { emptyProfile } = require("../src/profiles");
const { NoSqlProfileRepository, TableProfileRepository, entityFromProfile, profileFromEntity } = require("../src/repositories/cosmos-profile-repository");

const makeProfile = () => ({
  ...emptyProfile({ tenantId: "tenant-a", objectId: "user-a", displayName: "Kim Player" }),
  clearedStageIds: [0],
  stageRecords: { "0": { bestMs: 55_000, teamLabel: "Kim Player with Lee", updatedAt: "2026-10-28T00:00:00.000Z" } },
});

test("NoSQL adapter uses tenant partition key for every operation", async () => {
  const calls = [];
  const container = {
    item: (id, partitionKey) => ({
      read: async () => { calls.push(["read", id, partitionKey]); return { resource: makeProfile() }; },
      delete: async () => { calls.push(["delete", id, partitionKey]); },
    }),
    items: {
      upsert: async (value, options) => { calls.push(["upsert", options.partitionKey]); return { resource: value }; },
      query: (query, options) => ({ fetchAll: async () => {
        calls.push(["query", query.parameters[0].value, options.partitionKey]);
        return { resources: [makeProfile()] };
      } }),
    },
  };
  const repository = new NoSqlProfileRepository(container);
  assert.equal((await repository.get("tenant-a", "user-a")).objectId, "user-a");
  await repository.upsert(makeProfile());
  assert.equal((await repository.listByTenant("tenant-a")).length, 1);
  assert.equal(await repository.delete("tenant-a", "user-a"), true);
  assert.deepEqual(calls.map((call) => call[0]), ["read", "upsert", "query", "delete"]);
  assert.equal(calls.every((call) => call.includes("tenant-a")), true);
});

test("Table adapter stores profile under tenant partition and account row", async () => {
  let savedEntity;
  const tableClient = {
    getEntity: async (partitionKey, rowKey) => ({ ...savedEntity, partitionKey, rowKey }),
    upsertEntity: async (entity, mode) => { savedEntity = entity; assert.equal(mode, "Replace"); },
    listEntities: () => ({ async *[Symbol.asyncIterator]() { yield savedEntity; } }),
    deleteEntity: async (partitionKey, rowKey) => assert.deepEqual([partitionKey, rowKey], ["tenant-a", "user-a"]),
  };
  const repository = new TableProfileRepository(tableClient);
  await repository.upsert(makeProfile());
  assert.equal(savedEntity.partitionKey, "tenant-a");
  assert.equal(savedEntity.rowKey, "user-a");
  assert.deepEqual((await repository.get("tenant-a", "user-a")).clearedStageIds, [0]);
  assert.equal((await repository.listByTenant("tenant-a")).length, 1);
  assert.equal(await repository.delete("tenant-a", "user-a"), true);
  assert.equal("email" in savedEntity, false);
});

test("Table entity round trip validates stored JSON", () => {
  const entity = entityFromProfile(makeProfile());
  assert.equal(profileFromEntity(entity).stageRecords["0"].bestMs, 55_000);
  assert.equal(profileFromEntity({ ...entity, stageRecordsJson: "not json" }), null);
});
