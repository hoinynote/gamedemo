const { readConfig } = require("./config");
const { createProfileRepository } = require("./repositories/cosmos-profile-repository");

let repository;

function getConfig() {
  try {
    return readConfig();
  } catch (error) {
    error.code = "MissingConfiguration";
    throw error;
  }
}

function getRepository(config = getConfig()) {
  if (!repository) repository = createProfileRepository(config);
  return repository;
}

function setRepositoryForTests(value) {
  repository = value;
}

module.exports = { getConfig, getRepository, setRepositoryForTests };
