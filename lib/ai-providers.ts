/**
 * AI Provider Configuration and Abstraction Layer
 * Supports: OpenAI, Anthropic Claude, Google Gemini, DeepSeek, OpenRouter
 */

import OpenAI from 'openai';
import type { AIProvider, AIProviderConfig, AIModel, AISettings } from '@/types';

// ============================================
// Provider Configurations
// ============================================

export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o and GPT-4o-mini models',
    baseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    apiKeyEnvVar: 'OPENAI_API_KEY',
    supportsStreaming: true,
    isOpenAICompatible: true,
    docsUrl: 'https://platform.openai.com/api-keys',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Most capable model, best for complex tasks',
        contextWindow: 128000,
        maxOutput: 16384,
        inputPricePerMillion: 2.50,
        outputPricePerMillion: 10.00,
        supportsStreaming: true,
        recommended: true,
        supportsToolUse: true,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Fast and affordable, great for most tasks',
        contextWindow: 128000,
        maxOutput: 16384,
        inputPricePerMillion: 0.15,
        outputPricePerMillion: 0.60,
        supportsStreaming: true,
        supportsToolUse: true,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Previous generation, still very capable',
        contextWindow: 128000,
        maxOutput: 4096,
        inputPricePerMillion: 10.00,
        outputPricePerMillion: 30.00,
        supportsStreaming: true,
        supportsToolUse: true,
      },
    ],
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Claude Sonnet and Haiku models',
    baseUrl: 'https://api.anthropic.com/v1',
    requiresApiKey: true,
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    supportsStreaming: true,
    isOpenAICompatible: false, // Uses different SDK
    docsUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        description: 'Balanced performance and cost, recommended',
        contextWindow: 200000,
        maxOutput: 8192,
        inputPricePerMillion: 3.00,
        outputPricePerMillion: 15.00,
        supportsStreaming: true,
        recommended: true,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        description: 'Fast and affordable',
        contextWindow: 200000,
        maxOutput: 8192,
        inputPricePerMillion: 1.00,
        outputPricePerMillion: 5.00,
        supportsStreaming: true,
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Most capable Claude model',
        contextWindow: 200000,
        maxOutput: 4096,
        inputPricePerMillion: 15.00,
        outputPricePerMillion: 75.00,
        supportsStreaming: true,
      },
    ],
  },

  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini Pro and Flash models with generous free tier',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/',
    requiresApiKey: true,
    apiKeyEnvVar: 'GEMINI_API_KEY',
    supportsStreaming: true,
    isOpenAICompatible: false,
    docsUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: 'Google\'s capable and versatile text model. (Most stable default)',
        contextWindow: 30720, // Common context window for gemini-pro
        maxOutput: 2048, // Common max output for gemini-pro
        inputPricePerMillion: 0.25, // Placeholder/estimated free tier pricing
        outputPricePerMillion: 0.50, // Placeholder/estimated free tier pricing
        supportsStreaming: true,
        recommended: true,
        supportsToolUse: true,
      },
    ],
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Powerful open-weight models, very affordable',
    baseUrl: 'https://api.deepseek.com',
    requiresApiKey: true,
    apiKeyEnvVar: 'DEEPSEEK_API_KEY',
    supportsStreaming: true,
    isOpenAICompatible: true, // Uses OpenAI-compatible API!
    docsUrl: 'https://platform.deepseek.com/api_keys',
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        description: 'General chat model, very affordable',
        contextWindow: 64000,
        maxOutput: 4096,
        inputPricePerMillion: 0.14,
        outputPricePerMillion: 0.28,
        supportsStreaming: true,
        recommended: true,
        supportsToolUse: true,
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner (R1)',
        description: 'Advanced reasoning model',
        contextWindow: 64000,
        maxOutput: 8192,
        inputPricePerMillion: 0.55,
        outputPricePerMillion: 2.19,
        supportsStreaming: true,
        supportsToolUse: true,
      },
    ],
  },

  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access 500+ models from 60+ providers through one API',
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresApiKey: true,
    apiKeyEnvVar: 'OPENROUTER_API_KEY',
    supportsStreaming: true,
    isOpenAICompatible: true, // Uses OpenAI-compatible API!
    docsUrl: 'https://openrouter.ai/keys',
    models: [
      {
        id: 'mistralai/mistral-small-3.1-24b',
        name: 'Mistral Small 3.1 24B (via OpenRouter)',
        description: 'Upgraded variant of Mistral Small 3 with advanced multimodal capabilities.',
        contextWindow: 128000,
        maxOutput: 8192,
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        supportsStreaming: true,
        recommended: true,
        supportsToolUse: true,
      },
      {
        id: 'google/gemma-3-4b-it',
        name: 'Gemma 3 4B (via OpenRouter)',
        description: 'Gemma 3 model with multimodality, vision-language input, and text outputs.',
        contextWindow: 33000,
        maxOutput: 4096,
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        supportsStreaming: true,
        supportsToolUse: true,
      },
      {
        id: 'google/gemma-3-12b-it',
        name: 'Gemma 3 12B (via OpenRouter)',
        description: 'Second largest Gemma 3 model with multimodality, vision-language input, and text outputs.',
        contextWindow: 33000,
        maxOutput: 4096,
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        supportsStreaming: true,
        supportsToolUse: true,
      },
      {
        id: 'google/gemma-3-27b-it',
        name: 'Gemma 3 27B (via OpenRouter)',
        description: 'Google\'s latest open source Gemma 3 model, successor to Gemma 2, with multimodality.',
        contextWindow: 131072,
        maxOutput: 4096,
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        supportsStreaming: true,
        supportsToolUse: true,
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B Instruct (via OpenRouter)',
        description: 'Multilingual large language model optimized for dialogue use cases.',
        contextWindow: 128000,
        maxOutput: 4096,
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        supportsStreaming: true,
        supportsToolUse: false,
      },
      {
        id: 'meta-llama/llama-3.2-3b-instruct',
        name: 'Llama 3.2 3B Instruct (via OpenRouter)',
        description: 'Multilingual large language model optimized for advanced NLP tasks.',
        contextWindow: 131072,
        maxOutput: 4096,
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        supportsStreaming: true,
        supportsToolUse: false,
      },
      {
        id: 'nousresearch/hermes-3-405b-instruct',
        name: 'Hermes 3 405B Instruct (via OpenRouter)',
        description: 'Generalist language model with advanced agentic capabilities and improved roleplaying.',
        contextWindow: 128000, // Common large context
        maxOutput: 4096,
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        supportsStreaming: true,
        supportsToolUse: true,
      },
    ],
  },
};

