# 📝 Changelog - OKTZ ERP

Histórico de versões, melhorias e correções do Sistema de Consolidação de Importação da China.

---

## [1.0.0] - 2026-05-07 🎉 **PRODUCTION READY**

### ✨ **Novas Funcionalidades**

#### Roteamento & Logística
- ✅ Cálculo inteligente de rotas entre 60+ cidades chinesas
- ✅ Suporte para múltiplos modais de transporte
- ✅ Busca multi-nível com correspondência fuzzy
- ✅ Aliases em Inglês e Chinês para cidades
- ✅ Estimativa automática de tempo de trânsito
- ✅ Exibição de rotas alternativas

#### Consolidação de Containers
- ✅ Suporte para 4 tipos de containers (20/40GP, 40/45HC)
- ✅ Cálculo automático de ocupação (m³ e kg)
- ✅ Indicador de espaço livre
- ✅ Preços por container tipo
- ✅ Operações manuais customizáveis
- ✅ Integração com fornecedores ZAP

#### Portos Marítimos
- ✅ Seleção entre 8 portos principais
- ✅ Comparativo automático de fretes
- ✅ Atualização dinâmica de preços
- ✅ Classificação de portos (Tier 1/2/3)
- ✅ Preços específicos por container e porto

#### Cálculo de Custos
- ✅ Frete marítimo (por container)
- ✅ Taxas portuárias (THC, Doc, Lacre)
- ✅ Frete interno na China
- ✅ Despachante aduaneiro
- ✅ Conversão USD ↔ BRL automática
- ✅ Cálculo de custo/m³ e custo/kg

#### Exportação & Relatórios
- ✅ **Exportação JSON**: Serialização completa da operação
- ✅ **Exportação PDF**: Relatório profissional com:
  - Cabeçalho com referência e data
  - Listagem de rotas consolidadas
  - Especificações do container
  - Breakdown de custos
  - Snapshot do mapa Leaflet
  - Paginação automática
- ✅ **Histórico**: Persistência de consolidações em localStorage
- ✅ Nomes de arquivo com timestamp

#### Importação de Dados
- ✅ Suporte para importação CSV
- ✅ Extração de dados Google Sheets
- ✅ Debug visual de estrutura CSV
- ✅ Preenchimento automático de rotas

#### Interface & UX
- ✅ Design dark-mode nativo
- ✅ Sidebar redimensionável (250-600px)
- ✅ Persistência de preferências (localStorage)
- ✅ Abas: Rotas, Resultado, Container, Histórico
- ✅ Mapa interativo com Leaflet
- ✅ Notificações em tempo real
- ✅ Responsividade (desktop-first, mobile-friendly)
- ✅ Ícones Font Awesome 6.5.0

#### Segurança
- ✅ Helmet.js (headers HTTP de segurança)
- ✅ CORS configurado
- ✅ Content Security Policy (CSP)
- ✅ Rate limiting na API
- ✅ Compressão Gzip
- ✅ Limit de upload (10KB)

#### Backend
- ✅ Express.js com rotas estruturadas
- ✅ Morgan para logging
- ✅ Variáveis de ambiente (.env)
- ✅ Inicialização de banco de dados
- ✅ Estrutura modular

### 🐛 **Bugs Corrigidos**

| Versão | Issue | Correção |
|--------|-------|----------|
| 0.9.0 → 1.0.0 | Mapa não carrega | Atualizado CSP + script loading order |
| 0.8.0 → 0.9.0 | Cidades não encontradas | Expandida DB com 60+ cidades + busca fuzzy |
| 0.7.0 → 0.8.0 | Importação CSV falha | Adicionado debug visual para índices |
| 0.6.0 → 0.7.0 | Erro 404 em arquivo | Copied HTML para /public |

### 📊 **Melhorias de Performance**

- Otimização de DOM queries
- Caching de cálculos frequentes
- Compressão de assets
- Lazy loading de imagens
- Minimização de re-renders

### 📚 **Documentação**

- ✅ README.md completo (698 linhas)
- ✅ Guia de uso passo a passo
- ✅ Troubleshooting detalhado
- ✅ Exemplos de dados
- ✅ Roadmap futuro

---

## [0.9.0] - 2026-05-06 🗺️ **Database Expansion**

### Adicionado
- Expansão de CITIES array: ~35 → 60+ entradas
- Busca inteligente com múltiplos níveis
- Suporte para endereços completos
- Aliases em Chinês

