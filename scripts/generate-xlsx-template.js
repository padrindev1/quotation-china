#!/usr/bin/env node
/**
 * Gera o arquivo public/templates/OKTZ_template_rotas.xlsx
 * Use: node scripts/generate-xlsx-template.js
 *
 * O arquivo gerado é um Excel (.xlsx) formatado com:
 *  - Cabeçalho colorido com título e versão
 *  - Seção de instruções passo-a-passo
 *  - Tabela com guia de cada campo
 *  - Marcador visual indicando onde preencher
 *  - Cabeçalho de dados em destaque + 5 linhas de exemplo
 *  - Larguras de coluna otimizadas + congelamento da linha do cabeçalho
 */

const ExcelJS = require('exceljs');
const path = require('path');

const COLORS = {
  gold: 'FFE8B84B',
  darkBlue: 'FF0A4060',
  navy: 'FF2A4060',
  green: 'FF22BB77',
  cyan: 'FF7DD3FC',
  bg: 'FFF8F5EC',
  text: 'FF0A0E18',
  muted: 'FF666666',
  warning: 'FFFFF3D6',
};

const DATA_HEADERS = [
  'referencia','descricao','oc',
  'origem','tipo_origem','destino','tipo_destino','modal',
  'peso_kg','volume_m3','qtd_containers','tipo_container',
  'item_1_desc','item_1_qtd','item_1_un','item_1_usd',
  'item_2_desc','item_2_qtd','item_2_un','item_2_usd',
  'item_3_desc','item_3_qtd','item_3_un','item_3_usd',
  'item_4_desc','item_4_qtd','item_4_un','item_4_usd',
  'item_5_desc','item_5_qtd','item_5_un','item_5_usd',
];

const FIELD_GUIDE = [
  ['referencia',     'SIM', 'Texto livre',                                              'OP-001'],
  ['descricao',      'não', 'Texto livre',                                              'Maquinário CNC'],
  ['oc',             'não', 'Texto livre',                                              'OC 2576'],
  ['origem',         'SIM', 'Cidade chinesa',                                           'Foshan'],
  ['tipo_origem',    'não', 'factory | warehouse | port | airport | freezone | city',   'factory'],
  ['destino',        'SIM', 'Porto ou cidade',                                          'Guangzhou / Nansha'],
  ['tipo_destino',   'não', 'factory | warehouse | port | airport | freezone | city',   'port'],
  ['modal',          'SIM', 'road | rail | river | air',                                'road'],
  ['peso_kg',        'não', 'Número em kg',                                             '5000'],
  ['volume_m3',      'não', 'Número em m³ (decimal)',                                   '25.5'],
  ['qtd_containers', 'não', 'Número inteiro',                                           '1'],
  ['tipo_container', 'não', '20gp | 40gp | 40hc | 45hc | lcl',                          '40hc'],
  ['item_N_desc',    'não', 'Descrição do item (N = 1 a 5)',                            'Máquina CNC'],
  ['item_N_qtd',     'não', 'Quantidade',                                               '1'],
  ['item_N_un',      'não', 'UN | KG | M | M2 | M3 | CX | PC',                          'UN'],
  ['item_N_usd',     'não', 'Valor unitário em USD',                                    '15000'],
];

const EXAMPLES = [
  ['OP-001','Maquinário Industrial CNC','OC 2576','Foshan','factory','Guangzhou / Nansha','port','road',5000,25,1,'40hc','Máquina CNC',1,'UN',15000,'Peças de Reposição',50,'CX',2500,'Manual Técnico',5,'UN',0],
  ['OP-002','Equipamentos de Embalagem','OC 2709','Liaocheng','factory','Qingdao','port','road',8000,42,1,'40hc','Máquina de Embalagem Automática',2,'UN',22000,'Painel de Controle',2,'UN',3500,'Cabos e Fiação',1,'CX',800,'Ferramentas de Instalação',1,'CX',400],
  ['OP-003','Componentes Eletrônicos','OC 37578','Huzhou','factory','Shanghai','port','road',1200,8,1,'20gp','PCB Boards',500,'UN',12000,'Sensores Industriais',200,'UN',4000,'Conectores',1000,'UN',1500],
  ['OP-004','Equipamentos Laser','OC 2578','Liaocheng','factory','Tianjin','port','road',3500,18,1,'40gp','Laser de Corte CNC',1,'UN',35000,'Chiller Refrigerador',1,'UN',4500],
  ['OP-005','Maquinário Têxtil','OC 37800','Dongguan','factory','Shenzhen / Yantian','port','road',6200,32,1,'40hc','Bordadeira Industrial 20 Cabeças',1,'UN',28000,'Linha de Linha Automática',2,'UN',3200,'Motor de Reposição',4,'UN',800,'Software CNC',1,'UN',1200,'Parafusos e Fixações',1,'CX',300],
];

