# 📁 Localização Completa do Projeto - OKTZ ERP

Guia visual de onde encontrar todos os arquivos e código do projeto.

---

## 🏠 Raiz do Projeto

```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\
```

---

## 📖 Documentação (Criada Agora)

### README.md
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\README.md
```
- **Tamanho**: 18 KB
- **Linhas**: 698
- **O que é**: Documentação principal completa
- **Leia quando**: Primeira vez usando o projeto

### QUICKSTART.md
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\QUICKSTART.md
```
- **Tamanho**: 6.2 KB
- **Tempo**: 5 minutos
- **O que é**: Inicialização rápida
- **Leia quando**: Quer começar agora

### CHANGELOG.md
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\CHANGELOG.md
```
- **Tamanho**: 7.2 KB
- **O que é**: Histórico de versões
- **Leia quando**: Quer saber o que mudou

### DEPLOYMENT.md
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\DEPLOYMENT.md
```
- **Tamanho**: 11 KB
- **O que é**: Guia de deploy em produção
- **Leia quando**: Pronto para colocar em produção

### DOCS_INDEX.md
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\DOCS_INDEX.md
```
- **O que é**: Índice e navegação da documentação
- **Leia quando**: Quer encontrar algo específico

### .gitignore
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\.gitignore
```
- **O que é**: Configuração do Git
- **Contém**: node_modules, .env, logs, etc.

---

## 🚀 Backend (Node.js/Express)

### Server Principal
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\server.js
```
- **Função**: Express server na porta 3000
- **Linhas principais**:
  - 1-30: Imports e inicialização
  - 24-36: Helmet/CORS/CSP
  - 61-70: Rotas da API
  - 72-77: Rotas estáticas
  - 83-86: Error handlers

### Dependências
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\package.json
```
- **O que é**: Lista de dependências npm
- **Importante**: `npm install` lê este arquivo

### Variáveis de Ambiente
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\.env
```
- **O que é**: Variáveis sensíveis
- **⚠️ IMPORTANTE**: NÃO COMMITAR NO GIT
- **Contém**: PORT, NODE_ENV, ALLOWED_ORIGINS, etc.

### Middleware
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\middleware\
├─ security.js              (Rate limiting, headers)
└─ authMiddleware.js        (Autenticação)
```

### Banco de Dados
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\db\
├─ database.js              (Inicialização)
├─ seed.js                  (Seed de dados)
├─ erp.db                   (SQLite database)
└─ csv_*.csv                (Arquivos CSV)
```

### Rotas da API
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\routes\
├─ auth.js                  (Autenticação)
├─ suppliers.js             (Fornecedores)
├─ payments.js              (Pagamentos)
├─ customs.js               (Customizações)
├─ notifications.js         (Notificações)
├─ users.js                 (Usuários)
└─ import.js                (Importação)
```

---

## 📱 Frontend (HTML5 + CSS + JavaScript)

### Aplicação Principal
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\cotacao-china.html
```

- **Tamanho**: 133 KB
- **Linhas**: 2.715
- **O que é**: Aplicação frontend completa (HTML + CSS + JS vanilla)
- **Rotas de acesso**:
  - Local: `C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\cotacao-china.html`
  - Via servidor: `http://localhost:3000/cotacao-china.html`

### Estrutura do HTML
```
cotacao-china.html
├─ <head> (linhas 1-100)
│  ├─ Imports de bibliotecas (Leaflet, jsPDF, html2canvas, etc.)
│  └─ Folha de estilos CSS
│
├─ <style> (linhas 13-250)
│  └─ Estilo dark-mode nativo
│
├─ <body> (linhas 251+)
│  ├─ Header
│  ├─ Sidebar (com tabs)
│  │  ├─ Rotas
│  │  ├─ Resultado
│  │  ├─ Container
│  │  └─ Histórico
│  └─ Mapa interativo
│
└─ <script> (linhas 1500+)
   └─ JavaScript vanilla (2700+ linhas)
```

### Funções Principais
```javascript
// Cálculo e roteamento
calc()                          // Calcula rota
suggestWP()                     // Busca inteligente de cidades
searchCityByAddress()           // Multi-level fuzzy search

// Consolidação
addRouteToConsolidation()       // Adiciona rota à consolidação
selectCnt()                     // Seleciona tipo de container
refreshCntStats()              // Atualiza estatísticas

// Exportação
exportOperationJSON()           // Exporta como JSON
generateOperationPDF()          // Gera PDF com mapa

// Histórico
saveConsolidationToHistory()    // Salva no histórico
renderHistoryTab()             // Renderiza aba histórico
```

### Cópia Servida pelo Servidor
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\public\cotacao-china.html
```
- **O que é**: Cópia servida pelo Express
- **Quando usar**: Alterar a cópia de origem, depois copiar aqui
- **URL**: `http://localhost:3000/cotacao-china.html`

---

## 🔧 Configuração e Desenvolvimento

### Configuração Claude Code
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\.claude\
├─ launch.json               (Configuração de servidor)
└─ settings.json             (Configurações)
```

### Repositório Git
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\.git\
```
- **O que é**: Controle de versão
- **Use**: `git status`, `git log`, etc.

