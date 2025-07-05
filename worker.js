const BOT_TOKEN = "<your_bot_token>";
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

const TARGET_CHAT_ID = <your_target_chat_id>; // کانال اصلی
const LOG_CHANNEL_ID = <your_log_channel_id>; // فقط این چنل اجازه دارد
const MESSAGE_ID_API_URL = "<your_mockapi_url>";

const priceConfig = {
  USDT: { name: "💵 تتر", unit: "دلار", decimals: 0, apiSymbol: "USDTTMN" },
  BTC:  { name: "🌕 بیت‌کوین", unit: "دلار", decimals: 0, apiSymbol: "BTCUSDT" },
  ETH:  { name: "⚡️ اتریوم", unit: "دلار", decimals: 2, apiSymbol: "ETHUSDT" },
  TRX:  { name: "🐦‍🔥 ترون", unit: "تومان", decimals: 0, apiSymbol: "TRXTMN" },
  TON:  { name: "🔷 تون", unit: "تومان", decimals: 0, apiSymbol: "TONTMN" },
  SOL:  { name: "🌞 سولانا", unit: "تومان", decimals: 0, apiSymbol: "SOLTMN" },
  ADA:  { name: "🦕 کاردانو", unit: "تومان", decimals: 0, apiSymbol: "ADATMN" },
  XRP:  { name: "🕷 ریپل", unit: "تومان", decimals: 0, apiSymbol: "XRPTMN" },
  DOGE: { name: "🐶 دوج‌کوین", unit: "تومان", decimals: 0, apiSymbol: "DOGETMN" },
};

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

addEventListener("scheduled", event => {
  event.waitUntil(sendDailyUpdate(event.scheduledTime));
});

async function handleRequest(request) {
  if (request.method !== "POST") return new Response("Only POST allowed", { status: 405 });

  try {
    const update = await request.json();
    const message = update.message;
    const text = message?.text || "";
    const fromChatId = message?.chat?.id;

    if (!text || fromChatId !== LOG_CHANNEL_ID) return new Response("Unauthorized", { status: 200 });

    if (text === "/start") {
      const userName = message.from?.username || message.from?.first_name || "کاربر عزیز";
      await sendMessage(LOG_CHANNEL_ID, `سلام ${userName}! به ربات خوش آمدید.`, message.message_id);
    }

    if (text === "/arz") {
      if (await isLastMessageRecent()) {
        await sendMessage(LOG_CHANNEL_ID, "⏱ پیام قبلی اخیراً ارسال شده. ارسال جدید انجام نشد.");
      } else {
        await sendDailyUpdate(new Date());
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    await sendMessage(LOG_CHANNEL_ID, `⚠️ خطای کلی:\n${err.message}`);
    return new Response("Internal Server Error", { status: 500 });
  }
}

function isAround430AM(date, toleranceMinutes = 1) {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  return Math.abs(totalMinutes - (4 * 60 + 30)) <= toleranceMinutes;
}

async function getLastMessageMeta() {
  const res = await fetch(MESSAGE_ID_API_URL);
  const data = await res.json();
  return {
    id: data.messageid || null,
    time: data.datetime ? new Date(data.datetime) : null
  };
}

async function updateLastMessageMeta(messageId) {
  await fetch(MESSAGE_ID_API_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messageid: messageId,
      datetime: new Date().toISOString()
    })
  });
}

async function isLastMessageRecent() {
  try {
    const { time } = await getLastMessageMeta();
    if (!time) return false;
    const now = new Date();
    const diffMinutes = (now.getTime() - time.getTime()) / 60000;
    return diffMinutes < 5;
  } catch {
    return false;
  }
}

async function sendNewMessage(text) {
  const res = await sendMessage(TARGET_CHAT_ID, text);
  const json = await res.json();
  if (!json.ok) throw new Error("ارسال پیام جدید موفق نبود");
  await updateLastMessageMeta(json.result.message_id);
}

