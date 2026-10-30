const SYSTEM_PROMPT =
  'Write math and chemistry in plain text or Unicode (for example H₂O, CO₂, Δ, λ, cos(θ) = a·b / (‖a‖‖b‖)). ' +
  'Never use LaTeX or dollar-sign math. Use code blocks for anything that needs alignment.';

// Newest first. gemini-3.7-flash and gemini-3.5-flash are skipped on purpose:
// Google routes them to 3.8, so they would hit the same busy model.
// Check https://ai.google.dev/gemini-api/docs/deprecations now and then.
const GEMINI_CHAIN = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite'
];
const FALLBACK_STATUSES = [429, 500, 503, 504, 404]; // 504 = the model didn't answer in time
const ATTEMPT_MS = 60000; // one Gemini model gets 1 minute
const LAST_ATTEMPT_MS = 120000; // the last model (or a custom one) gets 2 minutes
const TOTAL_MS = 180000; // the whole request gives up after 3 minutes

async function post(url, headers, body, signal, timeoutMs = 120000)  {
  const start = Date.now();
  const took = () => ((Date.now() - start) / 1000).toFixed(1) + 's';
    const timeout = AbortSignal.timeout(timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([timeout, signal]) : timeout
    });
  } catch (e) {
    if (signal?.aborted) {
      const err = new Error('Request cancelled');
      err.status = 499;
      throw err;
    }
    console.log(`Provider call failed after ${took()}: ${e.cause?.code || e.name}`);
    const err = new Error('Could not reach provider: ' + (e.cause?.code || e.message));
    err.status = e.name === 'TimeoutError' ? 504 : 502;
    throw err;
  }

  const data = await response.json().catch(() => ({}));
  console.log(`Provider call finished in ${took()} (status ${response.status})`);

  if (!response.ok) {
    const raw = data.error?.message || data.error || data.message || 'Provider API call failed';
    const err = new Error(typeof raw === 'string' ? raw : JSON.stringify(raw));
    err.status = response.status;
    console.error('Provider error:', err.message);
    throw err;
  }
  return data;
}

const toChat = (history) =>
  history.map((m) => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text }));

// One attempt with one Gemini model
async function geminiOnce(apiKey, model, history, signal, timeoutMs) {
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: history.map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }))
  };

  // Less thinking = faster replies (not sent to lite models)
  if (model.startsWith('gemini-3') && !model.includes('lite')) {
    body.generationConfig = { thinkingConfig: { thinkingLevel: 'low' } };
  }

  const data = await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { 'x-goog-api-key': apiKey },
    body,
    signal,
    timeoutMs
  );
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

// Tries the requested model, then the older ones in the chain
// Tries the requested model, then the older ones in the chain
async function gemini(apiKey, model, history, signal) {
  const startAt = GEMINI_CHAIN.indexOf(model);
  const chain = startAt === -1 ? [model] : GEMINI_CHAIN.slice(startAt);
  const deadline = Date.now() + TOTAL_MS;

  let firstErr;
  for (let i = 0; i < chain.length; i++) {
    const m = chain[i];
    const left = deadline - Date.now();
    if (left < 10000) break; // not enough time left to try another model

    const isLast = i === chain.length - 1;
    const timeoutMs = Math.min(isLast ? LAST_ATTEMPT_MS : ATTEMPT_MS, left);

    try {
      const text = await geminiOnce(apiKey, m, history, signal, timeoutMs);
      return { text, model: m };
    } catch (err) {
      if (!firstErr) firstErr = err;
      if (!FALLBACK_STATUSES.includes(err.status) || signal?.aborted) throw err;
      const why =
        err.status === 504 ? `did not answer in ${timeoutMs / 1000}s` : `failed (${err.status})`;
      console.log(`Gemini ${m} ${why}, trying the next model...`);
    }
  }
  throw firstErr; // every model failed: report the first, most meaningful error
}

async function openaiStyle(baseUrl, apiKey, model, history, signal) {
  const data = await post(
    `${baseUrl}/chat/completions`,
    { Authorization: `Bearer ${apiKey}` },
    { model, messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...toChat(history)] },
    signal
  );
  return data.choices?.[0]?.message?.content;
}

async function anthropic(apiKey, model, history, signal) {
  const data = await post(
    'https://api.anthropic.com/v1/messages',
    { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    { model, max_tokens: 4096, system: SYSTEM_PROMPT, messages: toChat(history) },
    signal
  );
  return data.content?.find((b) => b.type === 'text')?.text;
}

const PROVIDERS = {
  gemini: { defaultModel: GEMINI_CHAIN[0], call: gemini },
  anthropic: { defaultModel: 'claude-sonnet-5-5', call: anthropic },
  openai: {
    defaultModel: 'chat-latest',
    call: (k, m, h, s) => openaiStyle('https://api.openai.com/v1', k, m, h, s)
  },
  grok: {
    defaultModel: 'grok-4.3',
    call: (k, m, h, s) => openaiStyle('https://api.x.ai/v1', k, m, h, s)
  }
};

// Always returns { text, model (that answered), requestedModel }
async function callModel(provider, apiKey, model, history, signal) {
  const p = PROVIDERS[provider];
  const requestedModel = model || p.defaultModel;
  const result = await p.call(apiKey, requestedModel, history, signal);

  const text = typeof result === 'string' ? result : result?.text;
  const used = typeof result === 'object' && result?.model ? result.model : requestedModel;

  return { text: text || 'No response generated.', model: used, requestedModel };
}

module.exports = { callModel, PROVIDERS };