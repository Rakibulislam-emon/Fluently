/**
 * TypeMind Popup — Main UI Component
 *
 * Minimal utility popup that appears on Ctrl+Shift+E.
 * Shows: input preview → loading → result → Replace button.
 * Keyboard: Enter = replace, Escape = close.
 */
import { useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "./store";
import { rewriteText } from "./services/groq";
import { preprocessBanglish } from "./services/preprocessor";
import Settings from "./pages/Settings";

export default function App() {
  const [view, setView] = useState<"popup" | "settings">("popup");
  const {
    inputText,
    outputText,
    detectedLanguage,
    isLoading,
    error,
    mode,
    isEnabled,
    setMode,
    setIsEnabled,
    setInput,
    processText,
    reset,
  } = useStore();

  // 1. Panel Shortcut (Ctrl+Shift+Space)
  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    let isMounted = true;
    
    listen("open-settings-panel", async () => {
      try {
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
      // ALWAYS use the absolute freshest state
      const state = useStore.getState();
      
      if (!state.isEnabled) return;
      if (state.isLoading) return;

      try {
        const [clipboardText, backup] = await invoke<[string, string]>("trigger_copy_and_read");
        
        if (!clipboardText || clipboardText.trim().length === 0) {
          return; // Silently fail if no text selected
        }

        useStore.setState({ isLoading: true, error: null });

        // Process invisibly using current mode
        const normalizedText = preprocessBanglish(clipboardText);
        const result = await rewriteText(normalizedText, state.mode);

        if (!result || result.rewrittenText.trim().length === 0) {
          throw new Error("AI returned empty text.");
        }
        
        if (result.rewrittenText.length > clipboardText.length * 5 + 100) {
           throw new Error("AI generated unusually long text. Safety lock engaged.");
        }

        await invoke("trigger_paste_and_restore", { 
          text: result.rewrittenText, 
          backup: backup 
        });

        useStore.setState({ isLoading: false });

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

  // 3. Tray Mode Switch
  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    let isMounted = true;
    
    listen<string>("set-mode-from-tray", (event) => {
      const modeStr = event.payload as "translate" | "polish";
      setMode(modeStr);
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
  }, [setMode]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        reset();
        await invoke("hide_window");
      }

      if (e.key === "Enter" && !isLoading) {
        if (outputText) {
          await handleReplace();
        } else if (inputText) {
          handleRewrite();
        }
      }
    },
    [outputText, inputText, isLoading, reset],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleRewrite = () => {
    // 1. Preprocess chaotic spelling (only really needed for translate mode, but safe to run)
    const normalized = preprocessBanglish(inputText);
    setInput(normalized); // Update UI with normalized text
    
    // 2. Process
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

  if (view === "settings") {
    return (
      <div className="popup-container" data-tauri-drag-region>
        <Settings onBack={() => setView("popup")} />
      </div>
    );
  }

  return (
    <div className="popup-container" data-tauri-drag-region>
      <button className="btn-settings" onClick={() => setView("settings")} title="Settings">
        ⚙️
      </button>

      {/* Mode Selector - Always Visible */}
      <div className="mode-selector">
        <button 
          className={`mode-btn ${mode === "translate" ? "active" : ""}`}
          onClick={() => setMode("translate")}
        >
          Translate Banglish
        </button>
        <button 
          className={`mode-btn ${mode === "polish" ? "active" : ""}`}
          onClick={() => setMode("polish")}
        >
          Fix English
        </button>
      </div>

      {/* Enable/Disable Toggle - Always Visible */}
      <div className="section" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <button 
          className="btn-replace"
          style={{ 
            background: isEnabled ? 'transparent' : '#e94560', 
            border: isEnabled ? '1px solid #333' : 'none',
            color: isEnabled ? '#aaa' : '#fff',
            width: '100%' 
          }}
          onClick={() => setIsEnabled(!isEnabled)}
        >
          {isEnabled ? "System is ON (Click to Disable)" : "System is OFF (Click to Enable)"}
        </button>
      </div>

      {!showContent && (
        <div className="popup-idle">
          <span className="idle-text">TypeMind ready</span>
          <span className="idle-hint">Select text & press Ctrl+M to auto-rewrite</span>
        </div>
      )}

      {showContent && (
        <>
          {/* Input preview */}
          {inputText && (
            <div className="section input-section">
              <span className="label">
                {detectedLanguage === "bangla"
                  ? "বাংলা"
                  : detectedLanguage === "banglish"
                    ? "Banglish"
                    : "English"}
              </span>
              <p className="input-text">{inputText}</p>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="section loading-section">
              <div className="loading-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="section error-section">
              <p className="error-text">{error}</p>
            </div>
          )}

          {/* Output */}
          {outputText && !isLoading && (
            <div className="section output-section">
              <span className="label">English</span>
              <p className="output-text">{outputText}</p>
            </div>
          )}

          {/* Actions */}
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
