import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LEVEL_DESCRIPTIONS = {
  A1: "absoluter Anfänger",
  A2: "elementare Kenntnisse",
  B1: "mittleres Niveau mit eigenständiger Sprachproduktion",
  B2: "oberes Mittelniveau, gutes Verständnis komplexer Texte",
  C1: "fließend, versteht Nuancen und Idiomatik",
};

const TOPIC_DESCRIPTIONS = {
  uni: "Universität, Studium, akademische Diskussionen",
  arbeit: "Arbeitswelt, Robotik, technische Gespräche",
  ki: "KI, Technologie, aktuelle Tech-News",
  alltag: "Alltag, bayerische Kultur, lockere Umgangssprache",
};

function buildPersona(level, topics) {
  const topicList = topics.map((t) => TOPIC_DESCRIPTIONS[t]).join(", ");
  const levelDesc = LEVEL_DESCRIPTIONS[level] || "C1";
  
  return `Du bist ein erfahrener Deutschlehrer für einen hebräischsprachigen ${levelDesc}-Studenten der Ingenieurwissenschaften an der Uni Augsburg (Bayern). Der Nutzer beherrscht Grammatik bereits auf ${level}-Niveau — es geht NICHT um Grammatik, sondern darum, wie Muttersprachler sich wirklich ausdrücken: idiomatische Wendungen, natürliche Formulierungen, Register (förmlich/locker), und alltägliche/akademische/bayerische Ausdrücke. Konzentriere dich auf diese Themen: ${topicList}. Antworte AUSSCHLIESSLICH mit validem JSON (einem Array), ohne Markdown, ohne Codeblock, ohne einleitenden Text.`;
}

const PROMPTS = {
  wie_sagt_man: (avoid, level) => `Erstelle 5 Beispiele für das Spiel "Wie sagt man das?" (Niveau: ${level}).
Jedes Beispiel zeigt einen Satz, den ein Nicht-Muttersprachler wörtlich aus dem Englischen oder Hebräischen ins Deutsche übersetzen würde (grammatisch oft korrekt, aber unnatürlich/unidiomatisch), und daneben, wie ein Muttersprachler es tatsächlich ausdrücken würde.
${avoid}
Antworte als JSON-Array mit 5 Objekten, jedes mit genau diesen Feldern:
- "awkward": der unnatürlich klingende, aber grammatisch meist korrekte Satz (Deutsch)
- "natural": wie ein Muttersprachler es wirklich sagen würde (Deutsch)
- "explanation_he": kurze Erklärung auf Hebräisch (1-2 Sätze), warum die natürliche Version besser klingt
- "formality": eine von "formal", "neutral", "informal"`,

  passt_das: (avoid, level) => `Erstelle 5 Beispiele für das Spiel "Passt das?" (Niveau: ${level}).
Jedes Beispiel zeigt eine deutsche Redewendung oder Formulierung (oft umgangssprachlich, manchmal förmlich), und der Nutzer muss einschätzen, in welchem Kontext sie passt.
${avoid}
Antworte als JSON-Array mit 5 Objekten, jedes mit genau diesen Feldern:
- "phrase": die deutsche Redewendung/Formulierung
- "options": ein Array von genau 3 Strings, das die möglichen Kontexte beschreibt (z.B. "Unter Freunden", "Im Seminar mit Professor", "Passt eigentlich nirgendwo so")
- "correctIndex": die 0-basierte Position der richtigen Antwort im "options"-Array
- "explanation_he": kurze Erklärung auf Hebräisch (1-2 Sätze), wann/warum man das so sagt`,

  ergaenze: (avoid, level) => `Erstelle 5 Beispiele für das Spiel "Ergänze den Satz" (Niveau: ${level}).
Jedes Beispiel zeigt einen unvollständigen, alltäglichen oder akademischen deutschen Satzanfang, und 3 mögliche Fortsetzungen, von denen eine am natürlichsten klingt (keine ist grammatisch falsch, aber eine klingt am authentischsten).
${avoid}
Antworte als JSON-Array mit 5 Objekten, jedes mit genau diesen Feldern:
- "starter": der Satzanfang (Deutsch, endet z.B. mit "...")
- "options": ein Array von genau 3 Strings mit möglichen Fortsetzungen
- "correctIndex": die 0-basierte Position der natürlichsten Fortsetzung
- "explanation_he": kurze Erklärung auf Hebräisch (1-2 Sätze), warum diese Fortsetzung am natürlichsten klingt`,

  kenn_ich_das: (avoid, level) => `Erstelle 5 Beispiele für das Spiel "Kenn ich das?" (Niveau: ${level}) — Begriff erraten.
Jedes Beispiel gibt eine hebräische Definition/Beschreibung eines deutschen Wortes, einer Redewendung oder eines umgangssprachlichen/akademischen Ausdrucks, und der Nutzer muss den deutschen Begriff erraten.
${avoid}
Antworte als JSON-Array mit 5 Objekten, jedes mit genau diesen Feldern:
- "definition_he": eine klare Beschreibung/Definition auf Hebräisch, ohne den Begriff selbst zu verraten
- "answer": der gesuchte deutsche Begriff oder Ausdruck
- "hint": ein Hinweis auf Hebräisch, z.B. der erste Buchstabe oder die Wortanzahl oder ein Kontext-Hinweis
- "explanation_he": kurze zusätzliche Erklärung auf Hebräisch, wie/wann man den Begriff verwendet`,

  schnell_runde: (avoid, level) => `Erstelle 10 Beispiele für das Spiel "Schnell-Runde" (Niveau: ${level}) — Zeitdruck-Quiz.
Jedes Beispiel zeigt ein hebräisches Wort oder einen kurzen Ausdruck, sowie zwei deutsche Übersetzungsmöglichkeiten — beide grammatisch plausibel, aber nur eine ist die natürliche, gängige Art, wie Muttersprachler es im Alltag/akademischen Kontext sagen würden.
${avoid}
Antworte als JSON-Array mit 10 Objekten, jedes mit genau diesen Feldern:
- "hebrew": das hebräische Wort/der Ausdruck
- "optionA": deutsche Übersetzungsmöglichkeit A
- "optionB": deutsche Übersetzungsmöglichkeit B
- "correctOption": "A" oder "B" — welche im Alltag natürlicher/gängiger ist
- "explanation_he": sehr kurze Erklärung auf Hebräisch (max. 1 Satz)`,
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { gameType, recentTerms, topics = ["uni", "arbeit", "ki", "alltag"], level = "C1" } = req.body;
  const promptFn = PROMPTS[gameType];
  if (!promptFn) return res.status(400).json({ error: "Unknown game type" });

  const avoid =
    recentTerms && recentTerms.length
      ? `Vermeide Wiederholungen folgender bereits verwendeter Begriffe/Formulierungen: ${recentTerms.slice(0, 25).join(", ")}.`
      : "";

  const persona = buildPersona(level, topics);

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2500,
      system: persona,
      messages: [{ role: "user", content: promptFn(avoid, level) }],
    });

    const text = (message.content || [])
      .map((b) => b.text || "")
      .join("")
      .trim()
      .replace(/```json|```/g, "")
      .trim();

    const parsed = JSON.parse(text);
    res.status(200).json({ items: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler bei der Generierung" });
  }
}
