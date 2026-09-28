# COLINHA ELEITORAL DIGITAL 2026 – BRUNO ORTIZ 10222

Web App Mobile-First e Progressive Web App (PWA) de alta performance e fidelidade visual para as Eleições 2026.

## 🎯 Candidato Principal
- **Nome:** Bruno Ortiz
- **Cargo:** Deputado Estadual
- **Número:** 10222
- **Estado:** Mato Grosso do Sul (MS)
- **Slogan:** *“O troco chegou. Vai dar B.O!”*

---

## 🚀 Funcionalidades
1. **Mobile-First Real:** Projetado para navegação simples, fontes grandes, contrastes calibrados e uso com apenas uma mão.
2. **Identidade Visual Oficial:** Cores e proporções extraídas diretamente dos assets oficiais da campanha (`#006CB5`, `#76C04E`, `#FFCC29`, `#FFFFFF`).
3. **Regra de Ouro (Deputado Estadual 10222):** Voto pré-preenchido e permanentemente bloqueado para Bruno Ortiz `[ 1 ] [ 0 ] [ 2 ] [ 2 ] [ 2 ]`.
4. **Sequência Oficial de Votação (19 Campos Numéricos):**
   - 1. Deputado Federal (4 dígitos)
   - 2. Deputado Estadual (5 dígitos – Bruno Ortiz 10222 Fixo)
   - 3. Senador 1 (3 dígitos)
   - 4. Senador 2 (3 dígitos)
   - 5. Governador (2 dígitos)
   - 6. Presidente (2 dígitos)
5. **Modal de Busca com Índice Alfabético:** Filtragem dinâmica e instantânea por nome ou número.
6. **Canvas de Alta Resolução (300 DPI - 768 × 1122 px):** Gera uma imagem oficial no formato 6,5 cm × 9,5 cm personalizada com o cabeçalho `★ [NOME] VOTA ASSIM:`.
7. **PWA Instalável e Offline:** Suporte a `manifest.json` e `service-worker.js` para carregamento e funcionamento sem sinal de internet.
8. **Download e Compartilhamento Nativo:** Integração com Web Share API (`navigator.share`) com fallback para download direto em PNG.

---

## 📁 Estrutura de Arquivos
```
/
├── index.html              # Estrutura semântica e telas do App
├── styles.css              # Design Tokens, estética mobile-first e animações
├── app.js                  # Lógica modular de fluxo, estado e Canvas 300 DPI
├── data.json               # Configuração dos 6 cargos e mock de candidatos
├── manifest.json           # Manifesto PWA
├── service-worker.js       # Cache e funcionamento offline
├── assets/
│   ├── bruno-ortiz.png     # Fotografia oficial do candidato
│   ├── bruno-ortiz-logo.png# Logomarca oficial da campanha
│   ├── icon-192.png        # Ícone PWA 192x192
│   └── icon-512.png        # Ícone PWA 512x512
└── README.md
```

---

## 💻 Como Executar Localmente
Você pode utilizar qualquer servidor web estático simples. Exemplos:

### Via Node.js (npx serve):
```bash
npx serve -l 3000
```

### Via Python:
```bash
python -m http.server 3000
```

Acesse no navegador: `http://localhost:3000`
