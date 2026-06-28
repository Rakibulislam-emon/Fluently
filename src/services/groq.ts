/**
 * Groq API Client
 *
 * Sends text to Groq for natural rewriting.
 * Model: llama-3.1-8b-instant (fast, conversational)
 * No streaming — single response for short outputs.
 */
import { sanitize } from "./sanitizer";
import { POLISH_PROMPT } from "../prompts/rewrite";

const TIMEOUT_MS = 4000;

/**
 * Get the API key from localStorage.
 * In the MVP, user sets this in the settings page.
 */
function getApiKey(): string {
  return localStorage.getItem("typemind_groq_key") || "";
}

export async function rewriteText(
  text: string,
  signal?: AbortSignal,
): Promise<{ rewrittenText: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API key not set. Open settings to add your key.");
  }

  // Support both Groq and xAI (Grok) based on the key prefix
  const isXai = apiKey.startsWith("xai-");
  const apiUrl = isXai
    ? "https://api.x.ai/v1/chat/completions"
    : "https://api.groq.com/openai/v1/chat/completions";
  const model = isXai ? "grok-4.3" : "llama-3.3-70b-versatile";

  const userMessage = text;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Combine external signal with timeout signal
  const combinedSignal = signal
    ? mergeAbortSignals(signal, controller.signal)
    : controller.signal;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { 
            role: "system", 
            content: POLISH_PROMPT 
          },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
        top_p: 0.3,
        max_tokens: 256,
        response_format: { type: "json_object" },
      }),
      signal: combinedSignal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text();
      if (response.status === 429) {
        throw new Error("Rate limit reached. Please wait a moment.");
      }
      throw new Error(`API error (${response.status}): ${errBody}`);
    }

    const data = await response.json();
    const rawOutput = data.choices?.[0]?.message?.content || "{}";
    
    let parsed;
    try {
      parsed = JSON.parse(rawOutput);
    } catch {
      // Fallback if the model fails to return valid JSON
      parsed = { 
        rewritten_text: rawOutput 
      };
    }

    return {
      rewrittenText: sanitize(parsed.rewritten_text || ""),
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  }
}

/**
 * Merge multiple AbortSignals — aborts when ANY signal fires.
 */
function mergeAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}
