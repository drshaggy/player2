export const LLM_CONFIG = {
  endpoint: process.env.LLM_ENDPOINT || 'https://api.cerebras.ai/v1/chat/completions',
  model: process.env.LLM_MODEL || 'gemma-4-31b',
};
