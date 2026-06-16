import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { loadState, saveState, syncAndSave, recordSession } from "../../lib/storage";

export default function WieSagtMan() {
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
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
        body: JSON.stringify({
          gameType: "wie_sagt_man",
          recentTerms,
          learnedHashes,
          topics,
          level,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const seen = new Set();
      const uniqueItems = data.items.filter((item) => {
        const key = item.awkward.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const itemsToUse = uniqueItems.length >= 3 ? uniqueItems : data.items;

      itemsToUse?.forEach((item) => {
        import("../lib/storage").then(({ addLearnedQuestion }) => {
          addLearnedQuestion(item);
        });
      });

      setItems(itemsToUse);
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
    if (knewIt) {
      setResults((prev) => ({
        correct: prev.correct + 1,
        total: prev.total + 1,
      }));
    } else {
      setResults((prev) => ({ ...prev, total: prev.total + 1 }));
    }

    if (index + 1 < items.length) {
      setIndex(index + 1);
      setRevealed(false);
    } else {
      finishGame();
    }
  }

  function finishGame() {
    const { xpGain } = recordSession("wie_sagt_man", results);
    setXpGain(xpGain);
    setDone(true);

    const state = loadState();
    const newState = {
      ...state,
      xp: state.xp + xpGain,
    };
    saveState(newState);
    syncAndSave(newState).catch(() => {});
  }

  if (error) {
    return (
      <Layout title="Wie sagt man das?" onBack={() => router.push("/")}>
        <div className="error-text">{error}</div>
        <button className="btn btn-secondary" onClick={load}>
          Erneut versuchen
        </button>
      </Layout>
    );
  }

  if (!items) {
    return (
      <Layout title="Wie sagt man das?" onBack={() => router.push("/")}>
        <div className="loading-state">
          <span className="loading-pulse" /> BEISPIELE WERDEN GESUCHT...
        </div>
      </Layout>
    );
  }

  if (done) {
    return (
      <Layout title="Wie sagt man das?" onBack={() => router.push("/")}>
        <div className="done-card">
          <div className="done-title">✓ Runde beendet!</div>
          <div className="done-stat">
            {results.correct} von {results.total} richtig
          </div>
          <div className="done-xp">+ {xpGain} XP</div>
          <button className="btn btn-primary" onClick={load}>
            Neue Runde
          </button>
          <button className="btn btn-secondary" onClick={() => router.push("/")}>
            Zur Startseite
          </button>
        </div>
      </Layout>
    );
  }

  const item = items[index];
  const pct = ((index + 1) / items.length) * 100;

  return (
    <Layout title="Wie sagt man das?" onBack={() => router.push("/")}>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="game-card">
        <div className="question-num">
          Frage {index + 1} von {items.length}
        </div>

        {!revealed ? (
          <div className="prompt-card">
            <div className="prompt-label">Unnatürlich / Englisch / Hebräisch</div>
            <div className="prompt-main">{item.awkward}</div>
            <button className="btn btn-primary" onClick={reveal}>
              Lösung zeigen
            </button>
          </div>
        ) : (
          <div className="feedback-card">
            <div className="feedback-label">Wie ein Muttersprachler:</div>
            <div className="feedback-text">{item.natural}</div>
            <div className="explanation-he">{item.explanation_he}</div>
            <div className="formality-badge">{item.formality}</div>
            <div className="rating-prompt">Hast du das gewusst?</div>
            <div className="rating-buttons">
              <button className="btn btn-yes" onClick={() => rate(true)}>
                ✓ Ja
              </button>
              <button className="btn btn-no" onClick={() => rate(false)}>
                ✗ Nein
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
