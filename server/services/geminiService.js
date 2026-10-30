async function callGemini(apiKey, conversationHistory) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

  const contents = conversationHistory.map((msg) => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({ contents })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Gemini API error:', data.error?.message);
    const err = new Error(data.error?.message || 'Gemini API call failed');
    err.status = response.status;
    throw err;
  }

  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return reply || 'No response generated.';
}

module.exports = { callGemini };