/**
 * Fluently — Main UI Component
 *
 * Minimal utility popup.
 * Ctrl+Shift+Space → panel. Ctrl+M → invisible rewrite + feedback popup.
 * Feedback popup: shows diff with strikethrough/green + micro-explanation.
 * Auto-dismiss after 5s or Enter.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "./store";
import { rewriteText } from "./services/groq";
import { computeWordDiff, detectCategory, getMicroExplanation, isMeaningfulChange } from "./services/diffEngine";
import { isSensitive } from "./services/privacyFilter";
import Settings from "./pages/Settings";
import type { DiffSegment, GrammarCategory } from "./services/diffEngine";

interface FeedbackData {
  diff: DiffSegment[];
  category: GrammarCategory;
  explanation: string;
}

export default function App() {
  const [view, setView] = useState<"popup" | "settings">("popup");
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    inputText,
    outputText,
    isLoading,
    error,
    isEnabled,
    setIsEnabled,
    setInput,
    processText,
    reset,
  } = useStore();

  // Dismiss feedback popup
  const dismissFeedback = useCallback(async () => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    setFeedback(null);
    await invoke("hide_window");
  }, []);

  // 1. Panel Shortcut (Ctrl+Shift+Space)
  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    let isMounted = true;
    
    listen("open-settings-panel", async () => {
      try {
        // Clear any active feedback
        setFeedback(null);
        if (feedbackTimerRef.current) {
          clearTimeout(feedbackTimerRef.current);
          feedbackTimerRef.current = null;
        }

        setView("popup");
        await invoke("show_window");
        
        const [clipboardText, backup] = await invoke<[string, string]>("trigger_copy_and_read");
        
        if (clipboardText && clipboardText.trim().length > 0) {
          setInput(clipboardText);
          (window as any)._typemind_clipboard_backup = backup;
        }
      } catch (err) {
        console.error("Failed to open panel:", err);
      }
    }).then(fn => { 
      if (!isMounted) {
        fn();
      } else {
        unlistenFn = fn; 
      }
    });
    
    return () => { 
      isMounted = false;
      if (unlistenFn) unlistenFn(); 
    };
  }, [setInput]);

  // 2. Invisible Auto-Replace Shortcut (Ctrl+M)
  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    let isMounted = true;
    
    listen("trigger-invisible-replace", async () => {
      const state = useStore.getState();
      
      if (!state.isEnabled) return;
      if (state.isLoading) return;

      try {
        const [clipboardText, backup] = await invoke<[string, string]>("trigger_copy_and_read");
        
        if (!clipboardText || clipboardText.trim().length === 0) {
          return;
        }

        useStore.setState({ isLoading: true, error: null });

        const result = await rewriteText(clipboardText);

        if (!result || result.rewrittenText.trim().length === 0) {
          throw new Error("AI returned empty text.");
        }
        
        if (result.rewrittenText.length > clipboardText.length * 5 + 100) {
          throw new Error("AI generated unusually long text. Safety lock engaged.");
        }

        // Paste the corrected text
        await invoke("trigger_paste_and_restore", { 
          text: result.rewrittenText, 
          backup: backup 
        });

        useStore.setState({ isLoading: false });

        // --- Feedback popup logic ---
        const originalText = clipboardText.trim();
        const correctedText = result.rewrittenText.trim();

        // Skip feedback if disabled in settings (read localStorage directly to avoid stale HMR closures)
        if (localStorage.getItem("typemind_show_feedback") === "false") {
          await invoke("hide_window");
          return;
        }

        // Skip feedback if no meaningful change or sensitive content
        if (!isMeaningfulChange(originalText, correctedText)) return;
        if (isSensitive(originalText)) return;

        // Compute diff and explanation locally (free, instant)
        const diff = computeWordDiff(originalText, correctedText);
        const category = detectCategory(diff);
        const explanation = getMicroExplanation(category);

        // Show feedback popup — dismissed only by Enter or Escape
        // Small delay to let the paste operation fully complete and focus settle
        setFeedback({ diff, category, explanation });
        setView("popup");
        await new Promise(r => setTimeout(r, 300));
        await invoke("show_window");

      } catch (err) {
        console.error("Invisible replace failed:", err);
        const message = err instanceof Error ? err.message : "Something went wrong";
        useStore.setState({ error: message, isLoading: false });
        setView("popup");
        await invoke("show_window");
      }
    }).then(fn => { 
      if (!isMounted) {
        fn();
      } else {
        unlistenFn = fn; 
      }
    });
    
    return () => { 
      isMounted = false;
      if (unlistenFn) unlistenFn(); 
    };
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      // If feedback popup is showing, Enter/Escape dismisses it
      if (feedback) {
        if (e.key === "Enter" || e.key === "Escape") {
          e.preventDefault();
          await dismissFeedback();
        }
        return;
      }

      if (e.key === "Escape") {
        reset();
        await invoke("hide_window");
      }

      if (e.key === "Enter" && !isLoading) {
        if (outputText) {
          await handleReplace();
        } else if (inputText) {
          processText();
        }
      }
    },
    [outputText, inputText, isLoading, reset, processText, feedback, dismissFeedback],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleRewrite = () => {
    processText();
  };

  const handleReplace = async () => {
    if (!outputText) return;

    try {
      const backup = (window as any)._typemind_clipboard_backup || "";
      await invoke("trigger_paste_and_restore", { 
        text: outputText, 
        backup 
      });
      reset();
      await invoke("hide_window");
    } catch (err) {
      console.error("Failed to replace text:", err);
    }
  };

  const handleClose = async () => {
    reset();
    await invoke("hide_window");
  };

  const showContent = inputText || isLoading || outputText || error;

  // --- Feedback Popup View ---
  if (feedback) {
    return (
      <div className="popup-container feedback-container" data-tauri-drag-region>
        <div className="feedback-check">✓</div>
        <div className="feedback-diff">
          {feedback.diff.map((seg, i) =>
            seg.type === "unchanged" ? (
              <span key={i} className="feedback-word">{seg.text} </span>
            ) : (
              <span key={i} className="feedback-change">
                {seg.from && <span className="feedback-from">{seg.from}</span>}
                {seg.from && seg.to && " "}
                {seg.to && <span className="feedback-to">{seg.to}</span>}
                {" "}
              </span>
            )
          )}
        </div>
        <div className="feedback-explanation">
          ↳ {feedback.explanation}
        </div>
        <div className="feedback-dismiss">Enter to dismiss</div>
      </div>
    );
  }

  // --- Settings View ---
  if (view === "settings") {
    return (
      <div className="popup-container" data-tauri-drag-region>
        <Settings onBack={() => setView("popup")} />
      </div>
    );
  }

  // --- Main Popup View ---
  return (
    <div className="popup-container" data-tauri-drag-region>
      <button className="btn-settings" onClick={() => setView("settings")} title="Settings">
        ⚙️
      </button>

      {/* Enable/Disable Toggle */}
      <div className="section" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <button 
          className={`btn-replace-toggle ${!isEnabled ? "disabled" : ""}`}
          onClick={() => setIsEnabled(!isEnabled)}
        >
          {isEnabled ? "System is ON (Click to Disable)" : "System is OFF (Click to Enable)"}
        </button>
      </div>

      {!showContent && (
        <div className="popup-idle">
          <span className="idle-text">Fluently ready</span>
          <span className="idle-hint">Select text & press Ctrl+M to auto-rewrite</span>
        </div>
      )}

      {showContent && (
        <>
          {inputText && (
            <div className="section input-section">
              <span className="label">Original</span>
              <p className="input-text">{inputText}</p>
            </div>
          )}

          {isLoading && (
            <div className="section loading-section">
              <div className="loading-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}

          {error && (
            <div className="section error-section">
              <p className="error-text">{error}</p>
            </div>
          )}

          {outputText && !isLoading && (
            <div className="section output-section">
              <span className="label">Polished</span>
              <p className="output-text">{outputText}</p>
            </div>
          )}

          <div className="actions">
            {!outputText && !isLoading && (
              <button className="btn-rewrite" onClick={handleRewrite}>
                Rewrite ↵
              </button>
            )}
            {outputText && !isLoading && (
              <button className="btn-replace" onClick={handleReplace}>
                Replace ↵
              </button>
            )}
            <button className="btn-close" onClick={handleClose}>
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  );
}
