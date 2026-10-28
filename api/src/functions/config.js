const { app } = require("@azure/functions");
const { getPublicAuthConfig } = require("../config");
const { handle, json } = require("../http");

app.http("publicConfig", {
  route: "config",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: (request, context) => handle(async () => json(200, getPublicAuthConfig()), request, context),
});
