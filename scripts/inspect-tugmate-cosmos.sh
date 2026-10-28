#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="grill-me-edu"
ACCOUNT_NAME="maze-rescue-ms-b7af62a9"

echo "Active Azure account and subscription (confirm this is the intended subscription):"
az account show --query '{subscription:name,subscriptionId:id,tenantId:tenantId,user:user.name}' --output table

echo
echo "Cosmos account metadata only; keys and item data are not read:"
ACCOUNT_JSON="$(az cosmosdb show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACCOUNT_NAME" \
  --query '{name:name,kind:kind,freeTier:enableFreeTier,locations:locations[].locationName,capabilities:capabilities[].name,id:id}' \
  --output json)"
printf '%s\n' "$ACCOUNT_JSON"

ACCOUNT_KIND="$(az cosmosdb show --resource-group "$RESOURCE_GROUP" --name "$ACCOUNT_NAME" --query kind --output tsv)"
case "$ACCOUNT_KIND" in
  GlobalDocumentDB)
    echo
    echo "NoSQL database/container names and partition keys (metadata only):"
    while IFS= read -r database; do
      [[ -z "$database" ]] && continue
      printf '\nDatabase: %s\n' "$database"
      az cosmosdb sql container list \
        --resource-group "$RESOURCE_GROUP" \
        --account-name "$ACCOUNT_NAME" \
        --database-name "$database" \
        --query '[].{container:name,partitionKey:resource.partitionKey.paths}' \
        --output table
      az cosmosdb sql database throughput show \
        --resource-group "$RESOURCE_GROUP" \
        --account-name "$ACCOUNT_NAME" \
        --name "$database" \
        --query '{throughput:resource.throughput,autoscaleMax:resource.autoscaleSettings.maxThroughput}' \
        --output table 2>/dev/null || true
    done < <(az cosmosdb sql database list --resource-group "$RESOURCE_GROUP" --account-name "$ACCOUNT_NAME" --query '[].name' --output tsv)
    ;;
  Table)
    echo
    echo "Table names and provisioned throughput metadata (no table items):"
    az cosmosdb table list \
      --resource-group "$RESOURCE_GROUP" \
      --account-name "$ACCOUNT_NAME" \
      --query '[].{table:name,throughput:resource.throughput}' \
      --output table
    ;;
  *)
    echo "This API kind is not supported by the Tugmate adapters. Stop; do not create or alter resources."
    exit 2
    ;;
esac

cat <<'NOTICE'

Read-only inspection complete. No database, table, container, throughput, or key was changed or printed.
The free-tier flag alone does not prove there is unused free capacity. Check current account usage and billing-owner confirmation before creating Tugmate storage. If zero additional cost cannot be verified, stop without creating anything.
NOTICE
