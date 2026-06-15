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
    </Layout>
  );
}
