function getLlmConfig() {
  const endpoint = process.env.LLM_ENDPOINT;
  const model = process.env.LLM_MODEL;
  if (!endpoint || !model) {
    throw new Error(
      'LLM_ENDPOINT and LLM_MODEL must be set. Add them to .env.local (see .env.example).',
    );
  }
  return { endpoint, model };
}

export const LLM_CONFIG = {
  get endpoint() { return getLlmConfig().endpoint; },
  get model() { return getLlmConfig().model; },
};
