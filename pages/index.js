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
} from "../lib/storage";

export default function Dashboard() {
  const router = useRouter();
  const [state, setState] = useState(null);

  useEffect(() => {
    setState(loadState());
    
    // Listen for sync events from other devices
    const handleSync = () => {
      setState(loadState());
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

      <div className="readout-row">
        <div className="readout">
          <div className="readout-value accent">{state.streak}</div>
          <div className="readout-label">Tage Serie</div>
        </div>
        <div className="readout">
          <div className="readout-value">Lv. {level}</div>
          <div className="readout-label">{Math.floor(state.xp % 100)} / 100 XP</div>
          <div className="xp-bar-track">
            <div className="xp-bar-fill" style={{ width: `${((state.xp % 100) / 100) * 100}%` }} />
          </div>
        </div>
        <div className="readout">
          <div className="readout-value good">{state.collection.length}</div>
          <div className="readout-label">Gesammelt</div>
        </div>
      </div>

      {/* Daily Word */}
      {dailyWord && (
        <div className="card" style={{ marginBottom: 18, background: "linear-gradient(135deg, rgba(132, 204, 22, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)", border: "1px solid var(--accent-secondary)" }}>
          <div className="field-label" style={{ fontSize: "0.85rem", color: "var(--accent-secondary)", marginBottom: 8 }}>⭐ Wort des Tages</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text)" }}>{dailyWord.term}</div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: 4 }}>{dailyWord.definition}</div>
        </div>
      )}

      {/* Stats Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        <div className="readout" style={{ padding: 12, background: "var(--bg-card)", borderRadius: 8 }}>
          <div className="readout-value accent">{totalGamesPlayed}</div>
          <div className="readout-label">Spiele gespielt</div>
        </div>
        <div className="readout" style={{ padding: 12, background: "var(--bg-card)", borderRadius: 8 }}>
          <div className="readout-value accent">{Math.floor(state.xp / 100)}</div>
          <div className="readout-label">Levels erreicht</div>
        </div>
      </div>

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

      {/* Recent Words */}
      {recentWords.length > 0 && (
        <>
          <div className="section-title" style={{ fontSize: "1rem", marginTop: 24 }}>Neue Wörter</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentWords.map((word, idx) => (
              <div key={idx} className="chip" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--bg-card)", borderRadius: 8, border: "1px solid var(--accent-secondary)" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text)" }}>{word.term}</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 2 }}>{word.definition}</div>
                </div>
                <span style={{ fontSize: "0.75rem", padding: "4px 8px", background: "var(--accent-secondary)", color: "#000", borderRadius: 4, fontWeight: 600 }}>NEU</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}
