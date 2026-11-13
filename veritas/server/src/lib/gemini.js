const DEFAULT_MODELS = ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
let working = null;

async function call(model, system, prompt, timeoutMs) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) { const e = new Error(`Gemini ${res.status}`); e.status = res.status; throw e; }
    const data = await res.json();
    const out = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    return JSON.parse(out.replace(/^```json|```$/g, '').trim());
  } finally { clearTimeout(t); }
}

// Returns parsed JSON or throws. Tries configured model, falls back on 404, retries once on bad JSON.
export async function askGemini(system, prompt) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  const models = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : working ? [working] : DEFAULT_MODELS;
  let lastErr;
  for (const m of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try { const r = await call(m, system, prompt, 30000); working = m; return { json: r, model: m }; }
      catch (e) { lastErr = e; if (e.status === 404 || e.status === 400) break; }
    }
  }
  throw lastErr || new Error('Gemini failed');
}