### Corrigido
- Erro "Cidade não encontrada" resolvido
- Busca funciona com endereços parciais

---

## [0.8.0] - 2026-05-05 📁 **CSV Import**

### Adicionado
- Função importCSV()
- Parsing de Google Sheets
- Extração automática de dados
- Debug visual da estrutura CSV

### Known Issues
- Índices de linha/coluna dependem do formato do sheet

---

## [0.7.0] - 2026-05-04 📐 **Sidebar Resizing**

### Adicionado
- Range slider para resize (250-600px)
- Persistência em localStorage
- Variável CSS --sidebar-width

### Melhorado
- Responsividade do layout
- Flexibilidade da interface

---

## [0.6.0] - 2026-05-03 🏭 **Port Selection**

### Adicionado
- 8 portos marítimos
- Seleção dinâmica de porto
- Atualização automática de fretes
- Comparativo de preços
- Classificação Tier

### Melhorado
- Cálculos de custo mais precisos

---

## [0.5.0] - 2026-05-02 📊 **Container Consolidation**

### Adicionado
- 4 tipos de containers
- Cálculo de ocupação
- Container selection
- Manual operations
- ZAP supplier integration

### Refatorado
- Lógica de consolidação

---

## [0.4.0] - 2026-05-01 💾 **Export Functionality**

### Adicionado
- Exportação JSON
- Geração PDF com jsPDF
- Captura de mapa com html2canvas
- Relatórios profissionais
- Histórico persistido

### Implementado
- exportOperationJSON()
- generateOperationPDF()
- saveConsolidationToHistory()

---

## [0.3.0] - 2026-04-30 🗺️ **Mapping Integration**

### Adicionado
- Leaflet.js integration
- Mapa interativo
- Marcadores de origem/destino
- Visualização de rotas
- Controles de zoom

### Corrigido
- CSP policy para CDNs
- Script loading order

---

## [0.2.0] - 2026-04-29 🚀 **Backend Setup**

### Adicionado
- Express.js server
- Routing structure
- Segurança (Helmet, CORS)
- Rate limiting
- Static file serving

### Configurado
- PORT 3000
- Environment variables
- Middleware chain

---

## [0.1.0] - 2026-04-28 🎯 **Initial Release**

### Adicionado
- HTML5 frontend
- CSS3 styling (dark-mode)
- Vanilla JavaScript
- Font Awesome icons
- Layout básico

### Estrutura
- Sidebar com abas
- Mapa placeholder
- Seções de entrada

---

## 🔮 **Próximas Versões (Roadmap)**

### v1.1.0 - Q3 2026
- [ ] Autenticação de usuários (JWT)
- [ ] Dashboard com analytics
- [ ] Integração com banco de dados (PostgreSQL)
- [ ] API REST completa

### v1.2.0 - Q4 2026
- [ ] Cálculo automático de impostos (II, IPI, ICMS)
- [ ] Rastreamento de shipment
- [ ] Integração com transportadoras (API)
- [ ] Notificações por email

### v2.0.0 - 2027
- [ ] Aplicação mobile (React Native)
- [ ] Suporte multilíngue
- [ ] Sincronização com ERP externo
- [ ] Relatórios avançados com gráficos
- [ ] Machine learning para otimização de rotas

---

## 📊 **Estatísticas do Projeto**

| Métrica | Valor |
|---------|-------|
| Versão Atual | 1.0.0 |
| Status | Production Ready |
| Linhas de Código | ~2700 |
| Funcionalidades | 40+ |
| Cidades Suportadas | 60+ |
| Portos Principais | 8 |
| Tipos de Container | 4 |
| Dependências | 7 (backend) + 5 (CDN) |
| Tempo de Carga | ~1.2s |
| Tamanho HTML | 133KB |
| Suporte de Navegador | Chrome, Firefox, Safari, Edge |

---

## 🙏 **Agradecimentos**

- Leaflet.js por mapeamento excelente
- jsPDF e html2canvas por exportação
- Express.js pela simplicidade
- Community por sugestões

---

## 📞 **Reportar Bugs**

Encontrou um bug? Reporte em:
- GitHub Issues
- Email: support@oktz.com.br
- Discord: [Link]

---

**Última atualização**: Maio 7, 2026  
**Próxima versão**: v1.1.0 (Q3 2026)
