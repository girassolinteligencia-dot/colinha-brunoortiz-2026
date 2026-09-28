/**
 * COLINHA ELEITORAL DIGITAL 2026 – BRUNO ORTIZ 10222
 * Engenharia Mobile-First, PWA e Canvas de Alta Resolução (300 DPI)
 */

const STORAGE_KEY = 'brunoOrtizColinha2026';

// Modelo de Estado Inicial
const INITIAL_STATE = {
  voter: {
    firstName: ''
  },
  currentStep: 0,
  currentScreen: 'welcomeScreen',
  votes: {
    deputadoFederal: null,
    deputadoEstadual: {
      locked: true,
      name: "Bruno Ortiz",
      ballotName: "BRUNO ORTIZ",
      number: "10222",
      office: "deputadoEstadual",
      party: "REPUBLICANOS",
      photo: "assets/bruno-ortiz.png",
      badge: "Voto Oficial 10222"
    },
    senador1: null,
    senador2: null,
    governador: null,
    presidente: null
  }
};

let appState = JSON.parse(JSON.stringify(INITIAL_STATE));
let appData = { offices: [], candidates: {} };
let currentSearchLetter = 'TODOS';
let currentGeneratedBlob = null;

// ==========================================
// 1. INICIALIZAÇÃO & PERSISTÊNCIA
// ==========================================
async function initApp() {
  await loadData();
  loadState();
  setupEventListeners();
  registerServiceWorker();

  // Restaurar tela correta
  if (appState.voter.firstName) {
    if (appState.currentScreen === 'finalScreen') {
      showScreen('finalScreen');
      await generateSantinho();
    } else if (appState.currentScreen === 'reviewScreen') {
      showScreen('reviewScreen');
      renderReview();
    } else {
      showScreen('stepperScreen');
      renderOffice();
    }
  } else {
    showScreen('welcomeScreen');
  }
}

async function loadData() {
  try {
    const res = await fetch('data.json');
    appData = await res.json();
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      appState = {
        ...INITIAL_STATE,
        ...parsed,
        votes: {
          ...INITIAL_STATE.votes,
          ...parsed.votes,
          // Regra Absoluta: Deputado Estadual é permanentemente Bruno Ortiz 10222
          deputadoEstadual: INITIAL_STATE.votes.deputadoEstadual
        }
      };
    }
  } catch (e) {
    console.warn('Erro ao carregar estado do localStorage:', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (e) {
    console.warn('Erro ao salvar estado:', e);
  }
}

function resetState() {
  if (confirm('Tem certeza que deseja recomeçar sua colinha?')) {
    localStorage.removeItem(STORAGE_KEY);
    appState = JSON.parse(JSON.stringify(INITIAL_STATE));
    document.getElementById('voterFirstName').value = '';
    document.getElementById('btnStart').disabled = true;
    showScreen('welcomeScreen');
  }
}

// ==========================================
// 2. NAVEGAÇÃO ENTRE TELAS
// ==========================================
function showScreen(screenId) {
  const screens = document.querySelectorAll('.screen');
  screens.forEach(s => s.classList.remove('active'));
  
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    appState.currentScreen = screenId;
    saveState();
  }

  // Atualizar cabeçalhos de identificação do eleitor
  const upperName = (appState.voter.firstName || 'ELEITOR').toUpperCase();
  const voterPillText = document.getElementById('voterPillText');
  const reviewVoterPill = document.getElementById('reviewVoterPill');
  if (voterPillText) voterPillText.textContent = upperName;
  if (reviewVoterPill) reviewVoterPill.innerHTML = `<span>★ ${upperName} VOTA ASSIM:</span>`;
}