### Dados e Sessões
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\data\
├─ erp.db                   (Banco de dados SQLite)
├─ emails/                  (Emails armazenados)
└─ whatsapp-session/        (Sessão WhatsApp)
```

### Dependências npm
```
C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\node_modules\
```
- **O que é**: Pacotes instalados via npm
- **⚠️ IMPORTANTE**: NÃO COMMITAR NO GIT (veja .gitignore)
- **Instalar**: `npm install`

---

## 🌐 Como Acessar a Aplicação

### URL de Desenvolvimento
```
http://localhost:3000/cotacao-china.html
```

**Componentes:**
- **Protocolo**: `http://` (local) / `https://` (produção)
- **Host**: `localhost`
- **Porta**: `3000` (configurável via .env)
- **Path**: `/cotacao-china.html`

### Para Iniciar
```bash
cd C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz
npm start
# Abre em http://localhost:3000/cotacao-china.html
```

---

## 📊 Estrutura de Dados Global (no HTML)

Encontrado em: `C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\cotacao-china.html`

### Variáveis Globais Principais
```javascript
// Operação atual
currentOp = { ref, desc, items }

// Rotas consolidadas
savedRoutes = [
  { ori, dst, dist, mod, vol, kg, costUSD, costBRL, ... }
]

// Operações manuais
manualOps = [...]

// Container selecionado
selCnt = '40gp'  // ou '40hc', '45hc', '20gp'

// Porto selecionado
selectedEmbarquePort = 'Shanghai'

// Base de dados de cidades (60+)
CITIES = [
  { name, lat, lng, aliases: [...] }
]

// Fornecedores ZAP
ZAP_SUPPLIERS = [...]

// Fretes por porto
PORT_FREIGHT_RATES = {
  'Shanghai': { '20gp': ..., '40gp': ... },
  'Guangzhou / Nansha': { ... },
  ...
}

// Especificações de containers
CNT_SPECS = {
  '20gp': { label, vol, maxKg, ... },
  '40gp': { ... },
  ...
}
```

### LocalStorage
```javascript
localStorage['consolidationHistory']  // Histórico persistido
localStorage['sidebarWidth']          // Preferência do usuário
```

---

## 🔍 Como Navegar Pelo Código

### Se Preciso Editar...

❓ **A aplicação HTML/CSS/JavaScript**
```
Arquivo: C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\cotacao-china.html
Depois de editar:
1. Copie para: public\cotacao-china.html
2. Recarregue o navegador (Ctrl+R)
```

❓ **O servidor/backend**
```
Arquivo: C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\server.js
Depois de editar:
1. Salve o arquivo
2. Reinicie: npm start
```

❓ **Variáveis de ambiente**
```
Arquivo: C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\.env
Depois de editar:
1. Reinicie o servidor: npm start
```

❓ **Funções específicas**
```
Arquivo: cotacao-china.html
Busque por:
- calc()                    → Cálculo de rota (linha ~1800)
- selectCnt()              → Seleção container (linha ~1900)
- exportOperationJSON()    → Exportar JSON (linha ~2258)
- generateOperationPDF()   → Gerar PDF (linha ~2309)
- searchCityByAddress()    → Busca cidades (linha ~1400)
```

---

## 📚 Documentação Rápida por Arquivo

| Arquivo | Localização | O Quê? | Tamanho |
|---------|------------|--------|---------|
| README.md | `\README.md` | Documentação principal | 18 KB |
| QUICKSTART.md | `\QUICKSTART.md` | Setup rápido (5 min) | 6.2 KB |
| CHANGELOG.md | `\CHANGELOG.md` | Histórico versões | 7.2 KB |
| DEPLOYMENT.md | `\DEPLOYMENT.md` | Deploy em produção | 11 KB |
| DOCS_INDEX.md | `\DOCS_INDEX.md` | Índice de docs | novo |
| .gitignore | `\.gitignore` | Configuração Git | 1.7 KB |
| server.js | `\server.js` | Express backend | ~100 KB |
| cotacao-china.html | `\cotacao-china.html` | Frontend principal | 133 KB |
| package.json | `\package.json` | Dependências npm | ~5 KB |
| .env | `\.env` | Variáveis (sensível) | ~1 KB |

---

## ⚠️ Arquivos Importantes Não Commitar

```
# Sensibilidade
.env                        (Variáveis de ambiente)
credentials.json            (API keys)
*.pem, *.key               (Chaves privadas)

# Dependências
node_modules/              (Gerado via npm install)
package-lock.json          (Gerado automaticamente)

# Logs e Cache
logs/                       (Logs da aplicação)
*.log                       (Arquivos de log)
.cache/                     (Cache temporário)
```

Veja: `.gitignore` para lista completa.

---

## 🎯 Checklist de Localização

Antes de começar, verifique:

- [ ] Projeto em: `C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\`
- [ ] Documentação (README.md, etc.) presente
- [ ] Arquivo cotacao-china.html existe
- [ ] server.js existe
- [ ] package.json existe
- [ ] Pasta public/ existe
- [ ] Pasta db/ existe
- [ ] Arquivo .env configurado (ou .env.example como base)

---

## 📞 Resumo Ultra-Rápido

```
🏠 Raiz: C:\Users\User\Documents\OKTZ\CLAUDE\oktzzzz\
📖 Docs: README.md, QUICKSTART.md, CHANGELOG.md, DEPLOYMENT.md
🚀 Backend: server.js + package.json + .env
📱 Frontend: cotacao-china.html (133 KB, 2715 linhas)
🌐 URL: http://localhost:3000/cotacao-china.html
```

---

**Versão**: 1.0.0  
**Data**: Maio 2026  
**Status**: ✅ Projeto Completo e Organizado
