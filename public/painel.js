(() => {
  "use strict";

  const formAuth = document.getElementById("form-auth");
  const inputToken = document.getElementById("input-token");
  const authScreen = document.getElementById("auth-screen");
  const dashboardContent = document.getElementById("dashboard-content");
  const authError = document.getElementById("auth-error");
  const btnAtualizar = document.getElementById("btn-atualizar");
  const btnExportCsv = document.getElementById("btn-export-csv");

  let currentToken = localStorage.getItem("colinha_admin_token_bruno") || "";

  function checkAuth(token) {
    if (!token) return;
    const cleanToken = token.trim();
    fetch(`/api/relatorio?token=${encodeURIComponent(cleanToken)}&format=json`)
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(data => {
        localStorage.setItem("colinha_admin_token_bruno", cleanToken);
        currentToken = cleanToken;
        authScreen.style.display = "none";
        dashboardContent.style.display = "block";
        btnExportCsv.href = `/api/relatorio?token=${encodeURIComponent(cleanToken)}&format=csv`;
        renderDashboard(data);
      })
      .catch(() => {
        authScreen.style.display = "block";
        dashboardContent.style.display = "none";
        authError.style.display = "block";
      });
  }

  if (currentToken) {
    checkAuth(currentToken);
  }

  formAuth.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = inputToken.value.trim();
    if (val) checkAuth(val);
  });

  btnAtualizar.addEventListener("click", () => {
    if (currentToken) checkAuth(currentToken);
  });

  function renderRankingList(containerId, list) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!list || !list.length) {
      el.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Nenhum registro ainda.</div>';
      return;
    }
    const maxVotes = Math.max(...list.map(i => i.votos || i.total_votos || i.total || 1));
    el.innerHTML = list.map(item => {
      const votes = item.votos || item.total_votos || item.total || 0;
      const pct = Math.round((votes / maxVotes) * 100);
      const title = item.nome ? `${item.nome} ${item.numero ? '(' + item.numero + ')' : ''}` : (item.cidade || item.dispositivo || '—');
      return `
        <div class="ranking-item">
          <div class="ranking-header">
            <span class="ranking-name">${title}</span>
            <span class="ranking-votes">${votes} ${item.cidade || item.dispositivo ? 'acessos' : 'votos'}</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderDashboard(data) {
    const { metricas, ranking, ultimas_colinhas } = data;

    document.getElementById("kpi-total").innerText = metricas?.total || 0;
    document.getElementById("kpi-hoje").innerText = metricas?.hoje || 0;
    document.getElementById("kpi-compartilhamentos").innerText = metricas?.compartilhamentos || 0;
    document.getElementById("kpi-downloads").innerText = metricas?.downloads || 0;

    renderRankingList("rank-dep-fed", ranking?.deputado_federal);
    renderRankingList("rank-senadores", ranking?.senadores);
    renderRankingList("rank-gov", ranking?.governador);
    renderRankingList("rank-pres", ranking?.presidente);
    renderRankingList("rank-cidades", ranking?.cidades);
    renderRankingList("rank-dispositivos", ranking?.dispositivos);

    const tbody = document.getElementById("tbody-ultimas");
    if (!tbody) return;

    if (!ultimas_colinhas || !ultimas_colinhas.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">Nenhuma colinha registrada ainda.</td></tr>';
      return;
    }

    tbody.innerHTML = ultimas_colinhas.map(row => {
      const senadores = [row.sen1_nome, row.sen2_nome].filter(Boolean).join(" / ") || "—";
      let acaoBadge = "Gerou Colinha";
      if (row.acao === "baixar") acaoBadge = "📸 Baixou Foto";
      else if (row.acao === "compartilhar") acaoBadge = "💬 WhatsApp";

      return `
        <tr>
          <td>${row.data_hora ? row.data_hora.slice(0, 16).replace('T', ' ') : "—"}</td>
          <td><span class="badge-eleitor">${row.eleitor_nome || "Anônimo"}</span></td>
          <td><strong>${row.dep_fed_nome ? row.dep_fed_nome + ' (' + (row.dep_fed_nr || '') + ')' : "—"}</strong></td>
          <td>${row.dep_est_nome ? row.dep_est_nome + ' (10222)' : "Bruno Ortiz (10222)"}</td>
          <td>${senadores}</td>
          <td>${row.gov_nome || "—"}</td>
          <td>${row.pres_nome || "—"}</td>
          <td><span class="badge-acao">${acaoBadge}</span></td>
          <td style="color: var(--text-muted);">${row.cidade || "—"}</td>
        </tr>
      `;
    }).join("");
  }
})();
