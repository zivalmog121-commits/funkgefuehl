import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { loadState, recordSession } from "../../lib/storage";

const ROUND_SECONDS = 60;

export default function SchnellRunde() {
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState({ correct: 0, total: 0 });
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [xpGain, setXpGain] = useState(0);
  const timerRef = useRef(null);
  const resultsRef = useRef({ correct: 0, total: 0 });

  useEffect(() => {
    load();
    return () => clearInterval(timerRef.current);
  }, []);

  async function load() {
    setError("");
    setItems(null);
    setStarted(false);
    setDone(false);
    try {
      const state = loadState();
      const recentTerms = state.collection.slice(-20).map((c) => c.term);
      const { topics = ["uni", "arbeit", "ki", "alltag"], level = "C1" } = state.settings || {};
      
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "schnell_runde", recentTerms, topics, level }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      // Deduplicate (schnell-runde uses 'word' or 'question' depending on item)
      const seen = new Set();
      const uniqueItems = data.items.filter((item) => {
        const key = (item.word || item.question || item.term || "").toLowerCase().trim();
        if (key && seen.has(key)) return false;
        if (key) seen.add(key);
        return true;
      });
      
      setItems(uniqueItems.length >= 5 ? uniqueItems : data.items);
      setIndex(0);
      setSelected(null);
      setResults({ correct: 0, total: 0 });
      resultsRef.current = { correct: 0, total: 0 };
      setTimeLeft(ROUND_SECONDS);
    } catch (e) {
      setError("Konnte keine neue Runde laden. Bitte erneut versuchen.");
    }
  }

  function startRound() {
    setStarted(true);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          finish();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function finish() {
    const { xpGain } = recordSession("schnell_runde", resultsRef.current);
    setResults(resultsRef.current);
    setXpGain(xpGain);
    setDone(true);
  }

  function choose(option) {
    if (selected !== null || done) return;
    const item = items[index];
    const correct = option === item.correctOption;
    resultsRef.current = {
      correct: resultsRef.current.correct + (correct ? 1 : 0),
      total: resultsRef.current.total + 1,
    };
    setSelected(option);
    setTimeout(() => {
      if (index + 1 < items.length) {
        setIndex(index + 1);
        setSelected(null);
      } else {
        // ran out of pre-generated items but time remains — loop back
        setIndex(0);
        setSelected(null);
      }
    }, 350);
  }

  if (error) {
    return (
      <Layout title="Schnell-Runde" onBack={() => router.push("/")}>
        <div className="error-text">{error}</div>
        <button className="btn btn-secondary" onClick={load}>Erneut versuchen</button>
      </Layout>
    );
  }

  if (!items) {
    return (
      <Layout title="Schnell-Runde" onBack={() => router.push("/")}>
        <div className="loading-state">
          <span className="loading-pulse" /> SENDER WIRD GESUCHT...
        </div>
      </Layout>
    );
  }

  if (done) {
    return (
      <Layout title="Schnell-Runde" onBack={() => router.push("/")}>
        <div className="prompt-card">
          <div className="prompt-label">Zeit abgelaufen</div>
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

  if (!started) {
    return (
      <Layout title="Schnell-Runde" onBack={() => router.push("/")}>
        <div className="prompt-card">
          <div className="prompt-label">{ROUND_SECONDS} Sekunden</div>
          <div className="prompt-main rtl" style={{ marginBottom: 14 }}>
            תקבל מילה בעברית ושתי אפשרויות בגרמנית — בחר את הניסוח הטבעי יותר. כמה שיותר מהר.
          </div>
        </div>
        <button className="btn btn-primary" onClick={startRound}>
          ▶ Los geht's
        </button>
      </Layout>
    );
  }

  const item = items[index];
  const pct = (timeLeft / ROUND_SECONDS) * 100;

  return (
    <Layout title="Schnell-Runde" onBack={() => router.push("/")}>
      <div className="game-header">
        <span className="score-pill">⏱ {timeLeft}s</span>
        <div style={{ flex: 1 }} />
        <span className="score-pill">✓ {resultsRef.current.correct}/{resultsRef.current.total}</span>
      </div>

      <div className="timer-track">
        <div className={`timer-fill ${timeLeft <= 10 ? "urgent" : ""}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="prompt-card">
        <div className="prompt-label">Wie sagt man das natürlich?</div>
        <div className="prompt-main rtl">{item.hebrew}</div>
      </div>

      <div className="duel-grid">
        {["A", "B"].map((opt) => {
          let cls = "duel-btn";
          if (selected !== null) {
            if (opt === selected && opt === item.correctOption) cls += " selected-good";
            else if (opt === selected && opt !== item.correctOption) cls += " selected-bad";
            else if (opt === item.correctOption) cls += " reveal-correct";
          }
          return (
            <button key={opt} className={cls} onClick={() => choose(opt)} disabled={selected !== null}>
              {opt === "A" ? item.optionA : item.optionB}
            </button>
          );
        })}
      </div>
    </Layout>
  );
}
