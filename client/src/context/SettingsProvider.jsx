import { useEffect, useState } from 'react';
import { SettingsContext } from './settingsContext';
import { PROVIDERS } from '../config/providers';

const STORAGE = 'treeChatbotSettings';
const EMPTY = { provider: 'gemini', keys: {}, models: {} };

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE));
    if (saved && saved.keys && PROVIDERS[saved.provider]) return saved;
    const settings = { ...EMPTY, keys: {}, models: {} };
    const oldKey = localStorage.getItem('geminiApiKey');
    if (oldKey) settings.keys.gemini = oldKey;
    return settings;
  } catch {
    return { ...EMPTY, keys: {}, models: {} };
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load);
  const [keyModalFor, setKeyModalFor] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(settings));
    } catch {
      // storage unavailable: settings last for this visit only
    }
  }, [settings]);

  const provider = settings.provider;
  const providerConfig = PROVIDERS[provider];

  const setProvider = (id) => setSettings((p) => ({ ...p, provider: id }));

  const saveKey = (id, key) =>
    setSettings((p) => ({ ...p, keys: { ...p.keys, [id]: key.trim() } }));

  const removeKey = (id) =>
    setSettings((p) => {
      const keys = { ...p.keys };
      delete keys[id];
      return { ...p, keys };
    });

  // Empty or default model = remove the override, so code defaults keep working
  const setModel = (id, value) =>
    setSettings((p) => {
      const models = { ...p.models };
      const v = value.trim();
      if (!v || v === PROVIDERS[id].defaultModel) delete models[id];
      else models[id] = v;
      return { ...p, models };
    });

  const value = {
    provider,
    providerConfig,
    apiKey: settings.keys[provider] || '',
    model: settings.models[provider] || providerConfig.defaultModel,
    keys: settings.keys,
    models: settings.models,
    hasKey: (id) => Boolean(settings.keys[id]),
    setProvider,
    saveKey,
    removeKey,
    setModel,
    keyModalFor,
    openKeyModal: (id) => setKeyModalFor(id || provider),
    closeKeyModal: () => setKeyModalFor(null)
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}