async function editLastMessage(text) {
  try {
    const { id } = await getLastMessageMeta();
    if (!id) return await sendNewMessage(text);

    const res = await fetch(`${API_URL}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TARGET_CHAT_ID,
        message_id: id,
        text,
        parse_mode: "HTML"
      })
    });

    const json = await res.json();
    if (!json.ok) await sendNewMessage(text);
  } catch {
    await sendNewMessage(text);
  }
}

async function sendDailyUpdate(eventTime) {
  try {
    if (await isLastMessageRecent()) {
      await sendMessage(LOG_CHANNEL_ID, "⏱ پیام قبلی اخیراً ارسال شده. ارسال جدید انجام نشد.");
      return;
    }
    const now = new Date(eventTime);
    const text = await generateMarketText(now);
    if (isAround430AM(now)) {
      await sendNewMessage(text);
    } else {
      await editLastMessage(text);
    }
  } catch (err) {
    await sendMessage(LOG_CHANNEL_ID, `⚠️ خطا در اجرای کرون:\n${err.message}`);
  }
}

async function generateMarketText(now) {
  const tehranNow = new Date(now.getTime() + 3.5 * 60 * 60 * 1000);
  const date = tehranNow.toLocaleDateString("fa-IR");
  const time = tehranNow.toLocaleTimeString("fa-IR", { hour: '2-digit', minute: '2-digit' });

  const [goldData, cryptoData] = await Promise.all([
    fetch("https://brsapi.ir/Api/Market/Gold_Currency.php?key=<your_api_key>").then(r => r.json()),
    fetch("https://api.wallex.ir/v1/markets").then(r => r.json())
  ]);

  const goldMap = {};
  for (const g of goldData.gold) goldMap[g.symbol] = g;
  for (const c of goldData.currency) goldMap[c.symbol] = c;

  const coinStats = cryptoData.result.symbols;

  const format = (x, d = 0) => {
    const n = parseFloat(x);
    if (isNaN(n)) return "نامشخص";
    const [int, dec = ""] = n.toFixed(d).split(".");
    return dec ? `${int.replace(/\B(?=(\d{3})+(?!\d))/g, "٬")}.${dec}` : int.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  };

  const c = s => format(goldMap[s]?.price || 0);

  let text = `📊‌ ‌به‌روزرسانی بازار | امروز\n\n`;
  text += `💵 نرخ ارز:\n──────────────\n`;
  text += `🇺🇸 دلار: ${c("USD")} تومان\n`;
  text += `🇪🇺 یورو: ${c("EUR")} تومان\n`;
  text += `🇦🇪 درهم: ${c("AED")} تومان\n`;
  text += `🇬🇧 پوند: ${c("GBP")} تومان\n\n`;

  text += `👑 قیمت طلا:\n──────────────\n`;
  text += `🥇 <b>طلای ۱۸ عیار:</b> ${c("IR_GOLD_18K")} تومان\n`;
  text += `🥇 <b>طلای ۲۴ عیار:</b> ${c("IR_GOLD_24K")} تومان\n`;
  text += `🌊 <b>آب‌شده:</b> ${c("IR_GOLD_MELTED")} تومان\n`;
  text += `🌎 <b>انس:</b> ${c("XAUUSD")} دلار\n\n`;

  text += `🪙 <b>قیمت سکه:</b>\n──────────────\n`;
  text += `👑 <b>سکه امامی:</b> ${c("IR_COIN_EMAMI")} تومان\n`;
  text += `🌸 <b>سکه بهار:</b> ${c("IR_COIN_BAHAR")} تومان\n`;
  text += `🟨 <b>نیم‌سکه:</b> ${c("IR_COIN_HALF")} تومان\n`;
  text += `🟠 <b>ربع‌سکه:</b> ${c("IR_COIN_QUARTER")} تومان\n`;
  text += `🔸 <b>یک گرمی:</b> ${c("IR_COIN_1G")} تومان\n\n`;

  text += `💹 رمزارزها:\n──────────────\n`;
  for (const key of Object.keys(priceConfig)) {
    const { name, apiSymbol, unit, decimals } = priceConfig[key];
    const price = format(coinStats[apiSymbol]?.stats?.lastPrice || 0, decimals);
    text += `${name} (${key}): ${price} ${unit}\n`;
  }

  text += `\n🕒 ${date} - ${time}`;
  text += `\n\n💹 @eco_ban | ارزبان`;

  return text;
}

async function sendMessage(chat_id, text, reply_to_message_id = null) {
  const body = {
    chat_id,
    text,
    parse_mode: "HTML",
  };
  if (reply_to_message_id) body.reply_to_message_id = reply_to_message_id;

  return fetch(`${API_URL}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
