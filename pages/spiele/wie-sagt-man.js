import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { loadState, recordSession, addToCollection } from "../../lib/storage";

export default function WieSagtMan() {
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
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
        body: JSON.stringify({ 
          gameType: "wie_sagt_man", 
          recentTerms,
          topics,
          level
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setItems(data.items);
      setIndex(0);
      setRevealed(false);
      setResults({ correct: 0, total: 0 });
      setDone(false);
    } catch (e) {
      setError("Konnte keine neue Runde laden. Bitte erneut versuchen.");
    }
  }

  function reveal() {
    setRevealed(true);
  }

  function rate(knewIt) {
    setResults((r) => ({ correct: r.correct + (knewIt ? 1 : 0), total: r.total + 1 }));
    if (index + 1 < items.length) {
      setIndex(index + 1);
      setRevealed(false);
      setAdded(false);
    } else {
      finish(knewIt);
    }
  }

  function finish(lastKnewIt) {
    const finalResults = { correct: results.correct + (lastKnewIt ? 1 : 0), total: results.total + 1 };
    const { xpGain } = recordSession("wie_sagt_man", finalResults);
    setResults(finalResults);
    setXpGain(xpGain);
    setDone(true);
  }

  function collect() {
    const item = items[index];
    addToCollection({
      term: item.natural,
      translation_he: item.explanation_he,
      category: "wendung",
    });
    setAdded(true);
  }

  if (error) {
    return (
      <Layout title="Wie sagt man das?" onBack={() => router.push("/")}>
        <div className="error-text">{error}</div>
        <button className="btn btn-secondary" onClick={load}>Erneut versuchen</button>
      </Layout>
    );
  }

  if (!items) {
    return (
      <Layout title="Wie sagt man das?" onBack={() => router.push("/")}>
        <div className="loading-state">
          <span className="loading-pulse" /> SENDER WIRD GESUCHT...
        </div>
      </Layout>
    );
  }

  if (done) {
    return (
      <Layout title="Wie sagt man das?" onBack={() => router.push("/")}>
        <div className="prompt-card">
          <div className="prompt-label">Runde fertig</div>
          <div className="prompt-main">
            {results.correct} / {results.total} kanntest du schon
          </div>
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
    <Layout title="Wie sagt man das?" onBack={() => router.push("/")}>
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
        <div className="prompt-label">So würdest du es vielleicht sagen</div>
        <div className="prompt-main">„{item.awkward}"</div>
      </div>

      {!revealed ? (
        <button className="btn btn-primary" onClick={reveal}>
          Wie sagt man's wirklich?
        </button>
      ) : (
        <>
          <div className="feedback-card good">
            <div className="feedback-title">So sagt man's natürlich</div>
            <div className="feedback-body" style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: 10 }}>
              „{item.natural}"
            </div>
            <div className="feedback-body rtl">{item.explanation_he}</div>
          </div>

          <button className="btn btn-secondary" onClick={collect} disabled={added} style={{ marginBottom: 8 }}>
            {added ? "✓ Zur Sammlung hinzugefügt" : "+ Zur Sammlung"}
          </button>

          <div className="duel-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <button className="btn btn-bad" onClick={() => rate(false)}>
              War neu für mich
            </button>
            <button className="btn btn-good" onClick={() => rate(true)}>
              Kannte ich schon
            </button>
          </div>
        </>
      )}
    </Layout>
  );
}
