import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import Dial from "../components/Dial";
import {
  loadState,
  getLevel,
  getSprachgefuehl,
  pickSmartGame,
  isPlayedToday,
  GAMES,
  savePhraseOfDay,
  unsavePhrase,
  isPhraseSaved,
  saveState,
  syncAndSave,
} from "../lib/storage";

export default function Dashboard() {
  const router = useRouter();
  const [state, setState] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [dailyPhrase, setDailyPhrase] = useState(null);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    
    // Compute daily phrase from collection
    if (loaded.collection.length > 0) {
      const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
      const phraseIndex = dayOfYear % loaded.collection.length;
      setDailyPhrase(loaded.collection[phraseIndex]);
    }
    
    // Listen for sync events from other devices
    const handleSync = () => {
      const updated = loadState();
      setState(updated);
      if (updated.collection.length > 0) {
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        const phraseIndex = dayOfYear % updated.collection.length;
        setDailyPhrase(updated.collection[phraseIndex]);
      }
    };
    window.addEventListener('syncedFromCloud', handleSync);
    return () => window.removeEventListener('syncedFromCloud', handleSync);
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

  const today = new Date().toISOString().slice(0, 10);
  const dailyChallengeDone = state.lastPlayedDate === today;
  
  const score = getSprachgefuehl(state);
  const level = getLevel(state);
  const playedToday = isPlayedToday(state);
  
  const smartGame = pickSmartGame(state);
  const smartGameId = smartGame?.id;

  const challengeGame = (() => {
    const gameIds = Object.keys(GAMES);
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    return gameIds[dayOfYear % gameIds.length];
  })();
  const challengeGameData = GAMES[challengeGame];

  // Daily Word of the Day
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const dailyWordIndex = dayOfYear % Math.max(state.collection.length, 1);
  const dailyWord = state.collection.length > 0 ? state.collection[dailyWordIndex] : null;

  // Count total games played
  const totalGamesPlayed = Object.values(state.gameStats || {}).reduce((sum, gs) => sum + gs.total, 0);

  // Recent words (last 5)
  const recentWords = state.collection.slice(-5).reverse();

  let dialSubtext = "Noch keine Daten — leg los";
  if (score >= 80) dialSubtext = "Klingt fast wie ein Local";
  else if (score >= 60) dialSubtext = "Guter Empfang";
  else if (score >= 40) dialSubtext = "Im Aufbau";
  else if (score > 0) dialSubtext = "Sender wird gesucht...";

  return (
    <Layout>
      <Dial 
        score={score} 
        level={level}
        xpCurrent={state.xp % 100}
        xpMax={100}
        streak={state.streak}
      />

      {/* Daily Phrase Card */}
      {dailyPhrase && (
        <div 
          className="card" 
          style={{ 
            marginBottom: 18, 
            background: "linear-gradient(135deg, rgba(132, 204, 22, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)",
            border: "1px solid var(--accent-secondary)",
            cursor: "pointer"
          }}
          onClick={() => setShowModal(true)}
        >
          <div className="field-label" style={{ fontSize: "0.85rem", color: "var(--accent-secondary)", marginBottom: 8 }}>
            💡 Phrase des Tages
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
            "{dailyPhrase.term}"
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: 12 }}>
            {dailyPhrase.definition}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1, fontSize: "0.85rem" }}
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
            >
              Mehr zeigen →
            </button>
          </div>
        </div>
      )}

      {/* Daily Challenge */}
      <div className="card daily-challenge" style={{ marginBottom: 18, background: dailyChallengeDone ? "var(--good-glow)" : "linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent) 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div className="field-label" style={{ color: dailyChallengeDone ? "var(--good)" : "#fff" }}>
              {dailyChallengeDone ? "✅ Heutige Herausforderung" : "🎯 Heutige Herausforderung"}
            </div>
            <div style={{ color: dailyChallengeDone ? "var(--text)" : "#fff", fontSize: "0.95rem", fontWeight: 600, marginTop: 6 }}>
              {challengeGameData.title}
            </div>
          </div>
          <span style={{ fontSize: "2rem" }}>{challengeGameData.icon}</span>
        </div>
        {!dailyChallengeDone && (
          <button
            className="btn"
            onClick={() => router.push(challengeGameData.path)}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "2px solid #fff",
              color: "#fff",
              fontWeight: 800,
            }}
          >
            Jetzt spielen
          </button>
        )}
      </div>

      <button
        className="btn btn-primary"
        onClick={() => router.push(smartGame.path)}
        style={{ marginBottom: 4 }}
      >
        {playedToday ? `↻ Noch eine Runde · ${smartGame.title}` : `▶ Smart Study starten · ${smartGame.title}`}
      </button>
      <div className="field-hint" style={{ textAlign: "center", marginBottom: 18 }}>
        {playedToday
          ? "Heute schon trainiert — weiter so."
          : "Ausgewählt basierend auf dem, was am meisten Übung braucht."}
      </div>

      <div className="section-title" style={{ fontSize: "1rem" }}>Alle Sender</div>
      <div className="tile-grid">
        {Object.values(GAMES).map((game) => {
          const gs = state.gameStats[game.id];
          const acc = gs.total > 0 ? Math.round((gs.correct / gs.total) * 100) : null;
          return (
            <div key={game.id} className="tile" onClick={() => router.push(game.path)}>
              {game.id === smartGameId && <span className="tile-badge">Empfohlen</span>}
              <span className="tile-icon">{game.icon}</span>
              <div className="tile-title">{game.title}</div>
              <div className="tile-sub">{acc !== null ? `${acc}% Treffer` : game.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && dailyPhrase && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "flex-end",
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div 
            className="card"
            style={{
              width: "100%",
              borderRadius: "16px 16px 0 0",
              maxHeight: "80vh",
              overflow: "auto",
              padding: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 12 }}>
              "{dailyPhrase.term}"
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <div className="field-label">Bedeutung</div>
              <div style={{ fontSize: "0.95rem", marginTop: 6 }}>
                {dailyPhrase.definition}
              </div>
            </div>

            {dailyPhrase.explanation_he && (
              <div style={{ marginBottom: 16 }}>
                <div className="field-label">Erklärung (Hebräisch)</div>
                <div style={{ fontSize: "0.9rem", marginTop: 6, color: "var(--text-secondary)" }}>
                  {dailyPhrase.explanation_he}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button 
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  const newState = savePhraseOfDay(state, dailyPhrase);
                  saveState(newState);
                  syncAndSave(newState).catch(() => {});
                  setState(newState);
                  setShowModal(false);
                }}
              >
                ⭐ Speichern
              </button>
              <button 
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowModal(false)}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
