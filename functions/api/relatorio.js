/**
 * API Relatório e Métricas Executivas - Campanha Bruno Ortiz 10222
 * Cloudflare Pages Functions - Cloudflare D1
 */

// Memória local do worker para Rate Limiting
const ipRequests = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX = 60; // 60 requisições por minuto por IP

function checkRateLimit(ip) {
  const now = Date.now();
  const record = ipRequests.get(ip);
  if (!record || now - record.startTime > RATE_LIMIT_WINDOW) {
    ipRequests.set(ip, { startTime: now, count: 1 });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  record.count++;
  return true;
}

// Comparação em tempo constante contra timing attacks
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let mismatch = a.length === b.length ? 0 : 1;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    mismatch |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  }
  return mismatch === 0;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const ip = request.headers.get("CF-Connecting-IP") || "anonymous";

  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "60" }
    });
  }

  // Token Mestre
  const MASTER_TOKEN = env.ADMIN_TOKEN || "bruno10222";
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || request.headers.get("x-admin-token") || "";

  if (!token || !timingSafeEqual(token, MASTER_TOKEN)) {
    return new Response(JSON.stringify({ error: "Acesso não autorizado. Chave de acesso inválida ou ausente." }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const db = env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: "Banco de dados D1 não conectado." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Exportação CSV
  const format = url.searchParams.get("format");
  if (format === "csv") {
    try {
      const allRows = await db.prepare(`
        SELECT id, data_hora, eleitor_nome, dep_fed_nr, dep_fed_nome, dep_est_nr, dep_est_nome,
               sen1_nr, sen1_nome, sen2_nr, sen2_nome, gov_nr, gov_nome, pres_nr, pres_nome,
               acao, dispositivo, cidade, regiao
        FROM colinhas_eleitorais_2026
        ORDER BY id DESC
      `).all();

      const headers = [
        "ID", "Data/Hora", "Eleitor", "Dep. Federal Nº", "Dep. Federal Nome",
        "Dep. Estadual Nº", "Dep. Estadual Nome", "Senador 1 Nº", "Senador 1 Nome",
        "Senador 2 Nº", "Senador 2 Nome", "Governador Nº", "Governador Nome",
        "Presidente Nº", "Presidente Nome", "Ação", "Dispositivo", "Cidade", "Região"
      ];

      const csvRows = [headers.join(";")];

      for (const r of (allRows.results || [])) {
        const row = [
          r.id,
          `"${(r.data_hora || '').replace(/"/g, '""')}"`,
          `"${(r.eleitor_nome || '').replace(/"/g, '""')}"`,
          r.dep_fed_nr || '',
          `"${(r.dep_fed_nome || '').replace(/"/g, '""')}"`,
          r.dep_est_nr || '',
          `"${(r.dep_est_nome || '').replace(/"/g, '""')}"`,
          r.sen1_nr || '',
          `"${(r.sen1_nome || '').replace(/"/g, '""')}"`,
          r.sen2_nr || '',
          `"${(r.sen2_nome || '').replace(/"/g, '""')}"`,
          r.gov_nr || '',
          `"${(r.gov_nome || '').replace(/"/g, '""')}"`,
          r.pres_nr || '',
          `"${(r.pres_nome || '').replace(/"/g, '""')}"`,
          `"${(r.acao || '').replace(/"/g, '""')}"`,
          `"${(r.dispositivo || '').replace(/"/g, '""')}"`,
          `"${(r.cidade || '').replace(/"/g, '""')}"`,
          `"${(r.regiao || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(";"));
      }

      // Adiciona BOM UTF-8 para compatibilidade perfeita com Microsoft Excel
      const csvContent = "\uFEFF" + csvRows.join("\r\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="colinhas_bruno_ortiz_${new Date().toISOString().slice(0,10)}.csv"`,
          "Cache-Control": "no-cache"
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Falha ao gerar CSV: " + err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // Dashboard JSON
  try {
    const totalGeral = await db.prepare("SELECT count(*) as total FROM colinhas_eleitorais_2026").first();
    const totalHoje = await db.prepare("SELECT count(*) as total FROM colinhas_eleitorais_2026 WHERE date(data_hora) = date('now')").first();
    const totalCompartilhamentos = await db.prepare("SELECT count(*) as total FROM colinhas_eleitorais_2026 WHERE acao = 'compartilhar'").first();
    const totalDownloads = await db.prepare("SELECT count(*) as total FROM colinhas_eleitorais_2026 WHERE acao = 'baixar'").first();

    // Top Dobradinhas Deputado Federal
    const rankDepFed = await db.prepare(`
      SELECT dep_fed_nr as numero, dep_fed_nome as nome, count(*) as votos 
      FROM colinhas_eleitorais_2026 
      WHERE dep_fed_nr IS NOT NULL AND dep_fed_nr != ''
      GROUP BY dep_fed_nr, dep_fed_nome 
      ORDER BY votos DESC 
      LIMIT 10
    `).all();

    // Top Senadores (União de sen1 e sen2)
    const rankSenadores = await db.prepare(`
      SELECT numero, nome, sum(votos) as total_votos FROM (
        SELECT sen1_nr as numero, sen1_nome as nome, count(*) as votos 
        FROM colinhas_eleitorais_2026 
        WHERE sen1_nr IS NOT NULL AND sen1_nr != ''
        GROUP BY sen1_nr, sen1_nome
        UNION ALL
        SELECT sen2_nr as numero, sen2_nome as nome, count(*) as votos 
        FROM colinhas_eleitorais_2026 
        WHERE sen2_nr IS NOT NULL AND sen2_nr != ''
        GROUP BY sen2_nr, sen2_nome
      )
      GROUP BY numero, nome
      ORDER BY total_votos DESC
      LIMIT 10
    `).all();

    // Top Governadores
    const rankGov = await db.prepare(`
      SELECT gov_nr as numero, gov_nome as nome, count(*) as votos 
      FROM colinhas_eleitorais_2026 
      WHERE gov_nr IS NOT NULL AND gov_nr != ''
      GROUP BY gov_nr, gov_nome 
      ORDER BY votos DESC 
      LIMIT 10
    `).all();

    // Top Presidentes
    const rankPres = await db.prepare(`
      SELECT pres_nr as numero, pres_nome as nome, count(*) as votos 
      FROM colinhas_eleitorais_2026 
      WHERE pres_nr IS NOT NULL AND pres_nr != ''
      GROUP BY pres_nr, pres_nome 
      ORDER BY votos DESC 
      LIMIT 10
    `).all();

    // Cidades mais ativas
    const rankCidades = await db.prepare(`
      SELECT COALESCE(cidade, 'Não informada') as cidade, count(*) as total
      FROM colinhas_eleitorais_2026
      GROUP BY cidade
      ORDER BY total DESC
      LIMIT 10
    `).all();

    // Dispositivos
    const dispositivos = await db.prepare(`
      SELECT COALESCE(dispositivo, 'Desconhecido') as dispositivo, count(*) as total
      FROM colinhas_eleitorais_2026
      GROUP BY dispositivo
      ORDER BY total DESC
    `).all();

    // Últimas 50 colinhas
    const ultimas = await db.prepare(`
      SELECT id, data_hora, eleitor_nome, dep_fed_nr, dep_fed_nome, dep_est_nr, dep_est_nome,
             sen1_nr, sen1_nome, sen2_nr, sen2_nome, gov_nr, gov_nome, pres_nr, pres_nome,
             acao, dispositivo, cidade
      FROM colinhas_eleitorais_2026 
      ORDER BY id DESC 
      LIMIT 50
    `).all();

    return new Response(JSON.stringify({
      metricas: {
        total: totalGeral ? totalGeral.total : 0,
        hoje: totalHoje ? totalHoje.total : 0,
        compartilhamentos: totalCompartilhamentos ? totalCompartilhamentos.total : 0,
        downloads: totalDownloads ? totalDownloads.total : 0
      },
      ranking: {
        deputado_federal: rankDepFed.results || [],
        senadores: rankSenadores.results || [],
        governador: rankGov.results || [],
        presidente: rankPres.results || [],
        cidades: rankCidades.results || [],
        dispositivos: dispositivos.results || []
      },
      ultimas_colinhas: ultimas.results || []
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao consultar dados: " + error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
