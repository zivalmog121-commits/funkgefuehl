import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { loadState, recordSession, addToCollection } from "../../lib/storage";

function normalize(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/ß/g, "ss")
    .replace(/[.,!?„""']/g, "");
}

export default function KennIchDas() {
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState({ correct: 0, total: 0 });
  const [added, setAdded] = useState(false);
  const [done, setDone] = useState(false);
  const [xpGain, setXpGain] = useState(0);
  const [autoMatched, setAutoMatched] = useState(null); // null | true | false

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError("");
    setItems(null);
    try {
      const state = loadState();
      const recentTerms = state.collection.slice(-20).map((c) => c.term);
      const { topics = ["uni", "arbeit", "ki", "alltag"], level = "C1" } = state.settings || {};
      
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "kenn_ich_das", recentTerms, topics, level }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      // Deduplicate by term
      const seen = new Set();
      const uniqueItems = data.items.filter((item) => {
        const key = item.term.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      setItems(uniqueItems.length >= 3 ? uniqueItems : data.items);
      setIndex(0);
      setGuess("");
      setShowHint(false);
      setRevealed(false);
      setResults({ correct: 0, total: 0 });
      setDone(false);
    } catch (e) {
      setError("Konnte keine neue Runde laden. Bitte erneut versuchen.");
    }
  }

  function submitGuess() {
    const item = items[index];
    const match = guess.trim().length > 0 && normalize(guess) === normalize(item.answer);
    setAutoMatched(match);
    setRevealed(true);
  }

  function rate(wasCorrect) {
    const newResults = { correct: results.correct + (wasCorrect ? 1 : 0), total: results.total + 1 };
    if (index + 1 < items.length) {
      setResults(newResults);
      setIndex(index + 1);
      setGuess("");
      setShowHint(false);
      setRevealed(false);
      setAdded(false);
      setAutoMatched(null);
    } else {
      const { xpGain } = recordSession("kenn_ich_das", newResults);
      setResults(newResults);
      setXpGain(xpGain);
      setDone(true);
    }
  }

  function collect() {
    const item = items[index];
    addToCollection({
      term: item.answer,
      translation_he: item.definition_he,
      category: "begriff",
    });
    setAdded(true);
  }

  if (error) {
    return (
      <Layout title="Kenn ich das?" onBack={() => router.push("/")}>
        <div className="error-text">{error}</div>
        <button className="btn btn-secondary" onClick={load}>Erneut versuchen</button>
      </Layout>
    );
  }

  if (!items) {
    return (
      <Layout title="Kenn ich das?" onBack={() => router.push("/")}>
        <div className="loading-state">
          <span className="loading-pulse" /> SENDER WIRD GESUCHT...
        </div>
      </Layout>
    );
  }

  if (done) {
    return (
      <Layout title="Kenn ich das?" onBack={() => router.push("/")}>
        <div className="prompt-card">
          <div className="prompt-label">Runde fertig</div>
          <div className="prompt-main">{results.correct} / {results.total} erraten</div>
        </div>
        <div className="readout-row">
          <div className="readout">
            <div className="readout-value accent">+{xpGain}</div>
            <div className="readout-label">XP</div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={load} style={{ marginBottom: 8 }}>
          ↻ Noch eine Runde
        </button>
        <button className="btn btn-secondary" onClick={() => router.push("/")}>
          Zurück zum Empfang
        </button>
      </Layout>
    );
  }

  const item = items[index];

  return (
    <Layout title="Kenn ich das?" onBack={() => router.push("/")}>
      <div className="game-header">
        <div className="progress-dots">
          {items.map((_, i) => (
            <span
              key={i}
              className={`progress-dot ${i < index ? "done" : ""} ${i === index ? "current" : ""}`}
            />
          ))}
        </div>
        <span className="score-pill">{results.correct}/{results.total}</span>
      </div>

      <div className="prompt-card">
        <div className="prompt-label">Welcher Begriff ist gesucht?</div>
        <div className="prompt-main rtl">{item.definition_he}</div>
      </div>

      {!revealed ? (
        <>
          <input
            className="text-input"
            type="text"
            placeholder="Dein Begriff..."
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitGuess()}
            autoFocus
          />
          {showHint && <div className="hint-text" dir="rtl">{item.hint}</div>}
          <div className="duel-grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 10 }}>
            <button className="btn btn-secondary" onClick={() => setShowHint(true)} disabled={showHint}>
              💡 Hinweis
            </button>
            <button className="btn btn-primary" onClick={submitGuess}>
              Prüfen
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={`feedback-card ${autoMatched ? "good" : "bad"}`}>
            <div className="feedback-title">{autoMatched ? "Richtig" : "Die Lösung"}</div>
            <div className="feedback-body" style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", marginBottom: 8 }}>
              {item.answer}
            </div>
            <div className="feedback-body rtl">{item.explanation_he}</div>
          </div>

          <button className="btn btn-secondary" onClick={collect} disabled={added} style={{ marginBottom: 8 }}>
            {added ? "✓ Zur Sammlung hinzugefügt" : "+ Zur Sammlung"}
          </button>

          {autoMatched ? (
            <button className="btn btn-primary" onClick={() => rate(true)}>
              {index + 1 < items.length ? "Weiter" : "Runde abschließen"}
            </button>
          ) : (
            <div className="duel-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <button className="btn btn-bad" onClick={() => rate(false)}>
                War falsch
              </button>
              <button className="btn btn-good" onClick={() => rate(true)}>
                War eigentlich richtig
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
