# ⚡ Quick Start - OKTZ ERP

Comece a usar o OKTZ ERP em 5 minutos!

## 🚀 Inicialização Rápida

### 1️⃣ **Clone & Install** (1 min)
```bash
git clone https://github.com/seu-usuario/oktz-erp.git
cd oktzzzz
npm install
```

### 2️⃣ **Configure .env** (30 seg)
```bash
# Criar arquivo .env
cat > .env << EOF
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
EOF
```

### 3️⃣ **Inicie o Servidor** (30 seg)
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

### 4️⃣ **Abra no Navegador** (instantâneo)
```
http://localhost:3000/cotacao-china.html
```

✅ **Pronto! Aplicação rodando!**

---

## 📚 Primeiros Passos (Workflow)

### Cenário: Importar produtos de Foshan para São Paulo

#### Step 1: Calcular Rota
```
1. Aba: Rotas
2. Origem: "Foshan, Guangdong"
3. Destino: "São Paulo, SP"
4. Modal: "Ocean Freight"
5. Clique: "Calcular"
```

**Resultado**: 
- Distância: 18.432 km
- Tempo: 35-40 dias
- Custo: $2.500 USD

#### Step 2: Adicionar à Consolidação
```
1. Volume (m³): 5.0
2. Peso (kg): 1.000
3. Clique: "Adicionar à Consolidação"
```

**Resultado**: Rota salva e contador atualizado

#### Step 3: Selecionar Container
```
1. Aba: Container
2. Clique em: "40' GP" (ideal para 5m³)
3. Visualize custos:
   - Frete: R$ 7.140
   - THC: R$ 850
   - Interno: R$ 500
   - Despachante: R$ 300
   - TOTAL: R$ 8.790
```

#### Step 4: Exportar Relatório
```
Opção A - JSON:
1. Clique: "JSON"
2. Download: OC-OP-001_2026-05-07.json

Opção B - PDF:
1. Clique: "PDF"
2. Relatório gerado automaticamente
3. Download: OC-OP-001_2026-05-07.pdf
```

**Pronto! ✅**

---

## 🎯 Recursos Principais em 30 Segundos

### 🗺️ **Busca de Cidades**
```
- Digite cidade, distrito, ou até endereço
- Sistema encontra automaticamente
- Busca fuzzy com sugestões

Exemplos:
✓ "Foshan"
✓ "Danzao Town, Foshan"
✓ "Shouzi road, Guangdong"
```

### 🚢 **Mudança de Porto**
```
1. Container tab → "Mudar Porto"
2. Selecione novo porto
3. Fretes recalculados automaticamente

Portos disponíveis:
- Shanghai (maior capacidade)
- Guangzhou / Nansha (mais barato)
- Shenzhen (rápido)
- Xiamen, Dalian, Tianjin, etc.
```

### 📋 **Importação CSV**
```
1. Rotas tab → "Importar CSV"
2. Selecione arquivo Google Sheets
3. Dados extraídos automaticamente
4. Se erro: clique "Debug CSV"
```

### 💾 **Histórico**
```
1. Abra uma consolidação
2. Container tab → "Histórico"
3. Consolidação salva automaticamente
4. Consultável depois via Histórico tab

# Limpar histórico:
Histórico tab → "Limpar Tudo"
```

---

## 🔧 Troubleshooting Rápido

### ❌ "Mapa não aparece"
```bash
# Solução:
1. Pressione Ctrl+Shift+R (cache limpo)
2. Verifique console (F12)
3. Restart: npm start
```

### ❌ "Cidade não encontrada"
```
1. Verifique ortografia (case-insensitive)
2. Tente parcial: "Foshan" em vez de "Foshan City"
3. Veja lista completa em CITIES array (cotacao-china.html)
```

### ❌ "CSV não importa"
```
1. Clique "Debug CSV"
2. Veja estrutura de linhas/colunas
3. Reporte índices incorretos
4. Ajuste extractSupplierData() se necessário
```

### ❌ "PDF não gera"
```
1. Certifique-se de ter rota + container selecionado
2. Verifique console para errors
3. Tente novamente após 2 segundos
```

---

## 📊 Dados de Teste

### Teste Rápido (30 segundos)

**Rota Test**:
- Origem: `Foshan` (tipo Foshan, Guangdong)
- Destino: `São Paulo` (tipo São Paulo, SP)
- Modal: `Ocean Freight`
- Clique: `Calcular`

**Container Test**:
- Vol: `5.0` m³
- Kg: `1000` kg
- Container: `40'GP`

**Export Test**:
- JSON: Download completo ✓
- PDF: Relatório gerado ✓

---

## 💡 Dicas Avançadas

### Operações Manuais
```
Container tab → Manual sub-tab
1. Insira referência customizada
2. Origem/destino manual
3. Volume/peso
4. Salve

Useful para consolidações customizadas
```

### Comparativo de Portos
```
Container tab → Freight Rates
Veja automaticamente:
- Shanghai: $1.400
- Guangzhou: $1.400 (base)
- Shenzhen: $1.380 (-$20)
- Xiamen: $1.420 (+$20)

Selecione melhor opção
```

### Sidebar Customizada
```
Arraste slider: | ━━━━━━━ |
- Min: 250px (compact)
- Max: 600px (expanded)
- Preference salva automaticamente
```

---

## 🎓 Aprenda Mais

### Leia a Documentação Completa
```bash
# README.md - Guia completo
cat README.md

# CHANGELOG.md - Histórico de versões
cat CHANGELOG.md

# Este arquivo - Quick start
cat QUICKSTART.md
```

### Explorar o Código
```javascript
// Cálculo de rota: function calc()
// Consolidação: function addRouteToConsolidation()
// Exportação JSON: function exportOperationJSON()
// Exportação PDF: function generateOperationPDF()
// Histórico: function saveConsolidationToHistory()

// Busca em cotacao-china.html
```

---

## 📱 Responsividade

✅ Testado em:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x812)

> 💡 Recomendado: Usar em desktop para melhor experiência

---

## 🆘 Precisa de Ajuda?

### Quick Links
- 📖 [README.md](./README.md) - Documentação completa
- 📝 [CHANGELOG.md](./CHANGELOG.md) - Histórico
- 🐛 GitHub Issues
- 📧 support@oktz.com.br

### Comandos Úteis
```bash
# Logs do servidor
npm start

# Verificar porta ocupada
netstat -ano | findstr ":3000"

# Limpar node_modules
rm -rf node_modules
npm install

# Modo produção
NODE_ENV=production npm start
```

---

## ✅ Checklist Primeira Execução

- [ ] Clone o repositório
- [ ] `npm install` concluído
- [ ] `.env` criado
- [ ] `npm start` rodando
- [ ] Acesso em `http://localhost:3000/cotacao-china.html`
- [ ] Mapa aparece na tela
- [ ] Busca de cidade funciona ("Foshan")
- [ ] Cálculo de rota funciona
- [ ] Pode adicionar à consolidação
- [ ] Seleção de container funciona
- [ ] Exportação JSON/PDF funciona
- [ ] Histórico salva dados

**Todos ✅ = Sucesso! 🎉**

---

**Tempo total**: ~5 minutos ⏱️  
**Próximo passo**: Ler [README.md](./README.md) para guia completo

Bom uso! 🚀
