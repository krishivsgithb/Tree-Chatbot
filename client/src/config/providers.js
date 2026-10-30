import { Aperture, Asterisk, Sparkles, Zap } from 'lucide-react';

// ids must match the backend: gemini, anthropic, openai, grok
export const PROVIDERS = {
  gemini: {
    label: 'Gemini',
    icon: Sparkles,
    defaultModel: 'gemini-3.8-flash',
    keyUrl: 'https://aistudio.google.com/apikey',
    keySource: 'Google AI Studio'
  },
  anthropic: {
    label: 'Claude',
    icon: Asterisk,
    defaultModel: 'claude-sonnet-5-5',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keySource: 'Anthropic Console'
  },
  openai: {
    label: 'OpenAI',
    icon: Aperture,
    defaultModel: 'chat-latest',
    keyUrl: 'https://platform.openai.com/api-keys',
    keySource: 'OpenAI Platform'
  },
  grok: {
    label: 'Grok',
    icon: Zap,
    defaultModel: 'grok-4.3',
    keyUrl: 'https://console.x.ai',
    keySource: 'xAI Console'
  }
};