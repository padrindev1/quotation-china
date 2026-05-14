# 🚢 OKTZ ERP - Sistema de Consolidação de Importação da China

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue)](#)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](#)

Aplicação web para cálculo, consolidação e gerenciamento de operações de importação de carga da China. Oferece roteamento inteligente, consolidação de containers FCL marítimo, cálculo de custos em tempo real e geração de relatórios profissionais.

## 📋 Índice

- [Características](#características)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Inicialização](#inicialização)
- [Uso](#uso)
- [Arquitetura](#arquitetura)
- [API Endpoints](#api-endpoints)
- [Estrutura de Diretórios](#estrutura-de-diretórios)
- [Troubleshooting](#troubleshooting)
- [Licença](#licença)

## ✨ Características

### 🗺️ **Roteamento Inteligente**
- Cálculo de rotas entre cidades chinesas e portos
- Suporte para 60+ cidades e distritos chineses
- Geolocalização precisa com latitude/longitude
- Cálculo automático de distâncias
- Estimativa de tempo de trânsito por modal

### 📦 **Consolidação de Containers**
- Seleção entre 4 tipos de containers:
  - 20' General Purpose (GP)
  - 40' General Purpose (GP)
  - 40' High Cube (HC)
  - 45' High Cube (HC)
- Cálculo automático de capacidade e ocupação
- Gestão de operações manuais e de fornecedores
- Histórico de consolidações com persistência local

### 🏭 **Portos Marítimos**
- 8 portos principais configuráveis:
  - Shanghai (Yangshan)
  - Guangzhou / Nansha
  - Shenzhen / Yantian
  - Xiamen
  - Dalian
  - Tianjin
  - Ningbo
  - Qingdao
- Comparativo de fretes entre portos
- Atualização dinâmica de custos

### 💰 **Cálculo de Custos**
- Frete marítimo (por container)
- Taxas portuárias (THC, documentação, lacre)
- Frete interno na China
- Despachante aduaneiro
- Cálculo por m³ e por kg
- Suporte para múltiplas moedas (USD/BRL)

### 📊 **Relatórios e Exportação**
- **Exportação JSON**: Serialização completa da operação
- **Exportação PDF**: Relatório profissional com:
  - Detalhes da operação
  - Rotas consolidadas
  - Especificações do container
  - Breakdown de custos
  - Mapa de trajeto capturado
- **Histórico**: Rastreamento de consolidações anteriores

### 📁 **Importação de CSV**
- Suporte para importação de dados de Google Sheets
- Extração automática de:
  - Referências de operação
  - Origens e destinos
  - Dados de carga (volume, peso, valor)
- Preenchimento rápido de rotas

### 🎨 **Interface Moderna**
- Design responsivo e dark-mode nativo
- Sidebar redimensionável
- Abas intuitivas (Rotas, Resultado, Container, Histórico)
- Mapa interativo com Leaflet
- Notificações em tempo real

## 📋 Requisitos

### Sistema
- **Node.js**: 18.0.0 ou superior
- **npm**: 8.0.0 ou superior
- **Navegador**: Chrome, Firefox, Safari, Edge (versão recente)
- **Porta**: 3000 (padrão, configurável via `.env`)

### Dependências Principais
- **Express.js**: Framework web
- **Helmet**: Segurança HTTP
- **CORS**: Controle de origem cruzada
- **Morgan**: Logging de requisições
- **dotenv**: Variáveis de ambiente

### Dependências Frontend (CDN)
- **Leaflet.js**: Mapeamento interativo
- **jsPDF**: Geração de PDF
- **html2canvas**: Captura de snapshots
- **PapaParse**: Parsing de CSV
- **Font Awesome**: Ícones

## 🚀 Instalação

### 1. Clonar o Repositório
```bash
git clone https://github.com/seu-usuario/oktz-erp.git
cd oktz-erp
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
Criar arquivo `.env` na raiz do projeto:
```env
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 4. Estrutura de Pastas (Verificar)
```
oktzzzz/
├── server.js
├── package.json
├── .env
├── public/
│   ├── cotacao-china.html
│   └── index.html
├── routes/
│   ├── auth.js
│   ├── suppliers.js
│   ├── payments.js
│   ├── customs.js
│   ├── notifications.js
│   ├── users.js
│   └── import.js
├── middleware/
│   └── security.js
└── db/
    └── database.js
```

## 🎯 Inicialização

### Modo Desenvolvimento
```bash
npm start
```

Saída esperada:
```
╔══════════════════════════════════════╗
║   OKTZ ERP - Importação              ║
║   Servidor: http://localhost:3000    ║
╚══════════════════════════════════════╝
```

### Acessar a Aplicação
- **URL**: [http://localhost:3000/cotacao-china.html](http://localhost:3000/cotacao-china.html)

### Modo Produção
```bash
NODE_ENV=production npm start
```

## 📖 Uso

### Workflow Básico

#### 1️⃣ **Configurar Rota (Aba: Rotas)**
```
1. Selecionar origem (cidade/local na China)
2. Selecionar destino (local no Brasil)
3. Selecionar modal de transporte
4. Sistema calcula automaticamente:
   - Distância
   - Tempo estimado
   - Custos associados
```

#### 2️⃣ **Visualizar Rotas Alternativas**
```
- Sistema sugere rotas alternativas
- Comparar custos e tempos
- Selecionar melhor opção
```

#### 3️⃣ **Adicionar à Consolidação**
```
1. Informar volume (m³) e peso (kg)
2. Clicar "Adicionar à Consolidação"
3. Rota é armazenada na consolidação ativa
4. Mostrador de rotas salvas é atualizado
```

#### 4️⃣ **Selecionar Container (Aba: Container)**
```
1. Visualizar rotas consolidadas em "Do Resultado"
2. Clicar sobre um tipo de container (20/40GP, 40/45HC)
3. Visualizar:
   - Ocupação (m³ e kg)
   - Espaço livre
   - Custos detalhados
```

#### 5️⃣ **Mudar Porto (Se Necessário)**
```
1. Clicar botão "Mudar Porto" em Container tab
2. Selecionar novo porto
3. Fretes são recalculados automaticamente
4. Comparativo de portos é atualizado
```

#### 6️⃣ **Exportar Operação**
```
Opção JSON:
- Clicar botão "JSON"
- Download de arquivo estruturado
- Útil para arquivamento/processamento posterior

Opção PDF:
- Clicar botão "PDF"
- Relatório profissional gerado
- Inclui mapa de trajeto
- Pronto para cliente/stakeholder
```

#### 7️⃣ **Salvar no Histórico**
```
- Clicar "Histórico" (Container tab)
- Consolidação é armazenada localmente
- Pode ser consultada posteriormente
- Permite comparar diferentes cenários
```

### Importação de CSV

#### Preparar Planilha
```
1. Abrir Google Sheets com dados de rotas
2. Colunas esperadas:
   - Referência da operação
   - Origem
   - Destino
   - Volume (m³)
   - Peso (kg)
   - Valor (USD)
3. Exportar como CSV (Arquivo > Baixar > CSV)
```

#### Importar na Aplicação
```
1. Ir para Aba: Rotas
2. Seção: Importar Dados CSV
3. Selecionar arquivo CSV
4. Sistema extrai dados automaticamente
5. Rotas são populadas nos campos
```

#### Debug de Importação
```
Se aparecer "Nenhum fornecedor encontrado":
1. Clicar botão "Debug CSV"
2. Verificar estrutura de linhas/colunas
3. Comparar com índices esperados
4. Ajustar índices no código se necessário
```

### Busca Inteligente de Cidades

A aplicação usa busca multi-nível:

```
Nível 1: Correspondência exata
  Exemplo: "Foshan" → Foshan, Guangdong

Nível 2: Substring matching
  Exemplo: "Danzao" → Danzao Town, Foshan

Nível 3: Busca por palavras-chave com scoring
  Exemplo: "Shouzi road, DanZao, Foshan" → 
  Localiza Danzao Town por matching de componentes

Aliases inclusos:
  - Nomes em Inglês e Chinês
  - Variações regionais
  - Abreviaturas comuns
```

## 🏗️ Arquitetura

### Stack Tecnológico

```
┌─────────────────────────────────────┐
│        Frontend (Browser)            │
│  HTML5 + CSS3 + Vanilla JavaScript   │
│  Leaflet.js (Maps)                  │
│  jsPDF + html2canvas (Export)       │
└────────────┬────────────────────────┘
             │ HTTP/HTTPS
             ↓
┌─────────────────────────────────────┐
│      Backend (Node.js/Express)      │
│  - Routing                          │
│  - Segurança (Helmet, CORS)         │
│  - Rate Limiting                    │
│  - Static File Serving              │
└────────────┬────────────────────────┘
             │
┌─────────────────────────────────────┐
│    LocalStorage (Browser)           │
│  - Preferences (sidebar width)      │
│  - Histórico de consolidações       │
└─────────────────────────────────────┘
```

### Data Flow

```
Usuário Input
     ↓
Validação Frontend
     ↓
Cálculo de Rota
     ↓
Atualização de UI
     ↓
Persistência (LocalStorage)
     ↓
Exportação (JSON/PDF)
```

### Estado da Aplicação

```javascript
// Operação atual
currentOp = { ref, desc, items }

// Rotas calculadas
savedRoutes = [{ ori, dst, dist, mod, vol, kg, cost... }]

// Operações manuais
manualOps = [{ ref, ori, dst, vol, kg, cost... }]

// Container selecionado
selCnt = '40gp' | '40hc' | '45hc' | '20gp'

// Porto selecionado
selectedEmbarquePort = 'Shanghai' | 'Guangzhou / Nansha' | ...

// Histórico persistido
localStorage['consolidationHistory']
```

## 🔌 API Endpoints

### Rotas Implementadas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/` | Retorna login.html |
| `GET` | `/cotacao-china.html` | Aplicação principal |
| `GET` | `/dashboard` | Dashboard |
| `GET` | `/suppliers` | Página de fornecedores |
| `GET` | `/payments` | Página de pagamentos |
| `GET` | `/customs` | Página de customização |
| `GET` | `/notifications` | Página de notificações |
| `GET` | `/users` | Página de usuários |
| `GET` | `/reports` | Página de relatórios |
| `GET` | `/import` | Página de importação |

### Estrutura de Requisições

As requisições de API devem incluir:
```json
{
  "origin": "Foshan, Guangdong",
  "destination": "São Paulo, SP",
  "volume": 5.0,
  "weight": 1000,
  "mode": "Ocean Freight",
  "port": "Guangzhou / Nansha"
}
```

## 📁 Estrutura de Diretórios

```
oktzzzz/
│
├── 📄 README.md                    # Este arquivo
├── 📄 package.json                 # Dependências e scripts
├── 📄 .env                         # Variáveis de ambiente
├── 📄 .gitignore                   # Arquivos ignorados no Git
│
├── 🚀 server.js                    # Servidor Express principal
│
├── 📁 public/                      # Arquivos estáticos servidos
│   ├── cotacao-china.html          # Aplicação principal
│   └── index.html                  # Página inicial
│
├── 📁 routes/                      # Rotas da API
│   ├── auth.js                     # Autenticação
│   ├── suppliers.js                # Fornecedores
│   ├── payments.js                 # Pagamentos
│   ├── customs.js                  # Customização
│   ├── notifications.js            # Notificações
│   ├── users.js                    # Usuários
│   └── import.js                   # Importação
│
├── 📁 middleware/                  # Middlewares Express
│   └── security.js                 # Rate limiting, headers
│
├── 📁 db/                          # Banco de dados
│   └── database.js                 # Inicialização BD
│
└── 📁 docs/                        # Documentação (opcional)
    ├── API.md
    ├── DEPLOYMENT.md
    └── TROUBLESHOOTING.md
```

## 🔒 Segurança

### Implementado
- **Helmet.js**: Headers HTTP de segurança
- **CORS**: Controle de origem cruzada
- **CSP**: Content Security Policy configurada
- **Rate Limiting**: Proteção contra brute-force
  - `/api/`: 100 requisições por 15 minutos
  - `/api/auth/login`: 5 requisições por 15 minutos
- **Compressão**: Gzip para reduzir payload
- **Limit de Upload**: 10KB por requisição

### Variáveis de Ambiente Sensíveis
```env
# Nunca commitar arquivo .env
NODE_ENV=production
DATABASE_URL=... (se aplicável)
API_KEY=...
JWT_SECRET=... (se implementado)
```

## 🐛 Troubleshooting

### Erro: "Recurso não encontrado" (404)

**Causa**: Arquivo não está em `/public`

**Solução**:
```bash
# Copiar arquivo para public
cp cotacao-china.html public/

# Reiniciar servidor
npm start
```

### Erro: "Mapa não está aparecendo"

**Causa**: Leaflet CDN bloqueado por CSP ou não carregado

**Solução**:
```bash
# Verificar server.js - CSP deve incluir:
- unpkg.com
- cdnjs.cloudflare.com
- cdn.jsdelivr.net
- tile.openstreetmap.org

# Verificar console (F12)
# Recarregar página (Ctrl+F5)
```

### Erro: "Nenhum fornecedor encontrado" (CSV Import)

**Causa**: Índices de linhas/colunas incorretos

**Solução**:
```
1. Clicar botão "Debug CSV"
2. Visualizar estrutura com números de linha/coluna
3. Ajustar importCSV() function com índices corretos
```

### Erro: "Cidade não encontrada"

**Causa**: Endereço não está na base de dados expandida

**Solução**:
```javascript
// Adicionar nova cidade em cotacao-china.html
// Encontrar array CITIES e adicionar:
const CITIES = [
  // ... cidades existentes
  {
    name: "Nova Cidade",
    lat: 23.1150,
    lng: 112.9580,
    aliases: ["Alternate Name", "别名"]
  }
];
```

### Performance Lenta na Exportação PDF

**Causa**: Mapa grande demais para captura

**Solução**:
```javascript
// Em generateOperationPDF(), ajustar:
const mapCanvas = await html2canvas(
  document.getElementById('map'),
  { scale: 1.0 } // Reduzir de 1.5 para 1.0
);
```

### LocalStorage Cheio

**Causa**: Muitos itens no histórico

**Solução**:
```
1. Abrir Histórico tab
2. Clicar "Limpar Tudo"
3. Histórico é deletado do localStorage

// Ou programaticamente:
localStorage.removeItem('consolidationHistory');
```

## 📊 Dados de Exemplo

### Rota Padrão
```javascript
{
  ori: "Foshan, Guangdong",
  dst: "São Paulo, SP",
  dist: "18432 km",
  mod: "Ocean Freight",
  time: "35-40 dias",
  vol: 5.0,
  kg: 1000,
  costUSD: 2500.00,
  costBRL: 12750.00
}
```

### Container Selecionado
```javascript
{
  type: "40gp",
  label: "40' General Purpose",
  vol: 58.0,
  maxKg: 28000,
  freightUSD: 1400,
  freightBRL: 7140,
  thcBRL: 850,
  internalBRL: 500,
  brokerBRL: 300,
  totalBRL: 8790
}
```

## 🚢 Cidades Suportadas

### Portos Principais
- Shanghai (Yangshan)
- Guangzhou / Nansha
- Shenzhen / Yantian
- Xiamen
- Dalian
- Tianjin
- Ningbo
- Qingdao

### Cidades Industriais (60+)
- Foshan, Guangdong
- Dongguan, Guangdong
- Shenzhen, Guangdong
- Huzhou, Zhejiang
- Wenzhou, Zhejiang
- Hangzhou, Zhejiang
- Suzhou, Jiangsu
- Wuhan, Hubei
- Chengdu, Sichuan
- E mais...

## 📚 Recursos Adicionais

### Documentação
- [Leaflet.js Docs](https://leafletjs.com/)
- [jsPDF Docs](https://github.com/parallax/jsPDF)
- [html2canvas Docs](https://html2canvas.hertzen.com/)
- [Express.js Guide](https://expressjs.com/)

### Bases de Dados de Cidades
- [GeoNames](https://www.geonames.org/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Baidu Maps](https://api.map.baidu.com/) (China)

## 🔄 Workflow de Desenvolvimento

### Setup Local
```bash
git clone <repo>
cd oktzzzz
npm install
npm start
```

### Fazer Alterações
```bash
# Editar arquivos
vim cotacao-china.html

# Copiar para public
cp cotacao-china.html public/

# Recarregar navegador (Ctrl+R)
```

### Deploy
```bash
# Commitar e fazer push
git add .
git commit -m "Feature: descrição"
git push origin main

# Em produção:
npm install --production
NODE_ENV=production npm start
```

## 📝 Licença

MIT License - Veja [LICENSE](LICENSE) para detalhes

## 👥 Contribuindo

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para reportar bugs ou solicitar features:
- Abrir issue no GitHub
- Enviar email para: support@oktz.com.br
- Discord: [Link do servidor]

## 🎯 Roadmap

- [ ] Autenticação de usuários
- [ ] Integração com ERP externo
- [ ] Cálculo de impostos (II, IPI, ICMS)
- [ ] Rastreamento de shipment em tempo real
- [ ] Integração com transportadoras (API)
- [ ] Relatórios avançados com gráficos
- [ ] Exportação para Excel com templates
- [ ] Aplicação mobile (React Native)
- [ ] Suporte multilíngue
- [ ] Dashboard analytics

## ✅ Checklist de Produção

Antes de fazer deploy:
- [ ] Testar todas as rotas
- [ ] Verificar exportação JSON/PDF
- [ ] Testar importação CSV com dados reais
- [ ] Confirmar busca de cidades funciona
- [ ] Validar cálculos de containers
- [ ] Testar histórico persistência
- [ ] Verificar responsividade mobile
- [ ] Testar em múltiplos navegadores
- [ ] Configurar backups de banco de dados
- [ ] Monitorar logs de produção

---

**Versão**: 1.0.0  
**Data**: Maio 2026  
**Status**: Production Ready ✅

Desenvolvido com ❤️ para otimizar operações de importação da China.