// ============================================
// Default Settings
// ============================================

export const DEFAULT_AI_SETTINGS: AISettings = {
  defaultProvider: 'openai',
  defaultModel: 'gpt-4o',
  apiKeys: {},
  temperature: 0.8,
  maxTokens: 2000,
};

// ============================================
// Provider Client Factory
// ============================================

export function createProviderClient(
  provider: AIProvider,
  apiKey: string
): OpenAI {
  const config = AI_PROVIDERS[provider];

  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  // For Anthropic, we need special handling (different SDK)
  // But we'll use a compatibility approach for now
  if (provider === 'anthropic') {
    // Anthropic has an OpenAI-compatible endpoint at messages API
    // We'll handle this specially in the chat route
    throw new Error('Anthropic requires special handling - use createAnthropicClient');
  }

  // All other providers use OpenAI-compatible API
  return new OpenAI({
    apiKey,
    baseURL: config.baseUrl,
    defaultHeaders: provider === 'openrouter' ? {
      'HTTP-Referer': 'https://infiniterealms.app',
      'X-Title': 'Infinite Realms',
    } : undefined,
  });
}

// ============================================
// Get Provider Info
// ============================================

export function getProviderConfig(provider: AIProvider): AIProviderConfig {
  const config = AI_PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return config;
}

export function getModelConfig(provider: AIProvider, modelId: string): AIModel | undefined {
  const config = AI_PROVIDERS[provider];
  return config?.models.find(m => m.id === modelId);
}

export function getDefaultModel(provider: AIProvider): AIModel {
  const config = AI_PROVIDERS[provider];
  const recommended = config.models.find(m => m.recommended);
  return recommended || config.models[0];
}

export function getAllProviders(): AIProviderConfig[] {
  return Object.values(AI_PROVIDERS);
}

// ============================================
// API Key Helpers
// ============================================

export function getApiKeyFromEnv(provider: AIProvider): string | undefined {
  const config = AI_PROVIDERS[provider];
  return process.env[config.apiKeyEnvVar];
}

export function validateApiKey(provider: AIProvider, apiKey: string): boolean {
  // Basic validation - check format
  if (!apiKey || apiKey.trim().length < 10) {
    return false;
  }

  // Provider-specific prefix validation
  switch (provider) {
    case 'openai':
      return apiKey.startsWith('sk-');
    case 'anthropic':
      return apiKey.startsWith('sk-ant-');
    case 'openrouter':
      return apiKey.startsWith('sk-or-');
    case 'gemini':
      return apiKey.startsWith('AI'); // Google API keys typically start with AI
    case 'deepseek':
      return apiKey.startsWith('sk-'); // DeepSeek uses sk- prefix too
    default:
      return true;
  }
}
