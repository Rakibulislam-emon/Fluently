import { useState, useEffect } from "react";
import { useStore } from "../store";

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const { showFeedbackPopup, setShowFeedbackPopup } = useStore();

  useEffect(() => {
    const key = localStorage.getItem("typemind_groq_key") || "";
    setApiKey(key);
  }, []);

  const handleSave = () => {
    const key = apiKey.trim();
    
    if (key && !key.startsWith("gsk_") && !key.startsWith("xai-")) {
      setError("Keys usually start with 'gsk_' (Groq) or 'xai-' (xAI). Double check your key.");
    } else {
      setError("");
    }

    localStorage.setItem("typemind_groq_key", key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button className="btn-back" onClick={onBack}>
          ← Back
        </button>
        <span className="settings-title">Settings</span>
      </div>

      <div className="settings-content">
        <div className="form-group">
          <label htmlFor="apiKey">Groq or xAI API Key</label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="gsk_... or xai-..."
            className="input-api-key"
          />
          <p className="help-text">
            Supports <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">Groq</a> or <a href="https://console.x.ai" target="_blank" rel="noreferrer">xAI</a> keys.
          </p>
          {error && <p className="error-text" style={{ marginTop: "4px" }}>{error}</p>}
        </div>

        <div className="form-group">
          <label>Global Hotkey</label>
          <div className="hotkey-display">
            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Space</kbd>
          </div>
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textTransform: 'none', color: '#eeeeee' }}>
            <input 
              type="checkbox" 
              checked={showFeedbackPopup}
              onChange={(e) => setShowFeedbackPopup(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Show Explanation Popup on Auto-Replace
          </label>
          <p className="help-text" style={{ marginTop: '4px' }}>
            When disabled, text will be replaced silently without showing the visual difference and explanation.
          </p>
        </div>
      </div>

      <div className="settings-footer">
        <button className="btn-save" onClick={handleSave}>
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
