/**
 * Cloudflare Pages Function: Salvar Telemetria da Colinha no Cloudflare D1
 * Endpoint: POST /api/salvar-colinha
 * CANDIDATO: BRUNO ORTIZ 10222 (DEPUTADO ESTADUAL)
 */

const IP_RATE_LIMIT = new Map();
const MAX_REQUESTS_PER_MINUTE = 20;

function sanitizeText(str, maxLen = 50) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/[<>'"\\/]/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim()
    .slice(0, maxLen);
}

function sanitizeNumber(val, maxDigits = 5) {
  if (val === null || val === undefined || val === "") return null;
  const num = parseInt(String(val).replace(/\D/g, ""), 10);
  if (isNaN(num) || num < 0 || num > Math.pow(10, maxDigits) - 1) return null;
  return num;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Rate Limiting por IP no Edge do Cloudflare
  const clientIP = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const ipData = IP_RATE_LIMIT.get(clientIP) || { count: 0, resetTime: now + 60000 };

  if (now > ipData.resetTime) {
    ipData.count = 1;
    ipData.resetTime = now + 60000;
  } else {
    ipData.count++;
  }
  IP_RATE_LIMIT.set(clientIP, ipData);

  if (IP_RATE_LIMIT.size > 2000) {
    for (const [key, val] of IP_RATE_LIMIT.entries()) {
      if (now > val.resetTime) IP_RATE_LIMIT.delete(key);
    }
  }

  if (ipData.count > MAX_REQUESTS_PER_MINUTE) {
    return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde um instante." }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "60" }
    });
  }

  // 2. Validação do Tamanho do Payload (máximo 15KB)
  const contentLength = Number(request.headers.get("content-length")) || 0;
  if (contentLength > 15360) {
    return new Response(JSON.stringify({ error: "Payload excessivo." }), {
      status: 413,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const data = await request.json();
    const { eleitor_nome, votos, acao } = data;

    let eleitorLimpo = sanitizeText(eleitor_nome, 40);
    if (!eleitorLimpo) eleitorLimpo = "Anônimo";

    const ACOES_PERMITIDAS = ["gerou", "salvou_foto", "compartilhou_whatsapp"];
    const acaoLimpa = ACOES_PERMITIDAS.includes(acao) ? acao : "gerou";

    // BLINDAGEM DO DEPUTADO ESTADUAL: SEMPRE BRUNO ORTIZ 10222 (IMUTÁVEL NO SERVIDOR)
    const depEstNr = 10222;
    const depEstNome = "BRUNO ORTIZ";

    // Sanitização dos Outros Votos
    const depFedNr = sanitizeNumber(votos?.depFed?.nr || votos?.deputadoFederal?.number, 4);
    const depFedNome = sanitizeText(votos?.depFed?.urna || votos?.deputadoFederal?.name, 50) || null;

    const sen1Nr = sanitizeNumber(votos?.sen1?.nr || votos?.senador1?.number, 3);
    const sen1Nome = sanitizeText(votos?.sen1?.urna || votos?.senador1?.name, 50) || null;

    const sen2Nr = sanitizeNumber(votos?.sen2?.nr || votos?.senador2?.number, 3);
    const sen2Nome = sanitizeText(votos?.sen2?.urna || votos?.senador2?.name, 50) || null;

    const govNr = sanitizeNumber(votos?.gov?.nr || votos?.governador?.number, 2);
    const govNome = sanitizeText(votos?.gov?.urna || votos?.governador?.name, 50) || null;

    const presNr = sanitizeNumber(votos?.pres?.nr || votos?.presidente?.number, 2);
    const presNome = sanitizeText(votos?.pres?.urna || votos?.presidente?.name, 50) || null;

    // Metadados do Edge Cloudflare
    const ua = sanitizeText(request.headers.get("user-agent") || "", 150);
    let dispositivo = "Desktop";
    if (/iphone|ipad|ipod/i.test(ua)) dispositivo = "iPhone / iOS";
    else if (/android/i.test(ua)) dispositivo = "Android";
    else if (/mobile/i.test(ua)) dispositivo = "Celular";

    const cidade = sanitizeText(request.headers.get("cf-ipcity") || "MS", 50);
    const regiao = sanitizeText(request.headers.get("cf-region") || "MS", 50);

    const agoraMS = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Campo_Grande",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    if (env.DB) {
      // Garante criação da tabela se não existir
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS colinhas_eleitorais_2026 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          data_hora TEXT,
          eleitor_nome TEXT,
          dep_fed_nr INTEGER,
          dep_fed_nome TEXT,
          dep_est_nr INTEGER,
          dep_est_nome TEXT,
          sen1_nr INTEGER,
          sen1_nome TEXT,
          sen2_nr INTEGER,
          sen2_nome TEXT,
          gov_nr INTEGER,
          gov_nome TEXT,
          pres_nr INTEGER,
          pres_nome TEXT,
          acao TEXT,
          dispositivo TEXT,
          cidade TEXT,
          regiao TEXT,
          user_agent TEXT
        )
      `).run();

      await env.DB.prepare(`
        INSERT INTO colinhas_eleitorais_2026 (
          data_hora, eleitor_nome,
          dep_fed_nr, dep_fed_nome,
          dep_est_nr, dep_est_nome,
          sen1_nr, sen1_nome,
          sen2_nr, sen2_nome,
          gov_nr, gov_nome,
          pres_nr, pres_nome,
          acao, dispositivo, cidade, regiao, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        agoraMS,
        eleitorLimpo,
        depFedNr,
        depFedNome,
        depEstNr,
        depEstNome,
        sen1Nr,
        sen1Nome,
        sen2Nr,
        sen2Nome,
        govNr,
        govNome,
        presNr,
        presNome,
        acaoLimpa,
        dispositivo,
        cidade,
        regiao,
        ua
      ).run();

      return new Response(JSON.stringify({ success: true, timestamp: agoraMS }), {
        headers: { "Content-Type": "application/json", "X-Content-Type-Options": "nosniff" }
      });
    }

    // Se D1 não estiver configurado localmente ainda, responde com sucesso simulado para não quebrar o front
    return new Response(JSON.stringify({ success: true, warning: "D1_LOCAL_FALLBACK", timestamp: agoraMS }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message || "Erro no processamento" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}