const STEPS = [
  '1.  Mantenha a estrutura da planilha — NÃO apague a linha do cabeçalho de dados (destacada em azul escuro)',
  '2.  Preencha uma linha por operação ABAIXO do cabeçalho de dados',
  '3.  Campos OBRIGATÓRIOS: referencia, origem, destino, modal',
  '4.  Antes de fazer upload: Arquivo → Salvar como → CSV UTF-8 (separado por vírgula)',
  '5.  No app: aba "Rotas" → "Importar de CSV" → selecionar o CSV → clicar Importar',
  '6.  Use o botão "Próximo/Anterior" para navegar entre as operações importadas',
];

const PORTS = 'Shanghai · Shenzhen / Yantian · Guangzhou / Nansha · Ningbo-Zhoushan · Tianjin · Qingdao · Xiamen · Dalian';

async function generate(){
  const wb = new ExcelJS.Workbook();
  wb.creator = 'OKTZ ERP';
  wb.lastModifiedBy = 'OKTZ ERP';
  wb.created = new Date();
  wb.modified = new Date();
  wb.company = 'OKTZ';

  const ws = wb.addWorksheet('Operações', {
    properties: { defaultRowHeight: 18 },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 0 }],
  });

  const lastCol = String.fromCharCode(64 + DATA_HEADERS.length); // 'AF' for 32 cols
  const lastColRange = `A1:${getColLetter(DATA_HEADERS.length)}1`;

  // ── Row 1: Title ───────────────────────────────────────────
  ws.mergeCells(`A1:${getColLetter(12)}1`);
  const title = ws.getCell('A1');
  title.value = '📦  OKTZ ERP — Template de Importação de Rotas';
  title.font = { name:'Calibri', bold: true, size: 16, color: { argb: COLORS.text } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gold } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  title.border = { bottom: { style:'thick', color:{argb: COLORS.darkBlue}} };
  ws.getRow(1).height = 32;

  // ── Row 2: Subtitle ────────────────────────────────────────
  ws.mergeCells(`A2:${getColLetter(12)}2`);
  const subtitle = ws.getCell('A2');
  subtitle.value = 'Versão 1.0   ·   cotacao-china1.vercel.app   ·   Salve como CSV antes do upload';
  subtitle.font = { italic: true, size: 10, color: { argb: COLORS.muted } };
  subtitle.alignment = { horizontal: 'center', vertical: 'middle' };
  subtitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bg } };
  ws.getRow(2).height = 20;

  // ── Row 4: "COMO USAR" header ─────────────────────────────
  ws.mergeCells(`A4:${getColLetter(12)}4`);
  const stepsTitle = ws.getCell('A4');
  stepsTitle.value = '📋  COMO USAR';
  stepsTitle.font = { bold: true, size: 12, color: { argb: COLORS.gold } };
  stepsTitle.alignment = { vertical: 'middle' };
  ws.getRow(4).height = 22;

  // ── Rows 5-10: Steps ──────────────────────────────────────
  STEPS.forEach((step, i) => {
    ws.mergeCells(`A${5+i}:${getColLetter(12)}${5+i}`);
    const c = ws.getCell(`A${5+i}`);
    c.value = step;
    c.font = { size: 10.5, color: { argb: COLORS.text } };
    c.alignment = { vertical: 'middle', wrapText: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.warning } };
    ws.getRow(5+i).height = 18;
  });

  // ── Row 12: "GUIA DE CAMPOS" header ───────────────────────
  ws.mergeCells(`A12:${getColLetter(12)}12`);
  const guideTitle = ws.getCell('A12');
  guideTitle.value = '📚  GUIA DE CAMPOS';
  guideTitle.font = { bold: true, size: 12, color: { argb: COLORS.gold } };
  guideTitle.alignment = { vertical: 'middle' };
  ws.getRow(12).height = 22;

  // ── Row 13: Guide table header ────────────────────────────
  const guideHeaders = ['Campo', 'Obrigatório', 'Valores Aceitos / Formato', 'Exemplo'];
  guideHeaders.forEach((h, i) => {
    const cell = ws.getCell(13, i+1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10.5 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = { bottom:{style:'thin', color:{argb: COLORS.darkBlue}} };
  });
  ws.getRow(13).height = 20;

  // ── Rows 14-29: Field guide rows ──────────────────────────
  FIELD_GUIDE.forEach((row, i) => {
    const r = 14 + i;
    row.forEach((val, j) => {
      const cell = ws.getCell(r, j+1);
      cell.value = val;
      cell.alignment = { vertical: 'middle' };
      cell.font = { size: 10 };
      if(j === 0){
        cell.font = { bold: true, color: { argb: COLORS.darkBlue }, size: 10, name: 'Consolas' };
      } else if(j === 1 && val === 'SIM'){
        cell.font = { bold: true, color: { argb: COLORS.gold }, size: 10 };
      } else if(j === 1){
        cell.font = { color: { argb: COLORS.muted }, size: 10 };
      } else if(j === 3){
        cell.font = { italic: true, color: { argb: COLORS.darkBlue }, size: 10 };
      }
      // alternating row bg
      if(i % 2 === 1){
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bg } };
      }
    });
  });

  // ── Row 31: Port list ─────────────────────────────────────
  ws.mergeCells(`A31:${getColLetter(12)}31`);
  const portInfo = ws.getCell('A31');
  portInfo.value = '⚓  Portos suportados:   ' + PORTS;
  portInfo.font = { size: 10, color: { argb: COLORS.darkBlue }, bold: true };
  portInfo.alignment = { vertical: 'middle' };
  portInfo.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: COLORS.bg } };
  ws.getRow(31).height = 22;

  // ── Row 32: Empty separator ───────────────────────────────
  ws.getRow(32).height = 8;

  // ── Row 33: "↓ PREENCHA DADOS ↓" marker ───────────────────
  ws.mergeCells(`A33:${getColLetter(DATA_HEADERS.length)}33`);
  const marker = ws.getCell('A33');
  marker.value = '⬇   PREENCHA OS DADOS DAS OPERAÇÕES NAS LINHAS ABAIXO   ⬇';
  marker.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  marker.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.green } };
  marker.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(33).height = 26;

  // ── Row 34: DATA HEADER (this is what the parser detects) ─
  DATA_HEADERS.forEach((h, i) => {
    const cell = ws.getCell(34, i+1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10.5, name: 'Consolas' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkBlue } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = {
      top:    { style: 'medium', color: { argb: COLORS.gold } },
      bottom: { style: 'medium', color: { argb: COLORS.gold } },
    };
  });
  ws.getRow(34).height = 24;

  // ── Rows 35-39: Example data ──────────────────────────────
  EXAMPLES.forEach((row, i) => {
    const r = 35 + i;
    DATA_HEADERS.forEach((_, j) => {
      const cell = ws.getCell(r, j+1);
      cell.value = (row[j] !== undefined) ? row[j] : '';
      cell.font = { size: 10 };
      cell.alignment = { vertical: 'middle' };
      if(i % 2 === 1){
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bg } };
      }
    });
  });

  // ── Reserve 50 empty rows for user data (with light borders) ─
  for(let i = 0; i < 50; i++){
    const r = 40 + i;
    DATA_HEADERS.forEach((_, j) => {
      const cell = ws.getCell(r, j+1);
      cell.border = { bottom: { style:'hair', color:{argb:'FFCCCCCC'} } };
    });
  }

  // ── Column widths ─────────────────────────────────────────
  const widths = [
    14, 28, 12,                  // referencia, descricao, oc
    16, 14, 22, 14, 10,          // origem, tipo_origem, destino, tipo_destino, modal
    10, 11, 14, 14,              // peso_kg, volume_m3, qtd_containers, tipo_container
    24, 8, 8, 11,                // item_1 (desc, qtd, un, usd)
    24, 8, 8, 11,                // item_2
    24, 8, 8, 11,                // item_3
    24, 8, 8, 11,                // item_4
    24, 8, 8, 11,                // item_5
  ];
  widths.forEach((w, i) => { ws.getColumn(i+1).width = w; });

  // ── Freeze rows 1-34 so data header stays visible ─────────
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 34, topLeftCell: 'A35', activeCell: 'A35' }];

  // ── Output ────────────────────────────────────────────────
  const outPath = path.join(__dirname, '..', 'public', 'templates', 'OKTZ_template_rotas.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log(`✓ Gerado: ${outPath}`);
}

function getColLetter(n){
  let s = '';
  while(n > 0){
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

generate().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
