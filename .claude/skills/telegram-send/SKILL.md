---
name: telegram-send
description: Envía un mensaje de texto a Telegram (Bot API sendMessage) usando TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID de .claude/settings.local.json. Usar solo cuando un agente (aviso de fin) o el usuario lo pida explícitamente; nunca por iniciativa propia.
argument-hint: <mensaje>
allowed-tools: Bash(node *)
---

# /telegram-send

Mensaje: `$ARGUMENTS`

1. Si el mensaje está vacío, pide el texto al usuario y para.
2. Envíalo por stdin (evita problemas de comillas), sustituyendo el texto literal:

```bash
node "$CLAUDE_PROJECT_DIR/.claude/skills/telegram-send/send.mjs" <<'EOF'
<mensaje>
EOF
```

3. Reporta solo el resultado (`message_id`) o el error. Si falta variable de entorno, indica definir `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` en `.claude/settings.local.json` → `env` y reiniciar Claude Code. Nunca muestres el token.

## Uso desde agentes (aviso de fin)

- Mensaje = resumen final de 2-6 líneas, con cabecera `✅ <agente> terminado — <fecha>`. Sin secretos, emails ni datos de usuarios.
- Si falla (falta env, red): no reintentar; devolver "Telegram: no enviado — <error>". Si va bien: "Telegram: enviado".
