/**
 * Cloudflare Pages Function: Relatórios Analíticos e Exportação para Bruno Ortiz 10222
 * Endpoint: GET /api/relatorio?token=...&format=json|csv
 */

const FAILED_ATTEMPTS = new Map();

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const format = url.searchParams.get("format") || "json";

  const clientIP = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const attemptInfo = FAILED_ATTEMPTS.get(clientIP) || { count: 0, blockedUntil: 0 };

  if (now < attemptInfo.blockedUntil) {
    const esperaMin = Math.ceil((attemptInfo.blockedUntil - now) / 60000);
    return new Response(JSON.stringify({ error: `Bloqueado temporariamente. Aguarde ${esperaMin} minuto(s).` }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "300" }
    });
  }

  const SENHA_MESTRA = env.ADMIN_TOKEN || "bruno10222";
  const cleanToken = (token || "").trim().toLowerCase();
  const cleanMaster = SENHA_MESTRA.trim().toLowerCase();

  if (cleanToken !== cleanMaster) {
    attemptInfo.count++;
    if (attemptInfo.count >= 15) {
      attemptInfo.blockedUntil = now + 60 * 1000;
      attemptInfo.count = 0;
    }
    FAILED_ATTEMPTS.set(clientIP, attemptInfo);

    return new Response(JSON.stringify({ error: "Credencial inválida ou ausente." }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  FAILED_ATTEMPTS.delete(clientIP);

  if (!env.DB) {
    return new Response(JSON.stringify({
      totais: { total_geradas: 0, total_downloads: 0, total_whatsapp: 0, eleitores_unicos: 0 },
      topCandidatos: { presidente: [], governador: [], senador: [], dep_fed: [] },
      dispositivos: [],
      ultimosRegistros: []
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const totalGeral = await env.DB.prepare("SELECT COUNT(*) as count FROM colinhas_eleitorais_2026").first();
    const totalDownloads = await env.DB.prepare("SELECT COUNT(*) as count FROM colinhas_eleitorais_2026 WHERE acao = 'salvou_foto'").first();
    const totalWhats = await env.DB.prepare("SELECT COUNT(*) as count FROM colinhas_eleitorais_2026 WHERE acao = 'compartilhou_whatsapp'").first();
    const totalEleitores = await env.DB.prepare("SELECT COUNT(DISTINCT eleitor_nome) as count FROM colinhas_eleitorais_2026 WHERE eleitor_nome != 'Anônimo'").first();

    const ultimos = await env.DB.prepare(`
      SELECT id, data_hora, eleitor_nome, dep_fed_nome, dep_fed_nr, dep_est_nome, dep_est_nr,
             sen1_nome, sen1_nr, sen2_nome, sen2_nr, gov_nome, gov_nr, pres_nome, pres_nr,
             acao, dispositivo, cidade
      FROM colinhas_eleitorais_2026
      ORDER BY id DESC
      LIMIT 100
    `).all();

    if (format === "csv") {
      let csv = "ID;Data/Hora;Eleitor;Dep Federal;Dep Estadual;Senador 1;Senador 2;Governador;Presidente;Acao;Dispositivo;Cidade\n";
      for (const r of (ultimos.results || [])) {
        csv += `${r.id};"${r.data_hora}";"${r.eleitor_nome}";"${r.dep_fed_nome || ''} (${r.dep_fed_nr || ''})";"BRUNO ORTIZ (10222)";"${r.sen1_nome || ''} (${r.sen1_nr || ''})";"${r.sen2_nome || ''} (${r.sen2_nr || ''})";"${r.gov_nome || ''} (${r.gov_nr || ''})";"${r.pres_nome || ''} (${r.pres_nr || ''})";"${r.acao}";"${r.dispositivo}";"${r.cidade}"\n`;
      }
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="colinhas_brunoortiz_10222.csv"'
        }
      });
    }

    return new Response(JSON.stringify({
      totais: {
        total_geradas: totalGeral?.count || 0,
        total_downloads: totalDownloads?.count || 0,
        total_whatsapp: totalWhats?.count || 0,
        eleitores_unicos: totalEleitores?.count || 0
      },
      ultimosRegistros: ultimos.results || []
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
