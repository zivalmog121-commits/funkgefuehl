// lib/storage.js
// All app state lives in localStorage. This is a personal single-user
// app, so no backend database is needed for game state.

const KEY = "funkgefuehl:state";

export const GAMES = {
  wie_sagt_man: {
    id: "wie_sagt_man",
    title: "Wie sagt man das?",
    sub: "Natürlich klingen",
    icon: "🗣️",
    path: "/spiele/wie-sagt-man",
  },
  passt_das: {
    id: "passt_das",
    title: "Passt das?",
    sub: "Register-Gefühl",
    icon: "🎯",
    path: "/spiele/passt-das",
  },
  ergaenze: {
    id: "ergaenze",
    title: "Ergänze den Satz",
    sub: "Wie geht's weiter?",
    icon: "✏️",
    path: "/spiele/ergaenze",
  },
  kenn_ich_das: {
    id: "kenn_ich_das",
    title: "Kenn ich das?",
    sub: "Begriff erraten",
    icon: "🧩",
    path: "/spiele/kenn-ich-das",
  },
  schnell_runde: {
    id: "schnell_runde",
    title: "Schnell-Runde",
    sub: "60 Sekunden",
    icon: "⚡",
    path: "/spiele/schnell-runde",
  },
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function defaultState() {
  const gameStats = {};
  Object.keys(GAMES).forEach((id) => {
    gameStats[id] = { played: 0, correct: 0, total: 0, lastPlayed: null };
  });
  return {
    xp: 0,
    streak: 0,
    streakFreezeAvailable: true,
    lastPlayedDate: null,
    gameStats,
    collection: [],
    settings: {
      reminderHour: 19,
      telegramConnected: false,
      topics: ["uni", "arbeit", "ki", "alltag"],
      level: "C1",
    },
  };
}

export function loadState() {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // merge with defaults to handle missing keys after updates
    const base = defaultState();
    const gameStats = { ...base.gameStats, ...(parsed.gameStats || {}) };
    Object.keys(GAMES).forEach((id) => {
      gameStats[id] = { ...base.gameStats[id], ...(gameStats[id] || {}) };
    });
    return {
      ...base,
      ...parsed,
      gameStats,
      settings: { ...base.settings, ...(parsed.settings || {}) },
    };
  } catch (e) {
    return defaultState();
  }
}

export function saveState(state) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
  
  // Auto-sync to Firebase if user is signed in
  if (typeof window !== "undefined") {
    import("./firebase").then(({ auth }) => {
      import("./firebaseSync").then(({ syncStateToFirebase }) => {
        if (auth?.currentUser) {
          syncStateToFirebase(state).catch(err => {
            console.error("Firebase sync failed:", err);
          });
        }
      });
    });
  }
}

// Call when a game session finishes.
// results: { correct: number, total: number }
export function recordSession(gameId, results) {
  const state = loadState();
  const today = todayStr();

  // Streak logic
  if (state.lastPlayedDate !== today) {
    if (state.lastPlayedDate === yesterdayStr()) {
      state.streak += 1;
    } else if (state.lastPlayedDate === null) {
      state.streak = 1;
    } else {
      // missed a day or more
      if (state.streakFreezeAvailable) {
        state.streak += 1;
        state.streakFreezeAvailable = false;
      } else {
        state.streak = 1;
      }
    }
    state.lastPlayedDate = today;
  }

  // XP: 10 per correct answer, 2 per attempt (effort counts)
  const xpGain = results.correct * 10 + (results.total - results.correct) * 2;
  state.xp += xpGain;

  // Per-game stats
  const gs = state.gameStats[gameId] || { played: 0, correct: 0, total: 0, lastPlayed: null };
  gs.played += 1;
  gs.correct += results.correct;
  gs.total += results.total;
  gs.lastPlayed = today;
  state.gameStats[gameId] = gs;

  saveState(state);
  return { state, xpGain };
}

export function addToCollection(item) {
  const state = loadState();
  const exists = state.collection.some((c) => c.term === item.term);
  if (!exists) {
    state.collection.push({
      ...item,
      addedDate: todayStr(),
    });
    saveState(state);
  }
  return state;
}

export function getLevel(state) {
  const xp = state.xp || 0;
  // Level thresholds grow gently: 0,100,250,450,700,1000,1350...
  let level = 1;
  let threshold = 100;
  let remaining = xp;
  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold += 50 * level;
  }
  return level;
}

// "Sprachgefühl" score 0-100 — overall accuracy across all games,
// weighted slightly toward recent play (recency not tracked precisely,
// so we use a simple lifetime accuracy with a floor).
export function getSprachgefuehl(state) {
  let correct = 0;
  let total = 0;
  Object.values(state.gameStats).forEach((g) => {
    correct += g.correct;
    total += g.total;
  });
  if (total === 0) return 50; // neutral starting point
  const acc = (correct / total) * 100;
  return Math.round(acc);
}

// Pick the best next game: least recently played, or lowest accuracy.
export function pickSmartGame(state) {
  const ids = Object.keys(GAMES);
  let best = ids[0];
  let bestScore = -Infinity;
  ids.forEach((id) => {
    const g = state.gameStats[id];
    let score = 0;
    if (!g.lastPlayed) {
      score += 1000; // never played — prioritize
    } else {
      const daysAgo = Math.floor(
        (new Date(todayStr()) - new Date(g.lastPlayed)) / (1000 * 60 * 60 * 24)
      );
      score += daysAgo * 10;
    }
    if (g.total > 0) {
      const acc = g.correct / g.total;
      score += (1 - acc) * 50; // lower accuracy -> higher priority
    }
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  });
  return GAMES[best];
}

export function isPlayedToday(state) {
  return state.lastPlayedDate === todayStr();
}
