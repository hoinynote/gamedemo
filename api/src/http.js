class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

function json(status, body) {
  return {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    jsonBody: body,
  };
}

function parseJson(request) {
  return request.json().catch(() => {
    throw new HttpError(400, "invalid_json", "요청 형식이 올바르지 않습니다.");
  });
}

async function handle(handler, request, context) {
  try {
    return await handler(request, context);
  } catch (error) {
    if (error instanceof HttpError) return json(error.status, { error: error.code, message: error.message });
    if (error?.code === "CosmosNotConfigured" || error?.code === "MissingConfiguration") {
      return json(503, { error: "storage_unavailable", message: "랭킹 저장소가 아직 설정되지 않았습니다." });
    }
    context?.error?.("Game API request failed.", { name: error?.name || "Error" });
    return json(500, { error: "internal_error", message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." });
  }
}

module.exports = { HttpError, handle, json, parseJson };
