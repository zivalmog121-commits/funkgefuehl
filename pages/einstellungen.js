import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { loadState, saveState, syncAndSave, getLevel, GAMES } from "../lib/storage";

const TOPICS = [
  { id: "uni", label: "Uni & Studium", emoji: "🎓" },
  { id: "arbeit", label: "Arbeit & Robotik", emoji: "🤖" },
  { id: "ki", label: "KI & Tech-News", emoji: "💻" },
  { id: "alltag", label: "Alltag & Bayerisch", emoji: "🍺" },
];

const LEVELS = [
  { value: "A1", label: "A1 - Anfänger" },
  { value: "A2", label: "A2 - Elementar" },
  { value: "B1", label: "B1 - Mittelstufe" },
  { value: "B2", label: "B2 - Oberstufe" },
  { value: "C1", label: "C1 - Fließend" },
];

export default function Einstellungen() {
  const [state, setState] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState("C1");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setSelectedTopics(loaded.settings?.topics || ["uni", "arbeit", "ki", "alltag"]);
    setSelectedLevel(loaded.settings?.level || "C1");

    // PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  if (!state) {
    return (
      <Layout>
        <div className="loading-state">
          <span className="loading-pulse" /> LADE...
        </div>
      </Layout>
    );
  }

  const { level } = getLevel(state.xp);

  function handleTopicChange(topicId) {
    const updated = selectedTopics.includes(topicId)
      ? selectedTopics.filter((t) => t !== topicId)
      : [...selectedTopics, topicId];
    setSelectedTopics(updated);
    const newState = { ...state, settings: { ...state.settings, topics: updated } };
    saveState(newState);
    syncAndSave(newState).catch(() => {});
  }

  function handleLevelChange(e) {
    const level = e.target.value;
    setSelectedLevel(level);
    const newState = { ...state, settings: { ...state.settings, level } };
    saveState(newState);
    syncAndSave(newState).catch(() => {});
  }

  function resetProgress() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    window.localStorage.removeItem("funkgefuehl:state");
    setState(loadState());
    setConfirmReset(false);
  }

  async function handleInstallClick() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  }

  return (
    <Layout title="⚙️ Einstellungen">
      <div className="section-title">⚙️ Einstellungen</div>

      {/* Topics Section */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="field-label">🎯 Noshäuser wählen</div>
        <div className="field-hint">
          Welche Themen sollen in deinen Spielen vorkommen?
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {TOPICS.map((topic) => (
            <label key={topic.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px", borderRadius: "8px", border: selectedTopics.includes(topic.id) ? "2px solid var(--accent)" : "2px solid transparent", background: selectedTopics.includes(topic.id) ? "var(--accent-glow)" : "transparent", transition: "all 0.2s" }}>
              <input
                type="checkbox"
                checked={selectedTopics.includes(topic.id)}
                onChange={() => handleTopicChange(topic.id)}
                style={{ cursor: "pointer", width: 20, height: 20 }}
              />
              <span style={{ fontSize: "1.2rem" }}>{topic.emoji}</span>
              <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>{topic.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Level Section */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="field-label">📚 Sprachniveau</div>
        <div className="field-hint">
          Wähle dein Niveau. Die Inhalte werden entsprechend angepasst.
        </div>
        <select
          value={selectedLevel}
          onChange={handleLevelChange}
          style={{
            width: "100%",
            padding: "12px 14px",
            marginTop: 12,
            borderRadius: "8px",
            border: "2px solid var(--accent)",
            background: "var(--accent-glow)",
            fontFamily: "var(--font-display)",
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--accent)",
            cursor: "pointer",
          }}
        >
          {LEVELS.map((lvl) => (
            <option key={lvl.value} value={lvl.value}>
              {lvl.label}
            </option>
          ))}
        </select>
      </div>

      {/* PWA Install */}
      {installPrompt && !isInstalled && (
        <div className="card" style={{ marginBottom: 18, background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-secondary) 100%)", color: "#fff", border: "none" }}>
          <div className="field-label" style={{ color: "#fff" }}>📱 Auf dein Gerät herunterladen</div>
          <div className="field-hint" style={{ color: "rgba(255,255,255,0.9)" }}>
            Installiere Funkgefühl als App auf deinem Handy oder Desktop — kein App Store nötig!
          </div>
          <button
            className="btn btn-primary"
            onClick={handleInstallClick}
            style={{ marginTop: 12, background: "rgba(255,255,255,0.2)", border: "2px solid #fff", color: "#fff" }}
          >
            ↓ App installieren
          </button>
        </div>
      )}

      {isInstalled && (
        <div className="card" style={{ marginBottom: 18, background: "var(--good-glow)", border: "2px solid var(--good)" }}>
          <div className="field-label" style={{ color: "var(--good)" }}>✅ App installiert</div>
          <div className="field-hint">
            Du kannst Funkgefühl jetzt offline nutzen und schneller zugreifen.
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="field-label">📊 Dein Fortschritt</div>
        <div className="stat-grid">
          <div className="readout">
            <div className="readout-value accent">Lv. {level}</div>
            <div className="readout-label">{state.xp} XP</div>
          </div>
          <div className="readout">
            <div className="readout-value">{state.streak}</div>
            <div className="readout-label">Serie</div>
          </div>
          <div className="readout">
            <div className="readout-value good">{state.collection.length}</div>
            <div className="readout-label">Gesammelt</div>
          </div>
        </div>
        <div className="field-hint">
          {state.streakFreezeAvailable
            ? "🧊 Du hast noch einen Serien-Freeze: ein verpasster Tag bricht deine Serie nicht ab."
            : "Dein Serien-Freeze wurde bereits verwendet."}
        </div>
      </div>

      {/* Game Stats */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="field-label">🎮 Sender-Statistik</div>
        {Object.values(GAMES).map((game) => {
          const gs = state.gameStats[game.id];
          const acc = gs.total > 0 ? Math.round((gs.correct / gs.total) * 100) : null;
          return (
            <div key={game.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.2rem" }}>{game.icon}</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{game.title}</span>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "0.85rem", color: acc === null ? "var(--text-dim)" : "var(--accent)", fontWeight: 700 }}>
                {acc !== null ? `${acc}% · ${gs.played}x` : "noch nicht gespielt"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Data */}
      <div className="card">
        <div className="field-label">💾 Daten</div>
        <div className="field-hint" style={{ marginBottom: 12 }}>
          Alle Fortschritte und deine Sammlung werden nur lokal auf diesem Gerät gespeichert.
        </div>
        <button
          className="btn btn-secondary"
          onClick={resetProgress}
          style={{
            borderColor: confirmReset ? "var(--bad)" : "var(--accent)",
            color: confirmReset ? "var(--bad)" : "var(--accent)",
          }}
        >
          {confirmReset ? "⚠️ Wirklich zurücksetzen? Tippe erneut" : "🔄 Fortschritt zurücksetzen"}
        </button>
      </div>
    </Layout>
  );
}
