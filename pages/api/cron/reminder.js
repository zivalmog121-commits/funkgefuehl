// pages/api/cron/reminder.js
// Triggered hourly by Vercel Cron (see vercel.json). Sends a Telegram
// message once a day, when the current hour in Europe/Berlin matches
// REMINDER_HOUR. No database needed — running hourly and matching the
// hour exactly means it naturally fires once per day.

const MESSAGES = [
  "📻 Frequenz frei? Zeit für eine Runde Funkgefühl — 2 Minuten reichen.",
  "📡 Dein Sender wartet. Eine kurze Runde, bevor der Tag vorbei ist?",
  "🎯 Kurzer Empfang gefällig? Eine Runde Funkgefühl wartet auf dich.",
  "🗣️ Wie sagt man das nochmal...? Zeit für eine Runde.",
  "⚡ 60 Sekunden für die Schnell-Runde — schaffst du einen neuen Highscore?",
];

export default async function handler(req, res) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const reminderHour = parseInt(process.env.REMINDER_HOUR || "19", 10);
  const appUrl = process.env.APP_URL || "";

  if (!botToken || !chatId) {
    return res.status(200).json({ skipped: true, reason: "Telegram not configured" });
  }

  // Current hour in Europe/Berlin
  const berlinHour = parseInt(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/Berlin",
    }).format(new Date()),
    10
  );

  if (berlinHour !== reminderHour) {
    return res.status(200).json({ skipped: true, berlinHour, reminderHour });
  }

  const text = MESSAGES[Math.floor(Math.random() * MESSAGES.length)] + (appUrl ? `\n\n${appUrl}` : "");

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const data = await tgRes.json();
    res.status(200).json({ sent: true, telegram: data.ok });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Telegram-Fehler" });
  }
}
