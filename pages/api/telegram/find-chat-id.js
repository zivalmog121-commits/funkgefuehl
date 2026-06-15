// pages/api/telegram/find-chat-id.js
// One-time setup helper: after messaging your bot on Telegram, visit
// this URL (with your bot token) to find your chat ID.
// Usage: /api/telegram/find-chat-id?token=YOUR_BOT_TOKEN

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Bot-Token als ?token=... angeben" });

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const data = await tgRes.json();
    if (!data.ok) return res.status(400).json({ error: "Ungültiger Bot-Token oder Telegram-Fehler", details: data });

    const chats = (data.result || []).map((u) => ({
      chat_id: u.message?.chat?.id || u.my_chat_member?.chat?.id,
      from: u.message?.from?.first_name || u.my_chat_member?.from?.first_name,
      text: u.message?.text,
    })).filter((c) => c.chat_id);

    res.status(200).json({
      hint: "Wenn leer: schreib deinem Bot zuerst eine Nachricht (z.B. /start), dann diese Seite neu laden.",
      chats,
    });
  } catch (err) {
    res.status(500).json({ error: "Fehler bei der Telegram-Anfrage" });
  }
}
