# Yacht Trainer Logbook Worker

Receives logbook messages from `local.html` and forwards them to Telegram.

Deploy once:

```sh
cd cloudflare/logbook-worker
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
npx wrangler deploy
```

After deploy, copy the Worker URL into `LOGBOOK_ENDPOINT` in `local.html`.
