# 📻 Funkgefühl

Eine App, die dir hilft, dein Deutsch von "C1 korrekt" auf "klingt wie ein Local" zu bringen — über kurze Mini-Spiele, einen Fortschritts-Dial ("Sprachgefühl"), XP, Tagesserien (Streaks) und optionale tägliche Erinnerungen per Telegram.

**Bonus:** Funkgefühl kann als vollständige App installiert werden — auf dem Handy, Tablet oder Desktop, ohne Store oder Downloads.

## 🎮 Die Sender (Mini-Spiele)

- **Wie sagt man das?** — unnatürlich übersetzter Satz vs. wie ein Muttersprachler es sagt
- **Passt das?** — wo passt diese Redewendung hin (Freunde / Seminar / nirgendwo)?
- **Ergänze den Satz** — welche Fortsetzung klingt am natürlichsten?
- **Kenn ich das?** — Begriff anhand einer hebräischen Definition erraten
- **Schnell-Runde** — 60 Sekunden, hebräisches Wort, zwei deutsche Optionen, welche ist die gängige?

Die Startseite zeigt dir per "Smart Study" automatisch das Spiel, das gerade am meisten Übung braucht (am längsten nicht gespielt oder niedrigste Trefferquote).

---

## 🚀 Deploy in 5 Schritten

### Schritt 1 — Anthropic API Key holen
1. Gehe zu **https://console.anthropic.com/**
2. Registrieren / einloggen
3. **API Keys** → **Create Key**
4. Key kopieren (beginnt mit `sk-ant-...`)
5. Etwas Guthaben hinzufügen (Settings → Billing) — für persönliche Nutzung sehr günstig

### Schritt 2 — Code auf GitHub
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/DEIN_USERNAME/funkgefuehl.git
git push -u origin main
```

### Schritt 3 — Deploy auf Vercel
1. **https://vercel.com** → mit GitHub-Account anmelden
2. **Add New Project** → `funkgefuehl`-Repo auswählen → **Import**
3. Einstellungen unverändert lassen → **Deploy**

### Schritt 4 — API Key eintragen
1. Im Vercel-Projekt: **Settings → Environment Variables**
2. Hinzufügen: `ANTHROPIC_API_KEY` = dein Key aus Schritt 1
3. **Save**, dann **Deployments → ⋯ → Redeploy**

### Schritt 5 — Fertig 🎉
Vercel gibt dir eine URL wie `https://funkgefuehl-deinname.vercel.app` — als Lesezeichen/Homescreen-Icon speichern.

---

## 📲 Optional: Tägliche Erinnerung per Telegram

Die App kann dir jeden Tag eine Nachricht schicken, wenn du noch nicht trainiert hast. Dafür gibt's einen stündlichen Vercel-Cron-Job, der nur zur richtigen Stunde tatsächlich sendet.

### 1. Bot erstellen
1. Öffne Telegram, suche **@BotFather**
2. Schreib `/newbot`, folge den Anweisungen (Name + Username wählen)
3. Du bekommst einen **Bot-Token** (sieht aus wie `123456:ABC-DEF...`)

### 2. Chat-ID finden
1. Schreib deinem neuen Bot eine beliebige Nachricht (z.B. `/start`)
2. Öffne im Browser: `https://api.telegram.org/botDEIN_TOKEN/getUpdates`
   - oder, nach dem Deploy: `https://deine-app.vercel.app/api/telegram/find-chat-id?token=DEIN_TOKEN`
3. Suche `"chat":{"id": ...}` — das ist deine **Chat-ID**

### 3. Umgebungsvariablen setzen (Vercel → Settings → Environment Variables)
| Variable | Wert |
|---|---|
| `TELEGRAM_BOT_TOKEN` | dein Bot-Token |
| `TELEGRAM_CHAT_ID` | deine Chat-ID |
| `REMINDER_HOUR` | Stunde (0–23) in deutscher Zeit, z.B. `19` |
| `APP_URL` | `https://deine-app.vercel.app` |

Danach **Redeploy**. Der Cron-Job läuft stündlich und schickt die Nachricht nur, wenn die aktuelle Stunde in Deutschland mit `REMINDER_HOUR` übereinstimmt — also einmal pro Tag.

Ohne diese Variablen funktioniert die App ganz normal, nur ohne Erinnerung.

---

## 📱 App installieren (PWA)

Funkgefühl ist eine **Progressive Web App** — du kannst sie wie eine normale App installieren und verwenden, ohne sie aus einem App Store herunterladen zu müssen. Sie funktioniert auf dem Handy, Tablet und Desktop.

### Handy / Tablet
1. Öffne https://deine-app.vercel.app im Browser (Chrome, Safari, Firefox, Edge)
2. Oben rechts oder unten wird dir ein **"Install"** oder **"Zum Startbildschirm"** Knopf angeboten
3. Tippen und die App ist installiert — sie hat ein Icon auf deinem Startbildschirm
4. Nur eine Verknüpfung, kein ständiger Download — die App lädt sich im Hintergrund automatisch nach

### Desktop (Windows / Mac)
1. Öffne https://deine-app.vercel.app im Browser
2. Oben rechts in der URL-Leiste erscheint ein **Symbol** (sieht aus wie ein Download oder ein App-Icon)
3. Klicke darauf → **"App installieren"** (oder ähnlich)
4. Die App öffnet sich wie ein normales Fenster (nicht im Browser)
5. Schneller und nimmt weniger Platz ein als eine heruntergeladene Anwendung

**Wichtig:** Funkgefühl funktioniert genauso im Browser — Installation ist nur zur Convenience, damit es sich wie eine "echte" App anfühlt.

---

## 💾 Daten & Fortschritt

Alle Fortschritte (XP, Streak, Sammlung, Spielstatistiken) werden **lokal im Browser** gespeichert (`localStorage`). Es gibt keine Datenbank — die App ist für einen einzelnen Nutzer auf einem Gerät gedacht. Über "Einstellungen → Fortschritt zurücksetzen" kann alles gelöscht werden.

---

## 💻 Lokale Entwicklung

```bash
npm install
cp .env.example .env.local
# .env.local bearbeiten und ANTHROPIC_API_KEY eintragen
npm run dev
```
Dann **http://localhost:3000** öffnen.

---

## 💰 Kosten

Etwa **$0.01–0.03 pro generierter Spielrunde** (5–10 Aufgaben). Bei täglicher Nutzung über ein Semester: ungefähr **$3–8** insgesamt.

---

## 🔧 Updates

```bash
git add .
git commit -m "update"
git push
```
Vercel deployed automatisch neu (~1 Minute).

---

## 🎨 Design

Konzept: ein nächtliches Funkgerät. Der Dial auf der Startseite ("Sprachgefühl") zeigt, wie nah du an der "Frequenz" von Muttersprachlern dran bist — basierend auf deiner Trefferquote über alle Spiele.
