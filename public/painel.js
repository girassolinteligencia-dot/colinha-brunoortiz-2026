(() => {
  "use strict";

  const formAuth = document.getElementById("form-auth");
  const inputToken = document.getElementById("input-token");
  const authScreen = document.getElementById("auth-screen");
  const dashboardContent = document.getElementById("dashboard-content");
  const authError = document.getElementById("auth-error");
  const btnAtualizar = document.getElementById("btn-atualizar");
  const btnExportCsv = document.getElementById("btn-export-csv");

  let currentToken = localStorage.getItem("colinha_admin_token") || "";

  function checkAuth(token) {
    if (!token) return;
    const cleanToken = token.trim();
    fetch(`/api/relatorio?token=${encodeURIComponent(cleanToken)}&format=json`)
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(data => {
        localStorage.setItem("colinha_admin_token", cleanToken);
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
    if (!list || !list.length) {
      el.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Nenhum voto registrado ainda.</div>';
      return;
    }
    const maxVotes = Math.max(...list.map(i => i.votos || i.total_votos || 1));
    el.innerHTML = list.map(item => {
      const votes = item.votos || item.total_votos || 0;
      const pct = Math.round((votes / maxVotes) * 100);
      return `
        <div class="ranking-item">
          <div class="ranking-header">
            <span class="ranking-name">${item.nome} (${item.nr})</span>
            <span class="ranking-votes">${votes} votos</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderDashboard(data) {
    const { totais, ranking, ultimas_colinhas } = data;

    document.getElementById("kpi-total").innerText = totais?.total_registros || 0;
    document.getElementById("kpi-identificados").innerText = totais?.eleitores_identificados || 0;
    document.getElementById("kpi-salvas").innerText = totais?.fotos_salvas || 0;
    document.getElementById("kpi-zap").innerText = totais?.compartilhamentos_zap || 0;

    renderRankingList("rank-dep-est", ranking?.deputado_estadual);
    renderRankingList("rank-senadores", ranking?.senadores);
    renderRankingList("rank-gov", ranking?.governador);
    renderRankingList("rank-pres", ranking?.presidente);

    const tbody = document.getElementById("tbody-ultimas");
    if (!ultimas_colinhas || !ultimas_colinhas.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">Nenhuma colinha registrada ainda.</td></tr>';
      return;
    }

    tbody.innerHTML = ultimas_colinhas.map(row => {
      const senadores = [row.sen1_nome, row.sen2_nome].filter(Boolean).join(" / ") || "—";
      let acaoBadge = "Gerou";
      if (row.acao === "salvou_foto") acaoBadge = "📸 Baixou Foto";
      else if (row.acao === "compartilhou_whatsapp") acaoBadge = "💬 WhatsApp";

      return `
        <tr>
          <td>${row.data_hora || "—"}</td>
          <td><span class="badge-eleitor">${row.eleitor_nome || "Anônimo"}</span></td>
          <td><strong>${row.dep_est_nome || "—"}</strong></td>
          <td>${senadores}</td>
          <td>${row.gov_nome || "—"}</td>
          <td>${row.pres_nome || "—"}</td>
          <td><span class="badge-acao">${acaoBadge}</span></td>
          <td style="color: var(--text-muted);">${row.dispositivo || "—"}</td>
        </tr>
      `;
    }).join("");
  }
})();