// ==========================================
// 3. EVENT LISTENERS
// ==========================================
function setupEventListeners() {
  // Input do Primeiro Nome
  const voterInput = document.getElementById('voterFirstName');
  const btnStart = document.getElementById('btnStart');

  if (voterInput) {
    voterInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      btnStart.disabled = val.length === 0;
    });

    voterInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !btnStart.disabled) {
        btnStart.click();
      }
    });
  }

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      const val = voterInput.value.trim();
      if (!val) return;
      appState.voter.firstName = val;
      appState.currentStep = 0;
      saveState();
      showScreen('stepperScreen');
      renderOffice();
    });
  }

  // Stepper Navegação
  const btnStepBack = document.getElementById('btnStepBack');
  const btnStepNext = document.getElementById('btnStepNext');

  if (btnStepBack) {
    btnStepBack.addEventListener('click', () => {
      if (appState.currentStep > 0) {
        appState.currentStep--;
        renderOffice();
      } else {
        showScreen('welcomeScreen');
      }
    });
  }

  if (btnStepNext) {
    btnStepNext.addEventListener('click', () => {
      if (appState.currentStep < appData.offices.length - 1) {
        appState.currentStep++;
        renderOffice();
      } else {
        showScreen('reviewScreen');
        renderReview();
      }
    });
  }

  // Botões de Recomeçar
  document.getElementById('btnResetApp')?.addEventListener('click', resetState);
  document.getElementById('btnReviewReset')?.addEventListener('click', resetState);
  document.getElementById('btnFinalReset')?.addEventListener('click', resetState);

  // Botão Gerar Colinha
  document.getElementById('btnGenerateSantinho')?.addEventListener('click', async () => {
    showScreen('finalScreen');
    await generateSantinho();
  });

  // Botão Voltar da Final para Revisão
  document.getElementById('btnBackToReview')?.addEventListener('click', () => {
    showScreen('reviewScreen');
    renderReview();
  });

  // Download & Share
  document.getElementById('btnDownload')?.addEventListener('click', downloadSantinho);
  document.getElementById('btnShare')?.addEventListener('click', shareSantinho);

  // Modal Fechar
  document.getElementById('btnCloseModal')?.addEventListener('click', closeCandidateModal);
  document.getElementById('candidateModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'candidateModal') closeCandidateModal();
  });

  // Busca de Candidato
  document.getElementById('candidateSearchInput')?.addEventListener('input', (e) => {
    searchCandidates(e.target.value);
  });
}

