// Envía un mensaje a Telegram (Bot API sendMessage).
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID. Texto: stdin o argv.
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!token || !chatId) {
  const missing = [
    !token && "TELEGRAM_BOT_TOKEN",
    !chatId && "TELEGRAM_CHAT_ID",
  ].filter(Boolean);
  console.error(`Falta ${missing.join(" y ")} (definir en .claude/settings.local.json → env)`);
  process.exit(1);
}

let text = process.argv.slice(2).join(" ");
if (!text && !process.stdin.isTTY) {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  text = Buffer.concat(chunks).toString("utf8");
}
text = text.trim();
if (!text) {
  console.error("Mensaje vacío");
  process.exit(1);
}

try {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`Telegram error ${data.error_code}: ${data.description}`);
    process.exit(1);
  }
  console.log(`Enviado (message_id ${data.result.message_id})`);
} catch (e) {
  console.error(`Fallo de red: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
