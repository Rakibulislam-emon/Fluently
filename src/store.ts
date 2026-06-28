/**
 * TypeMind Zustand Store
 *
 * Manages popup state: input text, output, loading, errors.
 * Includes debounce logic to prevent duplicate API calls.
 */
import { create } from "zustand";
import { rewriteText } from "./services/groq";

interface TypeMindState {
  inputText: string;
  outputText: string;
  isLoading: boolean;
  error: string | null;
  isEnabled: boolean;
  showFeedbackPopup: boolean;

  setIsEnabled: (enabled: boolean) => void;
  setShowFeedbackPopup: (show: boolean) => void;
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
  isLoading: false,
  error: null,
  isEnabled: localStorage.getItem("typemind_enabled") !== "false",
  showFeedbackPopup: localStorage.getItem("typemind_show_feedback") !== "false",

  setIsEnabled: (enabled) => {
    localStorage.setItem("typemind_enabled", enabled ? "true" : "false");
    set({ isEnabled: enabled });
  },

  setShowFeedbackPopup: (show) => {
    localStorage.setItem("typemind_show_feedback", show ? "true" : "false");
    set({ showFeedbackPopup: show });
  },

  setInput: (text) => set({ 
    inputText: text.trim(), 
    outputText: "", 
    error: null,
  }),

  processText: async () => {
    const { inputText } = get();
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
      isLoading: true,
      error: null,
    });

    try {
      const result = await rewriteText(inputText, controller.signal);

      // Only update if this request wasn't cancelled
      if (!controller.signal.aborted) {
        set({ 
          outputText: result.rewrittenText, 
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
      isLoading: false,
      error: null,
    });
  },
}));