// ==========================================
// 4. STEPPER: RENDERIZAÇÃO DO CARGO
// ==========================================
function renderOffice() {
  if (!appData.offices || appData.offices.length === 0) return;

  const currentOffice = appData.offices[appState.currentStep];
  if (!currentOffice) return;

  saveState();

  // Atualizar Barra de Progresso
  const stepNumber = appState.currentStep + 1;
  const totalSteps = appData.offices.length;
  const pct = Math.round((stepNumber / totalSteps) * 100);

  document.getElementById('progressStepText').textContent = `Cargo ${stepNumber} de ${totalSteps}`;
  document.getElementById('progressPercentageText').textContent = `${pct}%`;
  document.getElementById('progressBarFill').style.width = `${pct}%`;
  document.getElementById('progressBar').setAttribute('aria-valuenow', stepNumber);

  // Atualizar Card do Cargo
  const officeCard = document.getElementById('currentOfficeCard');
  const officeTitle = document.getElementById('currentOfficeTitle');
  const officeHint = document.getElementById('currentOfficeHint');
  const digitBoxesContainer = document.getElementById('currentDigitBoxes');
  const selectedCandidateDisplay = document.getElementById('selectedCandidateDisplay');
  const officeActions = document.getElementById('officeActions');
  const btnStepNextText = document.getElementById('btnStepNextText');

  officeTitle.textContent = currentOffice.title;
  officeHint.textContent = currentOffice.description;

  const isLast = appState.currentStep === totalSteps - 1;
  btnStepNextText.textContent = isLast ? 'REVISAR MINHA COLINHA' : 'PRÓXIMO';

  const selectedVote = appState.votes[currentOffice.id];
  const isBruno = currentOffice.id === 'deputadoEstadual';

  if (isBruno) {
    officeCard.classList.add('is-locked');
    officeCard.classList.remove('is-clickable');
    officeCard.onclick = null;
  } else {
    officeCard.classList.remove('is-locked');
    officeCard.classList.add('is-clickable');
    // Clicar em qualquer lugar do card abre diretamente o seletor de candidatos
    officeCard.onclick = () => openCandidateModal(currentOffice);
  }

  // Renderizar Dígitos
  digitBoxesContainer.innerHTML = '';
  const numStr = selectedVote ? String(selectedVote.number) : '';
  for (let i = 0; i < currentOffice.digits; i++) {
    const box = document.createElement('div');
    box.className = 'digit-box';
    if (i < numStr.length) {
      box.textContent = numStr[i];
    } else {
      box.classList.add('empty');
      box.textContent = ' ';
    }
    digitBoxesContainer.appendChild(box);
  }

  // Renderizar Candidato Selecionado / Vazio
  if (selectedVote) {
    const photoSrc = selectedVote.photo || '';
    const imgHtml = photoSrc 
      ? `<img src="${photoSrc}" alt="${selectedVote.name}" class="candidate-thumb">`
      : `<div class="candidate-thumb-placeholder">👤</div>`;

    selectedCandidateDisplay.innerHTML = `
      ${imgHtml}
      <div class="candidate-info-text">
        <div class="candidate-selected-name">${selectedVote.name}</div>
        <div class="candidate-selected-party">${selectedVote.party || ''} • Nº ${selectedVote.number}</div>
        ${isBruno ? `<div class="locked-badge">🔒 Seu voto já está aqui!</div>` : '<div style="font-size: 0.8rem; color: var(--bruno-blue); font-weight: 600; margin-top: 4px;">Toque no cartão para alterar</div>'}
      </div>
    `;
    selectedCandidateDisplay.style.display = 'flex';
  } else {
    selectedCandidateDisplay.innerHTML = `
      <div class="candidate-thumb-placeholder" style="background-color: #EBF3F8; border-color: var(--bruno-blue); color: var(--bruno-blue);">+</div>
      <div class="candidate-info-text">
        <div class="candidate-selected-name" style="color: var(--bruno-blue);">Toque aqui para escolher</div>
        <div class="candidate-selected-party">Selecione da lista ou busque por nome/número.</div>
      </div>
    `;
    selectedCandidateDisplay.style.display = 'flex';
  }

  // Renderizar Ações (Sem botões redundantes)
  officeActions.innerHTML = '';
  if (isBruno) {
    const lockedMsg = document.createElement('div');
    lockedMsg.className = 'locked-badge';
    lockedMsg.style.justifyContent = 'center';
    lockedMsg.style.padding = '10px';
    lockedMsg.innerHTML = '🔒 Voto oficial confirmado para Deputado Estadual';
    officeActions.appendChild(lockedMsg);
  } else {
    if (selectedVote) {
      const btnRemove = document.createElement('button');
      btnRemove.type = 'button';
      btnRemove.className = 'btn-text-danger';
      btnRemove.textContent = 'Deixar este cargo em branco';
      btnRemove.onclick = (e) => {
        e.stopPropagation(); // Não abrir modal
        appState.votes[currentOffice.id] = null;
        renderOffice();
      };
      officeActions.appendChild(btnRemove);
    }
  }
}

// ==========================================
// 5. MODAL DE CANDIDATOS
// ==========================================
let activeOfficeForModal = null;

function openCandidateModal(office) {
  if (office.id === 'deputadoEstadual') return; // Bloqueado!

  activeOfficeForModal = office;
  document.getElementById('modalOfficeTitle').textContent = `Escolher ${office.title}`;
  document.getElementById('candidateSearchInput').value = '';
  currentSearchLetter = 'TODOS';

  setupAlphaFilterBar();
  searchCandidates('');

  const modal = document.getElementById('candidateModal');
  modal.classList.add('active');
  document.getElementById('candidateSearchInput').focus();
}

function closeCandidateModal() {
  document.getElementById('candidateModal').classList.remove('active');
  activeOfficeForModal = null;
}

