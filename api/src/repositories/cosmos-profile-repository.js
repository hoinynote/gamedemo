const { emptyProfile, normalizeProfile } = require("../profiles");

function entityFromProfile(profile) {
  return {
    partitionKey: profile.tenantId,
    rowKey: profile.objectId,
    tenantId: profile.tenantId,
    objectId: profile.objectId,
    displayName: profile.displayName,
    clearedStageIdsJson: JSON.stringify(profile.clearedStageIds),
    bonusStageUnlocked: profile.bonusStageUnlocked,
    stageRecordsJson: JSON.stringify(profile.stageRecords),
    updatedAt: profile.updatedAt,
  };
}

function profileFromEntity(entity) {
  try {
    return normalizeProfile({
      tenantId: entity.tenantId || entity.partitionKey,
      objectId: entity.objectId || entity.rowKey,
      displayName: entity.displayName,
      clearedStageIds: JSON.parse(entity.clearedStageIdsJson || "[]"),
      bonusStageUnlocked: entity.bonusStageUnlocked === true || entity.bonusStageUnlocked === "true",
      stageRecords: JSON.parse(entity.stageRecordsJson || "{}"),
      updatedAt: entity.updatedAt,
    });
  } catch {
    return null;
  }
}

class NoSqlProfileRepository {
  constructor(container) {
    if (!container) throw new TypeError("A Cosmos NoSQL container client is required.");
    this.container = container;
  }

  async get(tenantId, objectId) {
    try {
      const { resource } = await this.container.item(`${tenantId}:${objectId}`, tenantId).read();
      return normalizeProfile(resource);
    } catch (error) {
      if (error?.code === 404 || error?.statusCode === 404) return null;
      throw error;
    }
  }

  async upsert(profile) {
    const value = normalizeProfile(profile);
    if (!value) throw new TypeError("A valid profile is required.");
    const { resource } = await this.container.items.upsert(value, { partitionKey: value.tenantId });
    return normalizeProfile(resource || value);
  }

  async listByTenant(tenantId) {
    const query = {
      query: "SELECT * FROM c WHERE c.tenantId = @tenantId",
      parameters: [{ name: "@tenantId", value: tenantId }],
    };
    const { resources } = await this.container.items.query(query, { partitionKey: tenantId }).fetchAll();
    return resources.map(normalizeProfile).filter(Boolean);
  }

  async delete(tenantId, objectId) {
    try {
      await this.container.item(`${tenantId}:${objectId}`, tenantId).delete();
      return true;
    } catch (error) {
      if (error?.code === 404 || error?.statusCode === 404) return false;
      throw error;
    }
  }
}

class TableProfileRepository {
  constructor(tableClient) {
    if (!tableClient) throw new TypeError("A Cosmos Table client is required.");
    this.tableClient = tableClient;
  }

  async get(tenantId, objectId) {
    try {
      return profileFromEntity(await this.tableClient.getEntity(tenantId, objectId));
    } catch (error) {
      if (error?.statusCode === 404 || error?.code === "ResourceNotFound") return null;
      throw error;
    }
  }

  async upsert(profile) {
    const value = normalizeProfile(profile);
    if (!value) throw new TypeError("A valid profile is required.");
    const entity = entityFromProfile(value);
    await this.tableClient.upsertEntity(entity, "Replace");
    return value;
  }

  async listByTenant(tenantId) {
    const result = [];
    const entities = this.tableClient.listEntities({ queryOptions: { filter: `PartitionKey eq '${tenantId.replace(/'/gu, "''")}'` } });
    for await (const entity of entities) {
      const profile = profileFromEntity(entity);
      if (profile) result.push(profile);
    }
    return result;
  }

  async delete(tenantId, objectId) {
    try {
      await this.tableClient.deleteEntity(tenantId, objectId);
      return true;
    } catch (error) {
      if (error?.statusCode === 404 || error?.code === "ResourceNotFound") return false;
      throw error;
    }
  }
}

function createProfileRepository(config, clients = {}) {
  if (config.cosmosApiKind === "nosql") {
    const cosmosClient = clients.cosmosClient || new (require("@azure/cosmos").CosmosClient)({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });
    const container = clients.container || cosmosClient.database(config.cosmosDatabaseId).container(config.cosmosContainerId);
    return new NoSqlProfileRepository(container);
  }
  if (config.cosmosApiKind === "table") {
    const TableClient = require("@azure/data-tables").TableClient;
    const tableClient = clients.tableClient || TableClient.fromConnectionString(
      config.cosmosTableConnectionString,
      config.cosmosTableName,
    );
    return new TableProfileRepository(tableClient);
  }
  throw new Error("COSMOS_API_KIND must be either 'nosql' or 'table'.");
}

module.exports = {
  NoSqlProfileRepository,
  TableProfileRepository,
  createProfileRepository,
  entityFromProfile,
  profileFromEntity,
};
