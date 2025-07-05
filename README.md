# arzban
# Telegram Bot: Daily Market Price Update

This Telegram bot fetches and posts updates on currency, gold, and cryptocurrency prices to a designated channel. It supports both scheduled automatic updates and manual triggering via Telegram commands. The bot is built to run on platforms like Cloudflare Workers.

---

## 📦 Features

* Scheduled market updates (e.g., 4:30 AM Tehran time)
* Manual command `/arz` to trigger update
* Prevents duplicate sends if the last message was sent less than 5 minutes ago
* Edits last message instead of sending a new one (outside scheduled time)
* Persian date/time formatting
* Logs errors only to a secure log channel

---

## 🔧 Configuration

### Required Replacements in Code:

```js
const BOT_TOKEN = "<your_bot_token>";
const TARGET_CHAT_ID = <your_target_chat_id>; // e.g., -1001234567890
const LOG_CHANNEL_ID = <your_log_channel_id>; // only this channel can issue commands
const MESSAGE_ID_API_URL = "<your_mockapi_url>"; // used to track last message metadata
```

---

## 🔁 Cron Schedule

Use Cloudflare Cron Triggers to run `sendDailyUpdate()` at regular intervals. Recommended every 3-5 minutes to ensure edit/update behavior.

---

## ✉️ Supported Commands

| Command  | Description                               |
| -------- | ----------------------------------------- |
| `/start` | Greets the user in the log channel        |
| `/arz`   | Manually triggers a market update message |

> ❗ Commands must be sent from `LOG_CHANNEL_ID`. Others are ignored.

---

## 🕒 Time Handling

* Tehran time is manually calculated by adding `+3.5` hours to UTC
* Prevents updates if the last message was sent within the last 5 minutes

---

## 📡 Data Sources

* Gold & Currency: `https://brsapi.ir/Api/Market/Gold_Currency.php?key=<your_api_key>`
* Crypto: `https://api.wallex.ir/v1/markets`

> Replace `<your_api_key>` with your actual BRS API key

---

## 🧠 Price Items Config

Located in `priceConfig`:

```js
USDT, BTC, ETH, TRX, TON, SOL, ADA, XRP, DOGE
```

Each with emoji, name, unit, and API symbol.

---

## 🗂 Message Management

* Uses MockAPI to store last message ID and timestamp
* Decides whether to send a new message or edit the last

---

## 📜 Message Format

Includes:

* Exchange rates
* Gold prices (gram, melted, ounce)
* Coin prices (Imami, Bahar, etc.)
* Cryptocurrencies
* Timestamp in Persian locale

---

## 📣 Credit

Maintained by [@eco\_ban | ارزبان](https://t.me/eco_ban)
