import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { loadState, recordSession } from "../../lib/storage";

export default function PasstDas() {
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState({ correct: 0, total: 0 });
  const [done, setDone] = useState(false);
  const [xpGain, setXpGain] = useState(0);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError("");
    setItems(null);
    try {
      const state = loadState();
      const recentTerms = state.collection.slice(-20).map((c) => c.term);
      const learnedHashes = state.learnedQuestions || [];
      const { topics = ["uni", "arbeit", "ki", "alltag"], level = "C1" } = state.settings || {};

      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "passt_das", recentTerms, learnedHashes, topics, level }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const seen = new Set();
      const uniqueItems = data.items.filter((item) => {
        const key = item.phrase.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const itemsToUse = uniqueItems.length >= 3 ? uniqueItems : data.items;

      itemsToUse?.forEach((item) => {
        import("../../lib/storage").then(({ addLearnedQuestion }) => {
          addLearnedQuestion(item);
        });
      });

      setItems(itemsToUse);
      setIndex(0);
      setSelected(null);
      setResults({ correct: 0, total: 0 });
      setDone(false);
    } catch (e) {
      setError("Konnte keine neue Runde laden. Bitte erneut versuchen.");
    }
  }

  function choose(option) {
    const item = items[index];
    const correct = option === item.correctIndex;
    setResults((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
    }));
    setSelected(option);

    setTimeout(() => {
      if (index + 1 < items.length) {
        setIndex(index + 1);
        setSelected(null);
      } else {
        finishGame();
      }
    }, 500);
  }

  function finishGame() {
    const { xpGain } = recordSession("passt_das", results);
    setXpGain(xpGain);
    setDone(true);
  }

  if (error) {
    return (
      <Layout title="Passt das?" onBack={() => router.push("/")}>
        <div className="error-text">{error}</div>
        <button className="btn btn-secondary" onClick={load}>Erneut versuchen</button>
      </Layout>
    );
  }

  if (!items) {
    return (
      <Layout title="Passt das?" onBack={() => router.push("/")}>
        <div className="loading-state">
          <span className="loading-pulse" /> KONTEXTE WERDEN GESUCHT...
        </div>
      </Layout>
    );
  }

  if (done) {
    return (
      <Layout title="Passt das?" onBack={() => router.push("/")}>
        <div className="done-card">
          <div className="done-title">✓ Runde beendet!</div>
          <div className="done-stat">{results.correct} von {results.total} richtig</div>
          <div className="done-xp">+ {xpGain} XP</div>
          <button className="btn btn-primary" onClick={load}>Neue Runde</button>
          <button className="btn btn-secondary" onClick={() => router.push("/")}>Zur Startseite</button>
        </div>
      </Layout>
    );
  }

  const item = items[index];
  const pct = ((index + 1) / items.length) * 100;

  return (
    <Layout title="Passt das?" onBack={() => router.push("/")}>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="game-card">
        <div className="question-num">Frage {index + 1} von {items.length}</div>
        <div className="prompt-card">
          <div className="prompt-label">In welchem Kontext passt das?</div>
          <div className="prompt-main">{item.phrase}</div>
          <div className="duel-grid">
            {item.options.map((option, i) => (
              <button
                key={i}
                className={`duel-btn ${selected === i ? (i === item.correctIndex ? "selected-good" : "selected-bad") : ""} ${selected !== null && i === item.correctIndex ? "reveal-correct" : ""}`}
                onClick={() => choose(i)}
                disabled={selected !== null}
              >
                {option}
              </button>
            ))}
          </div>
          {selected !== null && (
            <div className="explanation-he">{item.explanation_he}</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
