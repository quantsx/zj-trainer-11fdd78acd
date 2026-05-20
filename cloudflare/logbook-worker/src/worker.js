const MAX_MESSAGE_LENGTH = 700;
const MAX_SIGNATURE_LENGTH = 120;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed' }, 405, headers);
    }

    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return json({ ok: false, error: 'Telegram secrets are not configured' }, 500, headers);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: 'Invalid JSON' }, 400, headers);
    }

    const message = cleanText(body.message, MAX_MESSAGE_LENGTH);
    const signature = cleanText(body.signature || 'без подписи', MAX_SIGNATURE_LENGTH);
    if (!message) return json({ ok: false, error: 'Message is empty' }, 400, headers);

    const text = [
      '<b>Бортовой журнал ŻJ</b>',
      `<b>От:</b> ${escapeHtml(signature)}`,
      `<b>Сообщение:</b>\n${escapeHtml(message)}`,
      body.questionId ? `<b>Вопрос:</b> ${escapeHtml(body.questionId)}` : '',
      Number.isFinite(body.learned) ? `<b>Выучено:</b> ${escapeHtml(body.learned)}` : '',
      Number.isFinite(body.totalWrong) ? `<b>Ошибок всего:</b> ${escapeHtml(body.totalWrong)}` : '',
      body.pageUrl ? `<b>Страница:</b> ${escapeHtml(body.pageUrl)}` : ''
    ].filter(Boolean).join('\n\n');

    const telegramResponse = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    if (!telegramResponse.ok) {
      const detail = await telegramResponse.text().catch(() => '');
      return json({ ok: false, error: `Telegram API ${telegramResponse.status}`, detail: detail.slice(0, 240) }, 502, headers);
    }

    return json({ ok: true }, 200, headers);
  }
};

function corsHeaders(origin, env) {
  const allowedOrigin = env.ALLOWED_ORIGIN || 'https://quantsx.github.io';
  const allowOrigin = origin === allowedOrigin ? origin : allowedOrigin;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(payload, status, headers) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

function cleanText(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}
