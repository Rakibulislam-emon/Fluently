/**
 * TypeMind Zustand Store
 *
 * Manages popup state: input text, output, loading, errors.
 * Includes debounce logic to prevent duplicate API calls.
 */
import { create } from "zustand";
import { rewriteText } from "./services/groq";

import type { RewriteMode } from "./services/groq";

type Language = "bangla" | "banglish" | "english";

interface TypeMindState {
  inputText: string;
  outputText: string;
  detectedLanguage: Language | null;
  isLoading: boolean;
  error: string | null;
  mode: RewriteMode;
  isEnabled: boolean;

  setMode: (mode: RewriteMode) => void;
  setIsEnabled: (enabled: boolean) => void;
  setInput: (text: string) => void;
  processText: () => void;
  reset: () => void;
}

let lastRequestTime = 0;
let activeController: AbortController | null = null;

const COOLDOWN_MS = 500;

export const useStore = create<TypeMindState>((set, get) => ({
  inputText: "",
  outputText: "",
  detectedLanguage: null,
  isLoading: false,
  error: null,
  mode: (localStorage.getItem("typemind_mode") as RewriteMode) || "polish",
  isEnabled: localStorage.getItem("typemind_enabled") !== "false",

  setMode: (mode) => {
    localStorage.setItem("typemind_mode", mode);
    set({ mode, outputText: "", error: null });
  },
  
  setIsEnabled: (enabled) => {
    localStorage.setItem("typemind_enabled", enabled ? "true" : "false");
    set({ isEnabled: enabled });
  },

  setInput: (text) => set({ 
    inputText: text.trim(), 
    outputText: "", 
    error: null,
    detectedLanguage: null
  }),

  processText: async () => {
    const { inputText, mode } = get();
    const now = Date.now();

    // Debounce: ignore if triggered too fast
    if (now - lastRequestTime < COOLDOWN_MS) return;
    lastRequestTime = now;

    // Cancel any in-flight request
    if (activeController) {
      activeController.abort();
    }
    activeController = new AbortController();
    const controller = activeController;

    if (!inputText) return;

    set({
      outputText: "",
      detectedLanguage: null,
      isLoading: true,
      error: null,
    });

    try {
      const result = await rewriteText(inputText, mode, controller.signal);

      // Only update if this request wasn't cancelled
      if (!controller.signal.aborted) {
        set({ 
          outputText: result.rewrittenText, 
          detectedLanguage: result.detectedLanguage.toLowerCase() as Language,
          isLoading: false 
        });
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;

      const message = err instanceof Error ? err.message : "Something went wrong";
      set({ error: message, isLoading: false });
    }
  },

  reset: () => {
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
    set({
      inputText: "",
      outputText: "",
      detectedLanguage: null,
      isLoading: false,
      error: null,
    });
  },
}));
