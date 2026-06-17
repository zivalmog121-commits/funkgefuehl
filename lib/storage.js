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
    learnedQuestions: [], // Track all learned/completed questions
    questionCache: {}, // { "wie_sagt_man": [...items], ... }
    savedPhrases: [], // Saved daily phrases
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

export function addLearnedQuestion(item) {
  if (!item) return;
  
  // Create hash from item's key fields
  const key = JSON.stringify({
    awkward: item.awkward,
    phrase: item.phrase,
    starter: item.starter,
    term: item.term,
    question: item.question,
  });
  
  const hash = btoa(key).slice(0, 20); // Base64 hash, shortened
  
  const state = loadState();
  if (!state.learnedQuestions) state.learnedQuestions = [];
  
  if (!state.learnedQuestions.includes(hash)) {
    state.learnedQuestions.push(hash);
    saveState(state);
  }
}

// Save state AND sync to Firebase
export async function syncAndSave(state) {
  saveState(state);
  
  // Try to sync to Firebase if user is signed in
  if (typeof window !== "undefined") {
    try {
      const { auth } = await import("./firebase");
      if (auth?.currentUser) {
        const { syncStateToFirebase } = await import("./firebaseSync");
        await syncStateToFirebase(state);
      }
    } catch (err) {
      console.error("Sync error:", err);
    }
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
  // Sync to Firebase in background
  syncAndSave(state).catch(() => {});
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
    // Sync to Firebase in background
    syncAndSave(state).catch(() => {});
  }
  return state;
}

export function saveState(state) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state:", e);
  }
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

export function savePhraseOfDay(state, phrase) {
  if (!state.savedPhrases) state.savedPhrases = [];
  const exists = state.savedPhrases.some(p => p.german === phrase.german);
  if (!exists) {
    state.savedPhrases.push({ ...phrase, savedAt: new Date().toISOString() });
  }
  return state;
}

export function unsavePhrase(state, german) {
  if (!state.savedPhrases) state.savedPhrases = [];
  state.savedPhrases = state.savedPhrases.filter(p => p.german !== german);
  return state;
}

export function isPhraseSaved(state, german) {
  if (!state.savedPhrases) return false;
  return state.savedPhrases.some(p => p.german === german);
}

export function getCachedQuestions(state, gameType) {
  if (!state.questionCache) state.questionCache = {};
  return state.questionCache[gameType] || [];
}

export function setCachedQuestions(state, gameType, items) {
  if (!state.questionCache) state.questionCache = {};
  state.questionCache[gameType] = items;
  return state;
}

export function removeUsedCacheItem(state, gameType, itemKey) {
  if (!state.questionCache || !state.questionCache[gameType]) return state;
  
  state.questionCache[gameType] = state.questionCache[gameType].filter(item => {
    const key = (item.word || item.question || item.term || "").toLowerCase().trim();
    return key !== itemKey.toLowerCase().trim();
  });
  
  return state;
}
