import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { loadState, recordSession, addToCollection } from "../../lib/storage";

export default function PasstDas() {
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState({ correct: 0, total: 0 });
  const [added, setAdded] = useState(false);
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
      const { topics = ["uni", "arbeit", "ki", "alltag"], level = "C1" } = state.settings || {};
      
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "passt_das", recentTerms, topics, level }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setItems(data.items);
      setIndex(0);
      setSelected(null);
      setResults({ correct: 0, total: 0 });
      setDone(false);
    } catch (e) {
      setError("Konnte keine neue Runde laden. Bitte erneut versuchen.");
    }
  }

  function choose(optIndex) {
    if (selected !== null) return;
    setSelected(optIndex);
  }

  function next() {
    const item = items[index];
    const wasCorrect = selected === item.correctIndex;
    const newResults = { correct: results.correct + (wasCorrect ? 1 : 0), total: results.total + 1 };

    if (index + 1 < items.length) {
      setResults(newResults);
      setIndex(index + 1);
      setSelected(null);
      setAdded(false);
    } else {
      const { xpGain } = recordSession("passt_das", newResults);
      setResults(newResults);
      setXpGain(xpGain);
      setDone(true);
    }
  }

  function collect() {
    const item = items[index];
    addToCollection({
      term: item.phrase,
      translation_he: item.explanation_he,
      category: "register",
    });
    setAdded(true);
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
          <span className="loading-pulse" /> SENDER WIRD GESUCHT...
        </div>
      </Layout>
    );
  }

  if (done) {
    return (
      <Layout title="Passt das?" onBack={() => router.push("/")}>
        <div className="prompt-card">
          <div className="prompt-label">Runde fertig</div>
          <div className="prompt-main">{results.correct} / {results.total} richtig</div>
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
    <Layout title="Passt das?" onBack={() => router.push("/")}>
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
        <div className="prompt-label">Wo passt das hin?</div>
        <div className="prompt-main">„{item.phrase}"</div>
      </div>

      <div className="option-list">
        {item.options.map((opt, i) => {
          let cls = "option-btn";
          if (selected !== null) {
            if (i === selected && i === item.correctIndex) cls += " selected-good";
            else if (i === selected && i !== item.correctIndex) cls += " selected-bad";
            else if (i === item.correctIndex) cls += " reveal-correct";
          }
          return (
            <button key={i} className={cls} onClick={() => choose(i)} disabled={selected !== null}>
              {opt}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <>
          <div className={`feedback-card ${selected === item.correctIndex ? "good" : "bad"}`}>
            <div className="feedback-title">
              {selected === item.correctIndex ? "Genau" : "Eher nicht"}
            </div>
            <div className="feedback-body rtl">{item.explanation_he}</div>
          </div>

          <button className="btn btn-secondary" onClick={collect} disabled={added} style={{ marginBottom: 8 }}>
            {added ? "✓ Zur Sammlung hinzugefügt" : "+ Zur Sammlung"}
          </button>

          <button className="btn btn-primary" onClick={next}>
            {index + 1 < items.length ? "Weiter" : "Runde abschließen"}
          </button>
        </>
      )}
    </Layout>
  );
}
