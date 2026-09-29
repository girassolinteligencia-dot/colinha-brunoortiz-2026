/**
 * MINHA COLINHA 2026 — Lógica de Seleção, Persistência, Canvas e Compartilhamento
 */
(() => {
  "use strict";

  // Ordem oficial da Urna Eletrônica Brasileira com identificação de voto
  const CARGOS_CONFIG = [
    { id: "depFed", cargo: "Deputado Federal", ordemVoto: "1º VOTO", titulo: "1º VOTO - DEPUTADO FEDERAL", digitos: 4 },
    { id: "depEst", cargo: "Deputado Estadual", ordemVoto: "2º VOTO", titulo: "2º VOTO - DEPUTADO ESTADUAL", digitos: 5 },
    { id: "sen1", cargo: "Senador", ordemVoto: "3º VOTO", titulo: "3º VOTO - SENADOR (1ª VAGA)", digitos: 3 },
    { id: "sen2", cargo: "Senador", ordemVoto: "4º VOTO", titulo: "4º VOTO - SENADOR (2ª VAGA)", digitos: 3 },
    { id: "gov", cargo: "Governador", ordemVoto: "5º VOTO", titulo: "5º VOTO - GOVERNADOR", digitos: 2 },
    { id: "pres", cargo: "Presidente", ordemVoto: "6º VOTO", titulo: "6º VOTO - PRESIDENTE", digitos: 2 }
  ];

  // Candidato Oficial Pré-definido: Bruno Ortiz 10222 - Deputado Estadual (Imutável contra adulteração)
  const CANDIDATO_BRUNO_ORTIZ_10222 = Object.freeze({
    sq: "10222",
    nr: "10222",
    urna: "Bruno Ortiz",
    cargo: "Deputado Estadual",
    partido_sigla: "REPUBLICANOS",
    foto_url: "assets/bruno-ortiz.png",
    situacao: "Deferido",
    situacao_julgamento: "Deferido"
  });

  let CANDIDATOS = [];
  let colinhaState = carregarColinha();
  let slotAtivo = null;

  // ---------- Utilitários de Segurança e Formatação ----------
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizar(txt) {
    if (!txt) return "";
    return String(txt)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function debounce(fn, ms = 120) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function showToast(msg, duracao = 2500) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => {
      el.style.display = "none";
    }, duracao);
  }

  // Limpeza de chaves legadas permanentes no localStorage para garantir privacidade e sigilo total
  try {
    localStorage.removeItem("santinho_eleitor_nome");
    localStorage.removeItem("brunoOrtizColinha2026");
    localStorage.removeItem("santinho_brunoortiz_10222_v1");
    localStorage.removeItem("santinho_brunoortiz_boas_vindas_vista");
  } catch (e) {}

  let eleitorNomeGlobal = "";
  try {
    eleitorNomeGlobal = (sessionStorage.getItem("santinho_eleitor_nome") || "").trim();
  } catch (e) {}

  function getEleitorNome() {
    let nome = eleitorNomeGlobal;
    if (!nome) {
      try {
        nome = (sessionStorage.getItem("santinho_eleitor_nome") || "").trim();
      } catch (e) {}
    }
    return nome ? nome.split(" ")[0].toUpperCase() : "";
  }

  function setEleitorNome(novoNome) {
    eleitorNomeGlobal = (novoNome || "").trim();
    try {
      if (eleitorNomeGlobal) {
        sessionStorage.setItem("santinho_eleitor_nome", eleitorNomeGlobal);
      } else {
        sessionStorage.removeItem("santinho_eleitor_nome");
      }
    } catch (e) {}
  }

  // ---------- Persistência em Sessão (Volátil / Sigilo Absoluto LGPD) ----------
  function carregarColinha() {
    let base = {
      depFed: null,
      depEst: CANDIDATO_BRUNO_ORTIZ_10222,
      sen1: null,
      sen2: null,
      gov: null,
      pres: null
    };
    try {
      const salvo = sessionStorage.getItem("santinho_brunoortiz_10222_v1");
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (parsed && typeof parsed === "object") {
          if (parsed.depFed && parsed.depFed.cargo === "Deputado Federal") base.depFed = parsed.depFed;
          if (parsed.sen1 && parsed.sen1.cargo === "Senador") base.sen1 = parsed.sen1;
          if (parsed.sen2 && parsed.sen2.cargo === "Senador") base.sen2 = parsed.sen2;
          if (parsed.gov && parsed.gov.cargo === "Governador") base.gov = parsed.gov;
          if (parsed.pres && parsed.pres.cargo === "Presidente") base.pres = parsed.pres;
        }
      }
    } catch (e) {}
    base.depEst = CANDIDATO_BRUNO_ORTIZ_10222;
    return base;
  }

  function salvarColinha(dispararImpressaoSeCompleto = false) {
    try {
      colinhaState.depEst = CANDIDATO_BRUNO_ORTIZ_10222; // Garante permanência do Bruno Ortiz 10222
      if (colinhaState.pres && colinhaState.pres.cargo !== "Presidente") colinhaState.pres = null;
      if (colinhaState.gov && colinhaState.gov.cargo !== "Governador") colinhaState.gov = null;
      if (colinhaState.sen1 && colinhaState.sen1.cargo !== "Senador") colinhaState.sen1 = null;
      if (colinhaState.sen2 && colinhaState.sen2.cargo !== "Senador") colinhaState.sen2 = null;
      // Proibir estritamente o mesmo candidato ao Senado na vaga 1 e na vaga 2
      if (colinhaState.sen1 && colinhaState.sen2 && String(colinhaState.sen1.nr) === String(colinhaState.sen2.nr)) {
        colinhaState.sen2 = null;
      }
      if (colinhaState.depFed && colinhaState.depFed.cargo !== "Deputado Federal") colinhaState.depFed = null;
      sessionStorage.setItem("santinho_brunoortiz_10222_v1", JSON.stringify(colinhaState));
    } catch (e) {}
    renderSlots();
    atualizarProgresso(dispararImpressaoSeCompleto);
  }

  // ---------- Telemetria Eleitoral Estratégica (Cloudflare D1) ----------
  function enviarTelemetriaColinha(acao = "gerou") {
    try {
      const payload = {
        eleitor_nome: getEleitorNome() || "",
        votos: colinhaState,
        acao: acao
      };

      fetch("/api/salvar-colinha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    } catch (e) {}
  }

  // ---------- Carregamento do Dataset Enxuto ----------
  // ---------- Carregamento do Dataset Enxuto ----------
  async function initDados() {
    // Renderiza a estrutura da tela imediatamente para exibição instantânea sem delay visual
    renderSlots();
    atualizarProgresso();

    try {
      const res = await fetch("data.json");
      const payload = await res.json();
      
      if (payload && payload.candidates) {
        // Converte do formato { candidates: { deputadoFederal: [...], ... } } para array plano
        const list = [];
        const cargoMap = {
          deputadoFederal: "Deputado Federal",
          deputadoEstadual: "Deputado Estadual",
          senador1: "Senador",
          senador2: "Senador",
          governador: "Governador",
          presidente: "Presidente"
        };

        for (const [key, cands] of Object.entries(payload.candidates)) {
          if (Array.isArray(cands)) {
            cands.forEach(c => {
              list.push({
                sq: c.id ? String(c.id).replace("tse-", "") : c.number,
                nr: String(c.number),
                urna: c.ballotName || c.name,
                cargo: cargoMap[key] || c.office,
                partido_sigla: c.party || "",
                foto_url: c.photo || "",
                situacao: "Deferido"
              });
            });
          }
        }
        CANDIDATOS = list;
      } else if (Array.isArray(payload)) {
        CANDIDATOS = payload;
      }
    } catch (err) {
      console.warn("Falha ao carregar base de candidatos:", err);
    }

    renderSlots();
    atualizarProgresso();
  }

  // ---------- Renderização da Tela Principal (6 Tickets) ----------
  // Inicia diretamente a partir do 1º voto (Deputado Federal)
  let etapaAtual = 0; // Índice 0 = depFed

  // ---------- Cédula Física de Bolso Realista (Espelho do Modelo Oficial) ----------
  function gerarCardBolsoHtml() {
    const eleitorNome = getEleitorNome();
    const eleitorHeaderHtml = eleitorNome 
      ? `<div class="colinha-vert-eleitor-header"><span class="colinha-vert-eleitor-badge"><span class="colinha-vert-eleitor-star">★</span> ${escapeHtml(eleitorNome.toUpperCase())} VOTA ASSIM:</span></div>`
      : `<div class="colinha-vert-eleitor-header"><span class="colinha-vert-eleitor-badge"><span class="colinha-vert-eleitor-star">★</span> MINHA COLINHA 2026:</span></div>`;

    const rowsHtml = CARGOS_CONFIG.map((cfg, i) => {
      const cand = colinhaState[cfg.id];
      const digitsArr = cand && cand.nr ? String(cand.nr).split("") : [];
      let cargoTitle = cfg.cargo.toUpperCase();
      if (cfg.id === "sen1") cargoTitle = "SENADOR 1";
      else if (cfg.id === "sen2") cargoTitle = "SENADOR 2";

      let boxesHtml = "";
      for (let d = 0; d < cfg.digitos; d++) {
        const val = digitsArr[d] !== undefined ? digitsArr[d] : "";
        boxesHtml += `<span class="colinha-vert-digit-box ${val ? 'has-digit' : ''}">${val}</span>`;
      }

      let photoHtml = "";
      // cand.foto_url already contains 'fotos_tse/' in the JSON dataset
      if (cand && cand.foto_url && cand.foto_url !== "") {
        photoHtml = `<img src="${cand.foto_url}" class="colinha-vert-minifoto" alt="${cand.urna || ''}" onerror="this.style.display='none'">`;
      }

      // Regra Exclusiva: Em Deputado Estadual, BRUNO ORTIZ fica logo abaixo do cargo e ACIMA dos números 10222
      if (cfg.id === 'depEst') {
        return `
          <div class="colinha-vert-row colinha-vert-row-depEst">
            <div class="colinha-vert-cargo-label">${cargoTitle}</div>
            <div class="colinha-vert-cand-nome colinha-vert-cand-nome-destaque">BRUNO ORTIZ</div>
            <div class="colinha-vert-row-content">
              <div class="colinha-vert-boxes">${boxesHtml}</div>
            </div>
          </div>
        `;
      }

      // Demais cargos: Nome do candidato permanece ABAIXO dos números, NUNCA abreviado
      let nameHtml = "";
      if (cand && cand.urna) {
        const isLong = cand.urna.trim().length > 17;
        nameHtml = `<div class="colinha-vert-cand-nome ${isLong ? 'is-long-name' : ''}">${escapeHtml(cand.urna.toUpperCase())}</div>`;
      }

      return `
        <div class="colinha-vert-row colinha-vert-row-${cfg.id}">
          <div class="colinha-vert-cargo-label">${cargoTitle}</div>
          <div class="colinha-vert-row-content">
            ${photoHtml}
            <div class="colinha-vert-boxes-group">
              <div class="colinha-vert-boxes">${boxesHtml}</div>
              ${nameHtml}
            </div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="colinha-vert-card-container">
        <!-- Foto do Candidato Isolada na Direita -->
        <picture class="colinha-vert-candidato-picture">
          <img src="assets/bruno-ortiz.png" alt="Bruno Ortiz" class="colinha-vert-candidato-img">
        </picture>

        <!-- Logo Oficial no Canto Inferior Direito (Subida e Ampliada) -->
        <picture class="colinha-vert-logo-picture">
          <img src="assets/bruno-ortiz-logo.png" alt="Bruno Ortiz 10222" class="colinha-vert-logo-img">
        </picture>

        <!-- Coluna de Votação na Esquerda -->
        <div class="colinha-vert-left-col">
          ${eleitorHeaderHtml}
          <div class="colinha-vert-rows-wrap">
            ${rowsHtml}
          </div>
        </div>
      </div>
    `;
  }

  function renderizarColinhaFinalPreview() {
    const previewEl = document.getElementById("colinha-final-preview");
    if (previewEl) {
      previewEl.innerHTML = gerarCardBolsoHtml();
    }
  }

  // ---------- Animação Especial: Colinha Saindo da Urna (Modelo Final Oficial Idêntico) ----------
  function dispararAnimacaoImpressaoUrna() {
    const overlay = document.getElementById("print-modal-overlay");
    const paperRoll = document.getElementById("paper-slip-roll");
    const statusText = document.getElementById("print-status-text");
    const conclusaoSection = document.getElementById("conclusao-section");
    const funilViewport = document.getElementById("funil-viewport");

    if (!overlay || !paperRoll) return;

    // Injeta O MESMO modelo exato da colinha final (com o boneco, caixas gigantes e nomes destacados)
    paperRoll.innerHTML = gerarCardBolsoHtml();

    // Reinicia animação de saída contínua do santinho oficial para fora da urna
    paperRoll.style.animation = "none";
    void paperRoll.offsetWidth;
    paperRoll.style.animation = "rollOutPaper 3.8s cubic-bezier(0.16, 1, 0.3, 1) forwards";

    if (statusText) {
      statusText.innerHTML = `<span class="print-spinner"></span> Sua colinha está saindo da urna...`;
    }

    overlay.style.display = "flex";

    setTimeout(() => {
      if (statusText) {
        statusText.innerHTML = `✅ Sua colinha está pronta!`;
      }
    }, 3800);

    setTimeout(() => {
      overlay.style.display = "none";
      if (funilViewport) funilViewport.style.display = "none";
      if (conclusaoSection) {
        renderizarColinhaFinalPreview();
        conclusaoSection.style.display = "block";
        conclusaoSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      showToast("🎉 Sua colinha oficial está pronta!");
    }, 5200);
  }

  // ---------- Vitrine 3D & Stepper: Atualização de Progresso ----------
  function atualizarProgresso(dispararImpressaoSeCompleto = false) {
    const preenchidos = Object.values(colinhaState).filter(Boolean).length;
    const conclusaoSection = document.getElementById("conclusao-section");
    const vitrineContainer = document.querySelector(".container-vitrine");
    const appHeader = document.querySelector(".app-header");
    const welcomeSection = document.getElementById("welcome-section");
    const boasVindasVista = sessionStorage.getItem("santinho_brunoortiz_boas_vindas_vista") === "true";

    renderizarStepperFunil();
    renderizarVitrineNicho();

    if (conclusaoSection) {
      if (preenchidos === 6) {
        if (welcomeSection) welcomeSection.style.display = "none";
        renderizarColinhaFinalPreview();
        fecharSelecaoCandidato();
        // Oculta a vitrine de cédulas
        if (vitrineContainer) {
          const nicho = vitrineContainer.querySelector(".nicho-vitrine-frame");
          if (nicho) nicho.style.display = "none";
        }
        // Oculta o header da página na conclusão para evitar redundância visual da logo
        if (appHeader) {
          appHeader.style.display = "none";
        }

        if (dispararImpressaoSeCompleto) {
          enviarTelemetriaColinha("gerou");
          // Dispara a animação visual hiper-realista da colinha saindo de dentro da urna eletrônica
          dispararAnimacaoImpressaoUrna();
        } else {
          conclusaoSection.style.display = "block";
        }
      } else {
        conclusaoSection.style.display = "none";
        if (appHeader) {
          appHeader.style.display = "block";
        }

        if (!boasVindasVista && preenchidos <= 1) {
          if (welcomeSection) welcomeSection.style.display = "block";
          if (vitrineContainer) {
            const nicho = vitrineContainer.querySelector(".nicho-vitrine-frame");
            if (nicho) nicho.style.display = "none";
          }
          if (appHeader) {
            appHeader.style.display = "none"; // Evita redundância de logo no topo durante o onboarding
          }
        } else {
          if (welcomeSection) welcomeSection.style.display = "none";
          if (vitrineContainer) {
            vitrineContainer.style.display = "flex";
            const nicho = vitrineContainer.querySelector(".nicho-vitrine-frame");
            if (nicho) nicho.style.display = "block";
          }
          if (appHeader) {
            appHeader.style.display = "block";
            const stepper = appHeader.querySelector(".stepper-funil");
            if (stepper) stepper.style.display = "flex";
          }
        }
      }
    }
  }

  const STEP_COLORS = [
    { bg: "#0284c7", text: "#ffffff", border: "#38bdf8", glow: "rgba(2, 132, 199, 0.65)" }, // 1: Azul (Deputado Federal)
    { bg: "#006cb5", text: "#ffffff", border: "#ffcc29", glow: "rgba(0, 108, 181, 0.65)" }, // 2: Azul/Dourado (Bruno Ortiz 10222)
    { bg: "#eab308", text: "#000000", border: "#fef08a", glow: "rgba(234, 179, 8, 0.65)" }, // 3: Amarelo (Senador 1)
    { bg: "#15803d", text: "#ffffff", border: "#4ade80", glow: "rgba(34, 197, 94, 0.65)" }, // 4: Verde (Senador 2)
    { bg: "#0284c7", text: "#ffffff", border: "#38bdf8", glow: "rgba(2, 132, 199, 0.65)" }, // 5: Azul (Governador)
    { bg: "#eab308", text: "#000000", border: "#fef08a", glow: "rgba(234, 179, 8, 0.65)" }  // 6: Amarelo (Presidente)
  ];

  function renderizarStepperFunil() {
    const stepper = document.getElementById("stepper-funil");
    if (!stepper) return;

    stepper.innerHTML = CARGOS_CONFIG.map((cfg, idx) => {
      const preenchido = !!colinhaState[cfg.id];
      const ativo = idx === etapaAtual;
      const isLast = idx === CARGOS_CONFIG.length - 1;
      const isFixado = idx === 1; // 2º Voto (Deputado Estadual - Bruno Ortiz 10222) é fixado
      const col = STEP_COLORS[idx] || STEP_COLORS[0];

      let dynamicStyle = "";
      if (ativo) {
        dynamicStyle = `background:${col.bg};color:${col.text};border-color:${col.border};box-shadow:0 0 16px ${col.glow};transform:scale(1.18);`;
      } else if (preenchido) {
        dynamicStyle = `background:${col.bg};color:${col.text};border-color:${col.border};`;
      }

      return `
        <div class="step-node-item">
          <div class="step-circle ${ativo ? 'ativo' : ''} ${preenchido ? 'concluido' : ''} ${isFixado ? 'fixado-bloqueado' : ''}" 
               data-step="${idx}" 
               style="${dynamicStyle}"
               title="${isFixado ? '2º VOTO: Bruno Ortiz 10222 (Oficial)' : `${cfg.ordemVoto}: ${cfg.cargo}`}" 
               aria-label="${isFixado ? 'Bruno Ortiz 10222 (Fixado)' : `Ir para ${cfg.cargo}`}">
            ${isFixado ? '⭐' : (preenchido ? '✓' : (idx + 1))}
          </div>
          ${!isLast ? `<div class="step-connector-line ${preenchido ? 'preenchida' : ''}"></div>` : ''}
        </div>
      `;
    }).join("");

    // Cliques nas bolinhas: permite navegar livremente entre os votos parametrizáveis
    stepper.querySelectorAll(".step-circle").forEach(circle => {
      circle.addEventListener("click", () => {
        const step = parseInt(circle.dataset.step, 10);
        if (step === 1) {
          showToast("⭐ Seu Deputado Estadual é Bruno Ortiz 10222! Escolha os outros candidatos.");
          etapaAtual = 1;
        } else {
          etapaAtual = step;
        }
        renderizarStepperFunil();
        renderizarVitrineNicho();
      });
    });
  }

  // ---------- 1. Renderização da Vitrine 3D de Papel Real (3 Cédulas em Leque) ----------
  function gerarCardHtml(cfg, cand, posicaoClass) {
    if (!cfg) return "";

    const isDepEst = cfg.id === "depEst";
    const isPreenchido = !!cand;
    const fotoSrc = isDepEst 
      ? "assets/bruno-ortiz.png" 
      : (cand ? (cand.foto_url || "") : "");
    const titulo = cfg.cargo.toUpperCase();

    if (isDepEst) {
      // Cédula Oficial Fixa do Bruno Ortiz 10222 (Não editável pelo eleitor)
      return `
        <div class="cedula-cargo-titulo">${titulo} · OFICIAL</div>
        <div class="cedula-area-clicavel preenchido cedula-fixada-bruno" data-acao-fixado="true" role="region" title="2º Voto: Bruno Ortiz 10222">
          <div class="cedula-info-bloco">
            <span class="cedula-sublabel" style="color:#006cb5;font-weight:900;">★ 2º VOTO:</span>
            <div class="cedula-cand-nome">${cand.urna}</div>
            <span class="cedula-cand-partido">• ${cand.partido_sigla} · O TROCO CHEGOU</span>
          </div>

          <div class="cedula-corpo-voto">
            <div class="cedula-foto-frame cedula-foto-frame-bruno">
              <img src="${fotoSrc}" alt="${cand.urna}" style="width:100%;height:100%;object-fit:cover;">
            </div>
            <div class="cedula-numero-bloco">
              <span class="cedula-numero-label">Número:</span>
              <div class="cedula-numero-grande" style="color:#ffffff;background:#006cb5;padding:2px 8px;border-radius:6px;">${cand.nr}</div>
              <span class="cedula-status-fixo">✓ Já Confirmado!</span>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="cedula-cargo-titulo">${titulo}</div>
      <div class="cedula-area-clicavel ${isPreenchido ? 'preenchido' : 'vazio'}" data-acao-selecionar="${cfg.id}" role="button" tabindex="0" title="${isPreenchido ? 'Toque para mudar' : 'Toque para escolher'}">
        <div class="cedula-info-bloco">
          <span class="cedula-sublabel">${isPreenchido ? 'Candidato escolhido:' : 'Nenhum candidato escolhido ainda'}</span>
          <div class="cedula-cand-nome">${isPreenchido ? cand.urna : `+ Escolher ${cfg.cargo}`}</div>
          ${isPreenchido && cand.partido_sigla ? `<span class="cedula-cand-partido">• ${cand.partido_sigla}</span>` : ''}
        </div>

        <div class="cedula-corpo-voto">
          <div class="cedula-foto-frame">
            ${fotoSrc ? `<img src="${fotoSrc}" alt="${cand.urna}" onerror="this.style.display='none'">` : '<div class="cand-compact-photo-placeholder" style="width:100%;height:100%;font-size:26px;">👤</div>'}
          </div>
          <div class="cedula-numero-bloco">
            <span class="cedula-numero-label">Número:</span>
            <div class="cedula-numero-grande">${isPreenchido ? cand.nr : "----"}</div>
            <span class="cedula-toque-alterar">${isPreenchido ? 'Toque para mudar ↻' : 'Toque para escolher'}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderizarVitrineNicho() {
    const elLeft = document.getElementById("cedula-left");
    const elCenter = document.getElementById("cedula-center");
    const elRight = document.getElementById("cedula-right");
    const btnPrev = document.getElementById("btn-vitrine-prev");
    const btnNext = document.getElementById("btn-vitrine-next");

    if (!elCenter) return;

    // Cargo Atual (Centro)
    const cfgCenter = CARGOS_CONFIG[etapaAtual];
    const candCenter = colinhaState[cfgCenter.id];
    elCenter.innerHTML = gerarCardHtml(cfgCenter, candCenter, "cedula-central");
    elCenter.classList.remove("cedula-animar-troca");
    void elCenter.offsetWidth;
    elCenter.classList.add("cedula-animar-troca");

    // Cargo Anterior (Esquerda)
    if (etapaAtual > 0) {
      const cfgLeft = CARGOS_CONFIG[etapaAtual - 1];
      const candLeft = colinhaState[cfgLeft.id];
      elLeft.style.display = "flex";
      elLeft.innerHTML = gerarCardHtml(cfgLeft, candLeft, "cedula-esquerda");
      elLeft.onclick = () => {
        etapaAtual--;
        atualizarProgresso();
      };
    } else {
      elLeft.style.display = "none";
    }

    // Cargo Próximo (Direita)
    if (etapaAtual < CARGOS_CONFIG.length - 1) {
      const cfgRight = CARGOS_CONFIG[etapaAtual + 1];
      const candRight = colinhaState[cfgRight.id];
      elRight.style.display = "flex";
      elRight.innerHTML = gerarCardHtml(cfgRight, candRight, "cedula-direita");
      elRight.onclick = () => {
        etapaAtual++;
        atualizarProgresso();
      };
    } else {
      elRight.style.display = "none";
    }

    if (btnPrev) btnPrev.disabled = etapaAtual === 0;
    // Clique em qualquer ponto da cédula central para abrir a lista instantânea
    const areaClicavel = elCenter.querySelector("[data-acao-selecionar]");
    if (areaClicavel) {
      areaClicavel.addEventListener("click", () => {
        abrirSelecaoCandidato(cfgCenter.id);
      });
      areaClicavel.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          abrirSelecaoCandidato(cfgCenter.id);
        }
      });
    }
  }

  function renderSlots() {
    renderizarStepperFunil();
    renderizarVitrineNicho();
  }

  function avancarParaProximoCargo() {
    let proxima = -1;
    for (let i = etapaAtual + 1; i < CARGOS_CONFIG.length; i++) {
      if (!colinhaState[CARGOS_CONFIG[i].id]) {
        proxima = i;
        break;
      }
    }

    if (proxima === -1) {
      for (let i = 0; i < CARGOS_CONFIG.length; i++) {
        if (!colinhaState[CARGOS_CONFIG[i].id]) {
          proxima = i;
          break;
        }
      }
    }

    if (proxima !== -1) {
      etapaAtual = proxima;
      atualizarProgresso();
    } else {
      atualizarProgresso(true);
    }
  }

  // ==========================================================================
  // 2. MODAL DE SELEÇÃO ISOLADA DE CANDIDATOS (Mobile Full-Screen & Desktop)
  // ==========================================================================
  function abrirSelecaoCandidato(cargoId) {
    const cargoAlvo = cargoId || CARGOS_CONFIG[etapaAtual].id;
    // O 2º voto (Deputado Estadual) é fixo e exclusivo de Bruno Ortiz 10222
    if (cargoAlvo === "depEst") {
      showToast("⭐ Seu Deputado Estadual já é Bruno Ortiz 10222! Escolha os outros candidatos.");
      etapaAtual = 0; // Se clicou na fixa, volta pro 1º ou mantém navegação
      atualizarProgresso();
      return;
    }

    const modal = document.getElementById("modal-selecao");
    const tituloEl = document.getElementById("modal-selecao-titulo");
    const inputBusca = document.getElementById("modal-input-busca");
    const btnClear = document.getElementById("btn-clear-modal-search");

    if (!modal) return;

    slotAtivo = cargoAlvo;
    const cfg = CARGOS_CONFIG.find(c => c.id === slotAtivo) || CARGOS_CONFIG[etapaAtual];

    if (tituloEl) {
      tituloEl.textContent = `ESCOLHER ${cfg.cargo.toUpperCase()}`;
    }

    if (inputBusca) {
      inputBusca.value = "";
      inputBusca.placeholder = `Buscar por nome ou número (${cfg.cargo})...`;
    }
    if (btnClear) btnClear.style.display = "none";

    document.body.classList.add("modal-selecao-aberto");
    modal.style.display = "flex";

    letraAtivaFiltro = ""; // Reinicia o filtro por letra
    renderListaCandidatosModal("");

    // Foco acessível no input
    setTimeout(() => {
      if (inputBusca) {
        inputBusca.focus();
      }
    }, 60);
  }

  function fecharSelecaoCandidato() {
    const modal = document.getElementById("modal-selecao");
    if (!modal) return;

    modal.style.display = "none";
    document.body.classList.remove("modal-selecao-aberto");
  }

  let letraAtivaFiltro = ""; // Letra selecionada no índice alfabético (vazio = todos)

  function renderizarBarraAlfabeto(candsDoCargo) {
    const containerEl = document.getElementById("modal-alfabeto-container");
    const barEl = document.getElementById("modal-alfabeto-bar");
    if (!barEl) return;

    // Se tiver poucos candidatos (ex: Presidente/Governador com < 12 candidatos), oculta para não poluir
    if (candsDoCargo.length < 12) {
      if (containerEl) containerEl.style.display = "none";
      barEl.innerHTML = "";
      return;
    }

    // Coleta apenas as primeiras letras reais dos candidatos
    const letrasMap = new Set();
    candsDoCargo.forEach(c => {
      const inicial = (c.urna || "").trim().charAt(0).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (inicial && /[A-Z]/.test(inicial)) {
        letrasMap.add(inicial);
      }
    });

    const letrasOrdenadas = Array.from(letrasMap).sort();

    let botoesHtml = `
      <button class="btn-alfabeto-pille ${!letraAtivaFiltro ? 'ativo' : ''}" data-letra="" title="Ver todos os candidatos">
        TODOS
      </button>
    `;

    letrasOrdenadas.forEach(letra => {
      const isAtiva = letraAtivaFiltro === letra;
      botoesHtml += `
        <button class="btn-alfabeto-pille ${isAtiva ? 'ativo' : ''}" data-letra="${letra}">
          ${letra}
        </button>
      `;
    });

    barEl.innerHTML = botoesHtml;
    if (containerEl) containerEl.style.display = "block";

    // Função para centralizar suavemente uma letra no trilho
    const centralizarItem = (el) => {
      if (!el || !barEl) return;
      const elCenter = el.offsetLeft + el.offsetWidth / 2;
      const barCenter = barEl.clientWidth / 2;
      barEl.scrollTo({
        left: elCenter - barCenter,
        behavior: "smooth"
      });
    };

    // Atualiza estado visual e filtra
    const selecionarLetra = (btn, animarScroll = true) => {
      letraAtivaFiltro = btn.dataset.letra || "";
      barEl.querySelectorAll(".btn-alfabeto-pille").forEach(b => b.classList.remove("ativo"));
      btn.classList.add("ativo");

      if (animarScroll) {
        centralizarItem(btn);
      }

      const inputBusca = document.getElementById("modal-input-busca");
      const buscaTermo = inputBusca ? inputBusca.value.trim() : "";
      renderListaCandidatosModal(buscaTermo);
    };

    // Centraliza o item inicialmente ativo
    const itemAtivo = barEl.querySelector(".btn-alfabeto-pille.ativo");
    if (itemAtivo) {
      setTimeout(() => centralizarItem(itemAtivo), 80);
    }

    // Eventos de clique nas letras
    barEl.querySelectorAll(".btn-alfabeto-pille").forEach(btn => {
      btn.addEventListener("click", () => {
        selecionarLetra(btn, true);
      });
    });

    // Detecção magnética do item mais próximo do centro durante o scroll livre
    let scrollTimeout;
    barEl.onscroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const barCenter = barEl.scrollLeft + barEl.clientWidth / 2;
        let itemMaisProximo = null;
        let menorDist = Infinity;

        barEl.querySelectorAll(".btn-alfabeto-pille").forEach(btn => {
          const btnCenter = btn.offsetLeft + btn.offsetWidth / 2;
          const dist = Math.abs(barCenter - btnCenter);
          if (dist < menorDist) {
            menorDist = dist;
            itemMaisProximo = btn;
          }
        });

        if (itemMaisProximo && !itemMaisProximo.classList.contains("ativo")) {
          selecionarLetra(itemMaisProximo, false);
        }
      }, 140);
    };
  }

  // 5. RESULTADOS: LISTA COMPACTA E DENSA
  // Hierarquia visual obrigatória: 1. NOME, 2. NÚMERO, 3. PARTIDO/SIGLA, 4. FOTO PEQUENA (42x42px)
  function renderListaCandidatosModal(filtro = "") {
    const listaEl = document.getElementById("modal-candidatos-lista");
    if (!listaEl) return;

    const cfg = CARGOS_CONFIG.find(c => c.id === slotAtivo) || CARGOS_CONFIG[etapaAtual];
    if (!cfg) return;

    const q = normalizar(filtro);
    let cands = CANDIDATOS.filter(c => c.cargo === cfg.cargo);

    // Evitar duplicar senador na vaga 1 e vaga 2
    if (cfg.id === "sen1" && colinhaState.sen2) {
      cands = cands.filter(c => c.nr !== colinhaState.sen2.nr);
    } else if (cfg.id === "sen2" && colinhaState.sen1) {
      cands = cands.filter(c => c.nr !== colinhaState.sen1.nr);
    }

    // Ordenação alfabética por nome de urna para facilitar navegação A-Z
    cands.sort((a, b) => (a.urna || "").localeCompare(b.urna || ""));

    // Renderiza a barra de letras com base nos candidatos do cargo
    renderizarBarraAlfabeto(cands);

    // Filtra pela letra selecionada na régua A-Z se houver
    if (letraAtivaFiltro) {
      cands = cands.filter(c => {
        const inicial = (c.urna || "").trim().charAt(0).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return inicial === letraAtivaFiltro;
      });
    }

    // Filtra pelo termo de busca (nome, partido ou número digitado) com acentos e normalização
    if (q) {
      cands = cands.filter(c => 
        normalizar(c.urna).includes(q) || 
        normalizar(c.partido_sigla).includes(q) || 
        String(c.nr).includes(q)
      );
    }

    if (!cands.length) {
      listaEl.innerHTML = `
        <div class="modal-busca-estado-vazio">
          <div style="font-size:32px;">🔍</div>
          <div style="font-size:15px;color:#19261f;font-weight:700;">Não achamos esse candidato</div>
          <div style="font-size:13px;">Confira se o nome ou número de <strong>${cfg.cargo}</strong> estão certinhos.</div>
        </div>
      `;
      return;
    }

    // Renderiza lista vertical densa (exibe várias opções na viewport)
    listaEl.innerHTML = cands.map(c => {
      const fotoSrc = c.foto_url || (c.sq ? `fotos_tse/${c.sq}.webp` : "");
      const safeUrna = escapeHtml(c.urna);
      const safeSigla = escapeHtml(c.partido_sigla || "");
      const safeNr = escapeHtml(c.nr);
      const isSelected = colinhaState[cfg.id] && String(colinhaState[cfg.id].sq) === String(c.sq);

      return `
        <div class="cand-compact-row ${isSelected ? 'cand-compact-selected' : ''}" 
             data-sq="${c.sq}" 
             role="option" 
             aria-selected="${isSelected ? 'true' : 'false'}"
             tabindex="0"
             title="Escolher ${safeUrna} (${safeNr})">
          ${fotoSrc ? `
            <img src="${fotoSrc}" class="cand-compact-photo" alt="${safeUrna}" loading="lazy" onerror="this.outerHTML='<div class=\\'cand-compact-photo-placeholder\\'>👤</div>'">
          ` : `
            <div class="cand-compact-photo-placeholder">👤</div>
          `}
          <div class="cand-compact-info">
            <div class="cand-compact-nome">
              <span>${safeUrna}</span>
              ${isSelected ? `<span class="cand-compact-selected-badge">✓ ESCOLHIDO</span>` : ''}
            </div>
            <div class="cand-compact-partido">${safeSigla}</div>
          </div>
          <div class="cand-compact-numero">${safeNr}</div>
        </div>
      `;
    }).join("");

    // 7. SELEÇÃO DIRETA: Feedback visual instantâneo e transição elegante
    listaEl.querySelectorAll(".cand-compact-row").forEach(row => {
      const handleSelect = () => {
        if (row.classList.contains("cand-compact-confirming")) return; // Evita duplo clique
        const sq = row.dataset.sq;
        const escolhido = CANDIDATOS.find(x => String(x.sq) === String(sq));
        if (escolhido && cfg) {
          // Bloqueio de segurança total: impede contaminação entre cargos (ex: Governador no slot de Presidente)
          if (escolhido.cargo !== cfg.cargo) {
            console.error(`Cargo incompatível: Candidato ${escolhido.urna} é ${escolhido.cargo}, mas o cargo do slot é ${cfg.cargo}`);
            showToast(`Aviso: ${escolhido.urna} é candidato a ${escolhido.cargo}.`);
            return;
          }

          // Proibição estrita: Senador não pode ser repetido na Vaga 1 e Vaga 2
          if (cfg.id === "sen1" && colinhaState.sen2 && String(escolhido.nr) === String(colinhaState.sen2.nr)) {
            showToast("⚠️ Este candidato já foi escolhido para o Senado (2ª Vaga). Escolha outro.");
            return;
          }
          if (cfg.id === "sen2" && colinhaState.sen1 && String(escolhido.nr) === String(colinhaState.sen1.nr)) {
            showToast("⚠️ Este candidato já foi escolhido para o Senado (1ª Vaga). Escolha outro.");
            return;
          }

          colinhaState[cfg.id] = escolhido;

          const totalPreenchidos = Object.values(colinhaState).filter(Boolean).length;
          const vaiCompletar = totalPreenchidos === 6;

          // 1. Feedback visual imediato e agradável no próprio card selecionado
          row.classList.add("cand-compact-confirming");

          // 2. Aguarda 400ms para o eleitor absorver a confirmação visual antes de fechar o modal
          setTimeout(() => {
            salvarColinha(vaiCompletar);
            fecharSelecaoCandidato();

            // 3. Efeito visual fluido de avanço na cédula central
            const centerEl = document.getElementById("cedula-center");
            if (centerEl) {
              centerEl.classList.remove("cedula-animar-troca");
              void centerEl.offsetWidth;
              centerEl.classList.add("cedula-animar-troca");
            }

            showToast(`✓ ${escolhido.urna} escolhido com sucesso!`);

            // 4. Se ainda não completou os 6 votos, transiciona suavemente para o próximo cargo após 450ms
            if (!vaiCompletar) {
              setTimeout(() => {
                avancarParaProximoCargo();
              }, 450);
            }
          }, 380);
        }
      };

      row.addEventListener("click", handleSelect);
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSelect();
        }
      });
    });
  }

  // ---------- Gerador Gráfico da Colinha (HTML5 Canvas HD Otimizado) ----------
  function carregarImagemAsync(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async function desenharColinhaCanvas() {
    const canvas = document.getElementById("canvas-export");
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");

    // Proporção Exata 682:1024 (1000 x 1501 px HD) Fiel ao novo modelo de referência
    const W = 1000;
    const H = 1501;
    canvas.width = W;
    canvas.height = H;

    // 1. Fundo Branco com Camadas Transparentes Oficiais (Garante correspondência exata com o preview do DOM)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Foto do Candidato Isolada (Bruno Ortiz alinhado à Direita, preservando o tamanho original e sem o rosto sob os números)
    const fotoBruno = await carregarImagemAsync("assets/bruno-ortiz.png");
    if (fotoBruno) {
      const imgH = H * 1.0;
      const imgW = imgH * (fotoBruno.width / fotoBruno.height);
      const imgX = W * 1.24 - imgW; // Desloca para a direita sem alterar tamanho, liberando o rosto
      const imgY = 0;
      ctx.drawImage(fotoBruno, imgX, imgY, imgW, imgH);

      // Suave transição branca na base para a logo brilhar com contraste
      const gradFade = ctx.createLinearGradient(0, H * 0.80, 0, H * 0.98);
      gradFade.addColorStop(0, "rgba(255, 255, 255, 0)");
      gradFade.addColorStop(0.5, "rgba(255, 255, 255, 0.75)");
      gradFade.addColorStop(1, "rgba(255, 255, 255, 1)");
      ctx.fillStyle = gradFade;
      ctx.fillRect(W * 0.40, H * 0.76, W * 0.60, H * 0.24);
    }

    // Logo Oficial no Canto Inferior Direito (Ampliada e Bem Posicionada)
    const logoBruno = await carregarImagemAsync("assets/bruno-ortiz-logo.png");
    if (logoBruno) {
      const logoW = W * 0.62;
      const logoH = logoW * (logoBruno.height / logoBruno.width);
      const logoX = W - logoW - (W * 0.012);
      const logoY = H - logoH - (H * 0.022);
      ctx.drawImage(logoBruno, logoX, logoY, logoW, logoH);
    }

    const startX = 35;

    // Cabeçalho Oficial do Eleitor: Chancela / Pill Badge Azul Oficial de Votação
    const eleitorNome = getEleitorNome();
    const textoEleitor = eleitorNome ? `${eleitorNome.toUpperCase()} VOTA ASSIM:` : "MINHA COLINHA 2026:";

    ctx.save();
    ctx.font = '850 23px "Outfit", sans-serif';
    const textMetrics = ctx.measureText(textoEleitor);
    const badgeH = 42;
    const badgeW = textMetrics.width + 64;
    const badgeX = startX;
    const badgeY = 24;
    const badgeR = badgeH / 2;

    // Desenhar Pill Badge Azul com cantos arredondados
    ctx.beginPath();
    ctx.moveTo(badgeX + badgeR, badgeY);
    ctx.arcTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + badgeH, badgeR);
    ctx.arcTo(badgeX + badgeW, badgeY + badgeH, badgeX, badgeY + badgeH, badgeR);
    ctx.arcTo(badgeX, badgeY + badgeH, badgeX, badgeY, badgeR);
    ctx.arcTo(badgeX, badgeY, badgeX + badgeW, badgeY, badgeR);
    ctx.closePath();

    ctx.fillStyle = "#006cb5";
    ctx.shadowColor = "rgba(0, 108, 181, 0.45)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fill();

    // Reset shadow para o texto
    ctx.shadowColor = "transparent";

    // Borda sutil no badge
    ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Estrela Dourada Cívica
    ctx.font = '900 24px "Outfit", sans-serif';
    ctx.fillStyle = "#ffd700";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("★", badgeX + 16, badgeY + badgeH / 2);

    // Texto do Eleitor em Branco Puro
    ctx.font = '850 23px "Outfit", sans-serif';
    ctx.fillStyle = "#ffffff";
    ctx.fillText(textoEleitor, badgeX + 44, badgeY + badgeH / 2 + 1);
    ctx.restore();

    // 2. LINHAS DE VOTAÇÃO: 6 LINHAS DE CAIXAS DE DÍGITOS
    // Row 1 (Dep Fed, 4 dígitos): Label Y=78, Box Y=118
    // Row 2 (Dep Est, 5 dígitos - BRUNO ORTIZ): Label Y=290, BRUNO ORTIZ Y=332, Box Y=385
    const ROW_GEOMETRY = [
      { labelY: 78, boxY: 118 },
      { labelY: 288, nameY: 328, boxY: 382 },
      { labelY: 566, boxY: 607 },
      { labelY: 794, boxY: 835 },
      { labelY: 1022, boxY: 1063 },
      { labelY: 1242, boxY: 1283 }
    ];

    for (let i = 0; i < CARGOS_CONFIG.length; i++) {
      const cfg = CARGOS_CONFIG[i];
      const cand = colinhaState[cfg.id];
      const geom = ROW_GEOMETRY[i];

      const isDepEst = cfg.id === 'depEst';
      const curBoxH = isDepEst ? 148 : 115;

      // 2.1 TÍTULO DO CARGO (Branco com Sombra Forte e Contorno para leitura perfeita)
      let cargoTitle = cfg.cargo.toUpperCase();
      if (cfg.id === "sen1") cargoTitle = "SENADOR 1";
      else if (cfg.id === "sen2") cargoTitle = "SENADOR 2";

      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = isDepEst ? '950 36px "Outfit", sans-serif' : '950 32px "Outfit", sans-serif';
      
      // Sombra e Contorno forte
      ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.strokeText(cargoTitle, startX, geom.labelY);

      // Preenchimento branco
      ctx.fillStyle = "#ffffff";
      ctx.fillText(cargoTitle, startX, geom.labelY);
      ctx.restore();

      // 2.1.1 SE FOR DEPUTADO ESTADUAL: Nome BRUNO ORTIZ logo abaixo do título e ACIMA dos números 10222
      if (isDepEst) {
        ctx.save();
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.font = '950 46px "Outfit", sans-serif';
        ctx.shadowColor = "rgba(0, 77, 130, 0.9)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        // Contorno escuro azul marinho
        ctx.strokeStyle = "#004d82";
        ctx.lineWidth = 7;
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.strokeText("BRUNO ORTIZ", startX, geom.nameY);

        // Preenchimento branco puro de alto impacto
        ctx.shadowColor = "transparent";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("BRUNO ORTIZ", startX, geom.nameY);
        ctx.restore();
      }

      // 2.2 MINI-FOTO DO CANDIDATO ESCOLHIDO (Se houver) & CAIXAS DE DÍGITOS
      const digitsArr = cand && cand.nr ? String(cand.nr).split("") : [];
      let currentX = startX;

      if (!isDepEst && cand && cand.foto_url) {
        const fotoCand = await carregarImagemAsync(cand.foto_url);
        if (fotoCand) {
          const photoW = 75;
          ctx.save();
          ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 4;
          ctx.beginPath();
          ctx.roundRect(currentX, geom.boxY, photoW, curBoxH, 14);
          ctx.clip();
          ctx.drawImage(fotoCand, currentX, geom.boxY, photoW, curBoxH);
          ctx.restore();

          currentX += photoW + 10;
        }
      }

      const boxW = isDepEst ? 106 : 88;
      const boxGap = isDepEst ? 9 : 7;
      const boxRadius = isDepEst ? 16 : 14;
      const boxBorderW = isDepEst ? 5.5 : 4;

      for (let d = 0; d < cfg.digitos; d++) {
        const bx = currentX + d * (boxW + boxGap);
        const val = digitsArr[d] !== undefined ? digitsArr[d] : "";

        ctx.save();
        ctx.shadowColor = isDepEst ? "rgba(0, 108, 181, 0.28)" : "rgba(0, 0, 0, 0.14)";
        ctx.shadowBlur = isDepEst ? 12 : 8;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = isDepEst ? "#006cb5" : "#006cb5";
        ctx.lineWidth = boxBorderW;
        ctx.beginPath();
        ctx.roundRect(bx, geom.boxY, boxW, curBoxH, boxRadius);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        if (val) {
          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = isDepEst ? "#004d82" : "#000000";
          ctx.strokeStyle = isDepEst ? "#004d82" : "#000000";
          ctx.lineWidth = isDepEst ? 6.5 : 5;
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;
          ctx.font = isDepEst ? '950 100px "Outfit", sans-serif' : '950 82px "Outfit", sans-serif';
          ctx.strokeText(val, bx + boxW / 2, geom.boxY + curBoxH / 2 + 2);
          ctx.fillText(val, bx + boxW / 2, geom.boxY + curBoxH / 2 + 2);
          ctx.restore();
        }
      }

      // 2.3 NOME DOS DEMAIS CANDIDATOS (Branco com Sombra Forte e Contorno Escuro)
      if (!isDepEst && cand && cand.urna) {
        ctx.save();
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        let displayName = cand.urna.toUpperCase();
        let nameFontSize = 25;
        ctx.font = `900 ${nameFontSize}px "Outfit", sans-serif`;
        const maxNameW = cfg.digitos === 5 ? 460 : 410;
        while (ctx.measureText(displayName).width > maxNameW && nameFontSize > 16) {
          nameFontSize -= 1;
          ctx.font = `900 ${nameFontSize}px "Outfit", sans-serif`;
        }

        ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;

        // Contorno escuro de contraste
        ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
        ctx.lineWidth = 4.5;
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.strokeText(displayName, currentX, geom.boxY + curBoxH + 7);

        // Preenchimento branco sólido
        ctx.shadowColor = "transparent";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(displayName, currentX, geom.boxY + curBoxH + 7);
        ctx.restore();
      }
    }

    return canvas;
  }

  // ---------- Salvar Foto da Colinha no Celular / Computador ----------
  async function baixarImagemGaleria() {
    showToast("Preparando sua colinha em alta resolução...");
    enviarTelemetriaColinha("salvou_foto");
    const canvas = await desenharColinhaCanvas();
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const eleitorNome = getEleitorNome();
      const slugNome = eleitorNome 
        ? eleitorNome.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-") 
        : "oficial";
      const nomeArquivo = `colinha-2026-${slugNome}-bruno-ortiz-10222.jpg`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      showToast("✅ Colinha salva! Abra suas fotos ou downloads para conferir.");
    }, "image/jpeg", 0.96);
  }

  // ---------- Compartilhamento no WhatsApp com Engajamento Mobilizador ----------
  async function compartilharColinha() {
    enviarTelemetriaColinha("compartilhou_whatsapp");
    const canvas = await desenharColinhaCanvas();
    if (!canvas) return;

    const eleitorNome = getEleitorNome();
    const saudacao = eleitorNome 
      ? `🗳️ *Colinha Oficial de ${eleitorNome.trim()} para 2026!*` 
      : `🗳️ *Colinha Oficial para as Eleições 2026!*`;

    const listaCandidatos = [];
    CARGOS_CONFIG.forEach(c => {
      const cand = colinhaState[c.id];
      if (cand) {
        listaCandidatos.push(`• *${c.cargo}:* ${cand.urna} (${cand.nr})`);
      }
    });
    const resumoVotos = listaCandidatos.length > 0 ? "\n📋 *Meus Votos na Urna:*\n" + listaCandidatos.join("\n") + "\n" : "";

    const siteUrl = window.location.origin;

    const textoEngajamento = 
      `${saudacao}\n\n` +
      `Já organizei meus votos para a urna e meu Deputado Estadual é *BRUNO ORTIZ 10222* 🔵🟢\n` +
      resumoVotos +
      `\n*O troco chegou!* Monte a sua colinha também no link abaixo:\n👉 ${siteUrl}`;

    const slugNome = eleitorNome 
      ? eleitorNome.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-") 
      : "oficial";
    const nomeArquivo = `colinha-2026-${slugNome}-bruno-ortiz-10222.jpg`;

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], nomeArquivo, { type: "image/jpeg" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "Bruno Ortiz 10222 Deputado Estadual",
            text: textoEngajamento
          });
          showToast("✅ Compartilhado com sucesso!");
          return;
        } catch (err) {
          if (err.name === "AbortError") return;
        }
      }

      // Fallback padrão: Abre o WhatsApp diretamente com a mensagem formatada
      const zapUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoEngajamento)}`;
      window.open(zapUrl, "_blank");
      showToast("💬 Abrindo WhatsApp...");
    }, "image/jpeg", 0.96);
  }

  // ---------- Inicialização de Eventos ----------
  function initEventos() {
    // Função central para reiniciar a colinha do zero e voltar à tela inicial de boas-vindas
    function reiniciarColinhaDoZero() {
      colinhaState = {
        depFed: null,
        depEst: CANDIDATO_BRUNO_ORTIZ_10222,
        sen1: null,
        sen2: null,
        gov: null,
        pres: null
      };
      setEleitorNome("");
      try {
        sessionStorage.removeItem("santinho_brunoortiz_boas_vindas_vista");
        localStorage.removeItem("santinho_brunoortiz_boas_vindas_vista");
      } catch (e) {}

      if (inputEleitorNome) {
        inputEleitorNome.value = "";
      }
      if (avisoNome) {
        avisoNome.style.display = "none";
      }

      etapaAtual = 0; // Inicia na escolha do 1º voto (Deputado Federal)
      salvarColinha();
      atualizarProgresso();
      window.scrollTo({ top: 0, behavior: "smooth" });
      showToast("Reiniciado do zero! Digite seu nome para começar.");
      setTimeout(() => {
        if (inputEleitorNome) inputEleitorNome.focus();
      }, 300);
    }

    // Botão Começar de Novo (Topo)
    const btnLimpar = document.getElementById("btn-limpar");
    if (btnLimpar) {
      btnLimpar.addEventListener("click", () => {
        if (confirm("Quer apagar essa colinha e começar uma nova com outro nome?")) {
          reiniciarColinhaDoZero();
        }
      });
    }

    // Botão de Ajuda (Header) para reabrir Boas-vindas
    const btnAjuda = document.getElementById("btn-ajuda");
    if (btnAjuda) {
      btnAjuda.addEventListener("click", () => {
        const welcomeSection = document.getElementById("welcome-section");
        const vitrineContainer = document.querySelector(".container-vitrine");
        const appHeader = document.querySelector(".app-header");
        const conclusaoSection = document.getElementById("conclusao-section");
        
        if (conclusaoSection) conclusaoSection.style.display = "none";
        if (welcomeSection) welcomeSection.style.display = "block";
        if (vitrineContainer) {
          const nicho = vitrineContainer.querySelector(".nicho-vitrine-frame");
          if (nicho) nicho.style.display = "none";
        }
        if (appHeader) {
          const stepper = appHeader.querySelector(".stepper-funil");
          if (stepper) stepper.style.display = "none";
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Campo de nome do eleitor: Recupera nome se já informado ou inicia pronto para preencher
    const inputEleitorNome = document.getElementById("input-eleitor-nome");
    const boxInputNome = document.getElementById("box-input-nome");
    const avisoNome = document.getElementById("msg-aviso-nome");
    if (inputEleitorNome) {
      inputEleitorNome.value = getEleitorNome();
    }

    // Botão Começar a Preencher na Tela de Boas-Vindas
    const btnWelcomeStart = document.getElementById("btn-welcome-start");
    if (btnWelcomeStart) {
      btnWelcomeStart.addEventListener("click", () => {
        let nomeDigitado = inputEleitorNome ? inputEleitorNome.value.trim() : "";

        // Sanitização de segurança: remove caracteres de controle e tags html
        nomeDigitado = nomeDigitado.replace(/[<>{}[\]\/\\]/g, "").slice(0, 30).trim();

        // Condição: primeiro nome é necessário para avançar
        if (!nomeDigitado) {
          if (boxInputNome) {
            boxInputNome.classList.remove("shake-input");
            void boxInputNome.offsetWidth;
            boxInputNome.classList.add("shake-input");
          }
          if (avisoNome) {
            avisoNome.textContent = "Digite seu primeiro nome para personalizar sua colinha.";
            avisoNome.style.display = "block";
          }
          if (inputEleitorNome) inputEleitorNome.focus();
          return;
        }

        // Extrai apenas o primeiro nome e sanitiza
        const primeiroNome = escapeHtml(nomeDigitado.split(" ")[0].trim());
        setEleitorNome(primeiroNome);
        if (avisoNome) avisoNome.style.display = "none";

        sessionStorage.setItem("santinho_brunoortiz_boas_vindas_vista", "true");
        etapaAtual = 0; // Inicia no 1º voto (Deputado Federal)
        atualizarProgresso();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    if (inputEleitorNome) {
      inputEleitorNome.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (btnWelcomeStart) btnWelcomeStart.click();
        }
      });
      inputEleitorNome.addEventListener("input", () => {
        if (avisoNome && inputEleitorNome.value.trim()) {
          avisoNome.style.display = "none";
        }
      });
    }

    // Navegação Anterior e Próximo na Vitrine de Papel Real
    const btnPrev = document.getElementById("btn-vitrine-prev");
    if (btnPrev) {
      btnPrev.addEventListener("click", () => {
        if (etapaAtual > 0) {
          etapaAtual--;
          atualizarProgresso();
        }
      });
    }

    const btnNext = document.getElementById("btn-vitrine-next");
    if (btnNext) {
      btnNext.addEventListener("click", () => {
        if (etapaAtual < CARGOS_CONFIG.length - 1) {
          etapaAtual++;
          atualizarProgresso();
        }
      });
    }

    // Botões de Ação
    const btnSave = document.getElementById("btn-download");
    if (btnSave) btnSave.addEventListener("click", baixarImagemGaleria);

    const btnShare = document.getElementById("btn-share");
    if (btnShare) btnShare.addEventListener("click", compartilharColinha);

    const btnReverAnimacao = document.getElementById("btn-rever-animacao");
    if (btnReverAnimacao) {
      btnReverAnimacao.addEventListener("click", () => {
        dispararAnimacaoImpressaoUrna();
      });
    }

    const btnReiniciarFinal = document.getElementById("btn-reiniciar-final");
    if (btnReiniciarFinal) {
      btnReiniciarFinal.addEventListener("click", () => {
        if (confirm("Quer apagar essa colinha e começar uma nova com outro nome?")) {
          reiniciarColinhaDoZero();
        }
      });
    }

    // Eventos do Modal de Seleção de Candidatos
    const btnFecharSelecao = document.getElementById("btn-fechar-selecao");
    const modalSelecao = document.getElementById("modal-selecao");
    const modalInputBusca = document.getElementById("modal-input-busca");
    const btnClearModalSearch = document.getElementById("btn-clear-modal-search");

    if (btnFecharSelecao) {
      btnFecharSelecao.addEventListener("click", fecharSelecaoCandidato);
    }

    // Fechar ao clicar no backdrop (desktop/tablet)
    if (modalSelecao) {
      modalSelecao.addEventListener("click", (e) => {
        if (e.target === modalSelecao) {
          fecharSelecaoCandidato();
        }
      });
    }

    // Busca instantânea com debounce e normalização
    if (modalInputBusca) {
      const onModalSearch = debounce((v) => {
        renderListaCandidatosModal(v);
        if (btnClearModalSearch) btnClearModalSearch.style.display = v ? "block" : "none";
      }, 75);

      modalInputBusca.addEventListener("input", (e) => onModalSearch(e.target.value.trim()));
    }

    if (btnClearModalSearch) {
      btnClearModalSearch.addEventListener("click", () => {
        if (modalInputBusca) {
          modalInputBusca.value = "";
          btnClearModalSearch.style.display = "none";
          renderListaCandidatosModal("");
          modalInputBusca.focus();
        }
      });
    }

    // Tecla ESC para fechar modal no Desktop
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (modalSelecao && modalSelecao.style.display !== "none") {
          fecharSelecaoCandidato();
        }
      }
    });

    const btnEditarVotos = document.getElementById("btn-editar-votos");
    if (btnEditarVotos) {
      btnEditarVotos.addEventListener("click", () => {
        etapaAtual = 0; // Leva diretamente para o 1º voto (Deputado Federal)
        const conclusaoSection = document.getElementById("conclusao-section");
        const vitrineContainer = document.querySelector(".container-vitrine");
        const appHeader = document.querySelector(".app-header");
        if (conclusaoSection) conclusaoSection.style.display = "none";
        if (vitrineContainer) {
          vitrineContainer.style.display = "flex";
          const nicho = vitrineContainer.querySelector(".nicho-vitrine-frame");
          if (nicho) nicho.style.display = "block";
        }
        if (appHeader) {
          appHeader.style.display = "block";
          const stepper = appHeader.querySelector(".stepper-funil");
          if (stepper) stepper.style.display = "flex";
        }
        renderizarStepperFunil();
        renderizarVitrineNicho();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Proteção Anti-Clonagem e Anti-Inspeção do Front-End
    document.addEventListener("contextmenu", (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      e.preventDefault();
    }, { passive: false });

    // Bloqueia arrastar imagens e elementos para fora da página
    document.addEventListener("dragstart", (e) => {
      e.preventDefault();
    }, { passive: false });

    document.addEventListener("keydown", (e) => {
      const isInput = e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      // Bloquear atalhos de inspeção e código-fonte (F12, Ctrl/Cmd + Shift + I/J/C, Ctrl/Cmd + U, Ctrl/Cmd + S)
      if (
        e.key === "F12" ||
        (isCmdOrCtrl && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) ||
        (isCmdOrCtrl && (e.key === "u" || e.key === "U" || e.key === "s" || e.key === "S"))
      ) {
        if (!isInput) e.preventDefault();
      }

      // Bloquear Ctrl/Cmd + C (copiar) fora de inputs
      if (isCmdOrCtrl && (e.key === "c" || e.key === "C") && !isInput) {
        e.preventDefault();
      }
    });

    // Registrar Service Worker para PWA Offline
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  // Iniciar App
  initEventos();
  initDados();
})();