function setupAlphaFilterBar() {
  const bar = document.getElementById('alphaFilterBar');
  bar.innerHTML = '';

  const letters = ['TODOS', 'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

  letters.forEach(letter => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `alpha-btn ${currentSearchLetter === letter ? 'active' : ''}`;
    btn.textContent = letter;
    btn.onclick = () => {
      currentSearchLetter = letter;
      document.querySelectorAll('.alpha-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      searchCandidates(document.getElementById('candidateSearchInput').value);
    };
    bar.appendChild(btn);
  });
}

function searchCandidates(query) {
  if (!activeOfficeForModal) return;

  const officeId = activeOfficeForModal.id;
  const list = appData.candidates[officeId] || [];
  const container = document.getElementById('candidatesList');
  container.innerHTML = '';

  const cleanQuery = query.toLowerCase().trim();

  const filtered = list.filter(cand => {
    const matchesLetter = currentSearchLetter === 'TODOS' || cand.name.toUpperCase().startsWith(currentSearchLetter);
    const matchesQuery = !cleanQuery || cand.name.toLowerCase().includes(cleanQuery) || cand.number.includes(cleanQuery);
    return matchesLetter && matchesQuery;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px 10px; color: var(--gray-600);">
        <p style="font-weight: 700; margin-bottom: 6px;">Nenhum candidato encontrado</p>
        <p style="font-size: 0.85rem;">Tente buscar por outro termo ou selecione outra letra.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(cand => {
    const item = document.createElement('div');
    item.className = 'candidate-list-item';
    const photoHtml = cand.photo
      ? `<img src="${cand.photo}" alt="${cand.name}" class="candidate-thumb" style="width: 52px; height: 52px; object-fit: cover; border-radius: 8px;" onerror="this.outerHTML='<div class=\\'candidate-item-photo\\'>👤</div>'">`
      : `<div class="candidate-item-photo">👤</div>`;

    item.innerHTML = `
      ${photoHtml}
      <div class="candidate-item-info">
        <div class="candidate-item-name">${cand.name}</div>
        <div class="candidate-item-sub">${cand.party || ''}</div>
      </div>
      <div class="candidate-item-number">${cand.number}</div>
    `;
    item.onclick = () => selectCandidate(cand);
    container.appendChild(item);
  });
}

function selectCandidate(candidate) {
  if (!activeOfficeForModal) return;

  appState.votes[activeOfficeForModal.id] = {
    id: candidate.id,
    name: candidate.name,
    ballotName: candidate.ballotName || candidate.name,
    number: candidate.number,
    party: candidate.party,
    photo: candidate.photo || '',
    office: activeOfficeForModal.id
  };

  closeCandidateModal();

  // EXPERIÊNCIA MOBILE-FIRST REAL:
  // Ao clicar e escolher o candidato, avança automaticamente para o próximo cargo!
  if (appState.currentStep < appData.offices.length - 1) {
    appState.currentStep++;
    renderOffice();
  } else {
    showScreen('reviewScreen');
    renderReview();
  }
}

// ==========================================
// 6. TELA DE REVISÃO
// ==========================================
function renderReview() {
  const container = document.getElementById('reviewCardsList');
  container.innerHTML = '';

  appData.offices.forEach((office, index) => {
    const vote = appState.votes[office.id];
    const isBruno = office.id === 'deputadoEstadual';

    const card = document.createElement('div');
    card.className = `review-card-item ${isBruno ? 'is-bruno' : ''}`;

    const numStr = vote ? String(vote.number) : '';
    let digitBoxesHtml = '';
    for (let i = 0; i < office.digits; i++) {
      if (i < numStr.length) {
        digitBoxesHtml += `<div class="review-digit-box">${numStr[i]}</div>`;
      } else {
        digitBoxesHtml += `<div class="review-digit-box empty"></div>`;
      }
    }

    card.innerHTML = `
      <div class="review-card-left">
        <div class="review-office-label">${office.title}</div>
        <div class="review-candidate-name">${vote ? vote.name : '<span style="color: var(--gray-600); font-style: italic;">Não informado</span>'}</div>
      </div>
      <div class="review-card-right">
        <div class="review-digits-mini">${digitBoxesHtml}</div>
        ${!isBruno ? `<button type="button" class="btn-edit-vote" onclick="editVoteFromReview(${index})">Alterar</button>` : ''}
      </div>
    `;

    container.appendChild(card);
  });
}

window.editVoteFromReview = function(index) {
  appState.currentStep = index;
  showScreen('stepperScreen');
  renderOffice();
};

// ==========================================
// 7. CANVAS DE ALTA RESOLUÇÃO (300 DPI)
// Dimensões: 768 × 1122 pixels (6,5 cm × 9,5 cm)
// ==========================================
async function generateSantinho() {
  const canvas = document.getElementById('santinhoCanvas');
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Carregar imagens oficiais e fotos dos candidatos selecionados
  const candidateImages = {};
  const loadPromises = [
    loadImage('assets/bruno-ortiz.png'),
    loadImage('assets/bruno-ortiz-logo.png')
  ];

  appData.offices.forEach(office => {
    const vote = appState.votes[office.id];
    if (vote && vote.photo && office.id !== 'deputadoEstadual') {
      loadPromises.push(
        loadImage(vote.photo).then(img => {
          if (img) candidateImages[office.id] = img;
        })
      );
    }
  });

  const [photoImg, logoImg] = await Promise.all(loadPromises);

  // 1. Fundo Branco com gradiente suave de fundo
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Detalhe sutil de fundo geométrico institucional
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width * 0.58, height);

  // 2. Fotografia oficial de Bruno Ortiz à direita
  if (photoImg) {
    ctx.save();
    // Posicionar Bruno Ortiz grande no lado direito
    const photoWidth = 500;
    const photoHeight = 700;
    const photoX = width - photoWidth + 40;
    const photoY = 80;

    // Desenhar com fade suave no lado esquerdo para não cobrir números
    ctx.drawImage(photoImg, photoX, photoY, photoWidth, photoHeight);

    // Gradiente sutil para fundir o lado esquerdo da foto
    const grad = ctx.createLinearGradient(photoX - 30, 0, photoX + 160, 0);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(photoX - 40, photoY, 200, photoHeight);

    ctx.restore();
  }

  // 3. Cabeçalho Superior Esquerdo: "[NOME] VOTA ASSIM:"
  const voterName = (appState.voter.firstName || 'ELEITOR').toUpperCase();
  const headerText = `★ ${voterName} VOTA ASSIM:`;

  ctx.save();
  ctx.font = 'bold 22px -apple-system, sans-serif';
  const textMetrics = ctx.measureText(headerText);
  const pillWidth = Math.max(textMetrics.width + 40, 260);
  const pillHeight = 44;
  const pillX = 28;
  const pillY = 32;

  // Fundo Verde Arredondado
  drawRoundedRect(ctx, pillX, pillY, pillWidth, pillHeight, 22, '#76C04E');
  
  // Texto Branco com estrela
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(headerText, pillX + 20, pillY + pillHeight / 2 + 1);
  ctx.restore();

  // 4. Renderização dos 6 Cargos e Campos Numéricos (Total exato de 19 campos)
  let currentY = 100;
  const colX = 32;
  const colWidth = 360;

  appData.offices.forEach((office) => {
    const vote = appState.votes[office.id];
    const isBruno = office.id === 'deputadoEstadual';

    // Rótulo do Cargo em AZUL INSTITUCIONAL (#006CB5)
    ctx.save();
    ctx.font = '900 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#006CB5';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(office.title, colX, currentY);
    ctx.restore();

    currentY += 24;

    const boxSize = 44;
    const boxGap = 7;
    const boxHeight = 52;
    let startBoxX = colX;

    // Foto mini oficial ao lado dos números
    const candImgToDraw = isBruno ? photoImg : candidateImages[office.id];
    if (candImgToDraw) {
      const thumbSize = 46;
      ctx.save();
      ctx.beginPath();
      ctx.arc(startBoxX + thumbSize / 2, currentY + boxHeight / 2, thumbSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(candImgToDraw, startBoxX, currentY + (boxHeight - thumbSize) / 2, thumbSize, thumbSize);
      ctx.restore();

      // Borda da foto (Amarela para Bruno, Verde para demais candidatos escolhidos)
      ctx.save();
      ctx.strokeStyle = isBruno ? '#FFCC29' : '#76C04E';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(startBoxX + thumbSize / 2, currentY + boxHeight / 2, thumbSize / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      startBoxX += thumbSize + 10;
    }

    // Campos Numéricos
    const numStr = vote ? String(vote.number) : '';
    for (let d = 0; d < office.digits; d++) {
      const boxX = startBoxX + d * (boxSize + boxGap);
      const boxY = currentY;

      // Fundo branco, contorno verde
      drawRoundedRect(ctx, boxX, boxY, boxSize, boxHeight, 8, '#FFFFFF', '#76C04E', 2.5);

      // Dígito numérico em Azul Institucional
      if (d < numStr.length) {
        ctx.save();
        ctx.font = '900 32px "Impact", -apple-system, Arial Black, sans-serif';
        ctx.fillStyle = '#006CB5';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(numStr[d], boxX + boxSize / 2, boxY + boxHeight / 2 + 3);
        ctx.restore();
      }
    }

    currentY += boxHeight + 4;

    // Nome do Candidato
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    if (isBruno) {
      ctx.font = '900 18px "Montserrat", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#006CB5';
      ctx.fillText('BRUNO ORTIZ', startBoxX, currentY);
    } else if (vote && vote.name) {
      const candNameUpper = vote.name.toUpperCase();
      // Ajustar dinamicamente o tamanho da fonte se o nome de urna for extenso
      const fontSize = candNameUpper.length > 22 ? 13 : 15;
      ctx.font = `bold ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = '#1E293B';
      
      // Limitar largura máxima para preservar margem da foto grande à direita
      const maxNameWidth = width * 0.48;
      let displayName = candNameUpper;
      if (ctx.measureText(displayName).width > maxNameWidth) {
        while (ctx.measureText(displayName + '...').width > maxNameWidth && displayName.length > 0) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }
      ctx.fillText(displayName, startBoxX, currentY);
    } else {
      ctx.font = 'italic 13px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('—', startBoxX + 4, currentY);
    }
    ctx.restore();

    currentY += 34; // Espaçamento entre cargos
  });

  // 5. Rodapé: Logomarca Oficial Bruno Ortiz 10222 no canto inferior direito
  if (logoImg) {
    ctx.save();
    const logoW = 320;
    const logoH = (logoW / logoImg.width) * logoImg.height;
    const logoX = width - logoW - 24;
    const logoY = height - logoH - 24;
    ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
    ctx.restore();
  }

  // 6. Rodapé Institucional Inferior Esquerdo: Slogan e Votação
  ctx.save();
  ctx.font = '900 16px -apple-system, sans-serif';
  ctx.fillStyle = '#006CB5';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('ELEIÇÕES 2026 • MATO GROSSO DO SUL', colX, height - 44);

  ctx.font = 'italic bold 15px -apple-system, sans-serif';
  ctx.fillStyle = '#76C04E';
  ctx.fillText('“O troco chegou. Vai dar B.O!”', colX, height - 24);
  ctx.restore();

  // 7. Atualizar Preview na Tela
  canvas.toBlob((blob) => {
    currentGeneratedBlob = blob;
    const previewUrl = URL.createObjectURL(blob);
    const previewImg = document.getElementById('santinhoPreviewImg');
    if (previewImg) {
      previewImg.src = previewUrl;
    }
  }, 'image/png');
}

// Auxiliares de Desenho no Canvas
function drawRoundedRect(ctx, x, y, width, height, radius, fillColor, strokeColor = null, lineWidth = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`Falha ao carregar imagem: ${src}`);
      resolve(null);
    };
    img.src = src;
  });
}

// ==========================================
// 8. DOWNLOAD & COMPARTILHAMENTO
// ==========================================
function downloadSantinho() {
  if (!currentGeneratedBlob) {
    const canvas = document.getElementById('santinhoCanvas');
    canvas.toBlob((blob) => {
      currentGeneratedBlob = blob;
      executeDownload();
    }, 'image/png');
  } else {
    executeDownload();
  }

  function executeDownload() {
    const firstName = (appState.voter.firstName || 'eleitor').toLowerCase().replace(/[^a-z0-9]/g, '');
    const filename = `colinha-2026-${firstName}.png`;
    const url = URL.createObjectURL(currentGeneratedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function shareSantinho() {
  const firstName = (appState.voter.firstName || 'eleitor').toLowerCase().replace(/[^a-z0-9]/g, '');
  const filename = `colinha-2026-${firstName}.png`;

  if (!currentGeneratedBlob) {
    const canvas = document.getElementById('santinhoCanvas');
    currentGeneratedBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  }

  const file = new File([currentGeneratedBlob], filename, { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Minha Colinha 2026 – Bruno Ortiz 10222',
        text: `Confira minha sequência de votação com Bruno Ortiz 10222 para Deputado Estadual! “O troco chegou. Vai dar B.O!”`,
        files: [file]
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        downloadSantinho();
      }
    }
  } else {
    // Fallback gracioso
    downloadSantinho();
  }
}

// ==========================================
// 9. SERVICE WORKER PARA PWA OFFLINE
// ==========================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js')
        .then(reg => console.log('Service Worker registrado:', reg.scope))
        .catch(err => console.warn('Falha no Service Worker:', err));
    });
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initApp);
