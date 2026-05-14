const nodemailer = require('nodemailer');

function createTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Credenciais Gmail não configuradas. Verifique GMAIL_USER e GMAIL_APP_PASSWORD no .env');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

function fmt(amount, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount);
}

function baseHtmlWrapper(title, bodyContent, senderName) {
  return `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;background:#f0f2f5;color:#212121}
  .wrap{max-width:620px;margin:24px auto}
  .hdr{background:linear-gradient(135deg,#1a237e,#283593);color:#fff;padding:24px 28px;border-radius:10px 10px 0 0}
  .hdr h1{font-size:18px;font-weight:700;margin-bottom:4px}
  .hdr p{font-size:13px;opacity:.85}
  .body{background:#fff;padding:24px 28px}
  .alert{background:#e3f2fd;border-left:4px solid #1565c0;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:18px;font-size:14px;line-height:1.6}
  .card{background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:14px}
  .row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #eee;font-size:14px}
  .row:last-child{border-bottom:none}
  .lbl{color:#666}
  .val{font-weight:600;color:#1a237e;text-align:right}
  .amount{font-size:28px;font-weight:700;color:#1a237e;margin-bottom:4px}
  .sub{color:#757575;font-size:13px}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700}
  .b-pending{background:#fff3e0;color:#e65100}
  .b-approved{background:#e8f5e9;color:#1b5e20}
  .b-paid{background:#e0f2f1;color:#004d40}
  .b-overdue{background:#ffebee;color:#b71c1c}
  .b-progress{background:#e3f2fd;color:#0d47a1}
  .b-completed{background:#e8f5e9;color:#1b5e20}
  .ftr{background:#f5f5f5;padding:14px 28px;border-radius:0 0 10px 10px;font-size:12px;color:#9e9e9e;line-height:1.8}
  .warn{color:#e65100;font-weight:600}
</style></head>
<body><div class="wrap">
  <div class="hdr">
    <h1>🏢 OKTZ — Setor de Importação</h1>
    <p>${title}</p>
  </div>
  <div class="body">${bodyContent}</div>
  <div class="ftr">
    <p>Enviado por <strong>${senderName}</strong> via Sistema ERP OKTZ</p>
    <p>${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
    <p class="warn">⚠️ Email interno confidencial — não encaminhe a terceiros.</p>
  </div>
</div></body></html>`;
}

async function sendPaymentEmail(payment, recipients, cc, customMessage, sender) {
  const transporter = createTransporter();

  const statusLabel = {
    pending: 'Pendente', approved: 'Aprovado', paid: 'Pago',
    overdue: 'Vencido', cancelled: 'Cancelado',
  }[payment.status] || payment.status;

  const badgeClass = `b-${payment.status}`;

  const body = `
    ${customMessage ? `<div class="alert"><strong>Mensagem:</strong><br>${customMessage.replace(/\n/g, '<br>')}</div>` : ''}
    <p class="amount">${fmt(payment.amount, payment.currency)}</p>
    ${payment.amount_brl ? `<p class="sub">≈ ${fmt(payment.amount_brl, 'BRL')} &nbsp;|&nbsp; Câmbio: ${payment.exchange_rate}</p>` : ''}
    <br>
    <div class="card">
      <div class="row"><span class="lbl">Fornecedor</span><span class="val">${payment.supplier_name || '—'}</span></div>
      <div class="row"><span class="lbl">Descrição</span><span class="val">${payment.description}</span></div>
      <div class="row"><span class="lbl">Invoice / Referência</span><span class="val">${payment.invoice_ref || '—'}</span></div>
      <div class="row"><span class="lbl">Vencimento</span><span class="val">${new Date(payment.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span></div>
      <div class="row"><span class="lbl">Forma de Pagamento</span><span class="val">${payment.payment_method || '—'}</span></div>
      ${payment.swift_ref ? `<div class="row"><span class="lbl">SWIFT / Ref. Banco</span><span class="val">${payment.swift_ref}</span></div>` : ''}
      <div class="row"><span class="lbl">Status</span><span class="val"><span class="badge ${badgeClass}">${statusLabel}</span></span></div>
      ${payment.notes ? `<div class="row"><span class="lbl">Observações</span><span class="val">${payment.notes}</span></div>` : ''}
    </div>`;

  const html = baseHtmlWrapper(
    `Notificação de Pagamento — ${payment.supplier_name || 'Fornecedor'}`,
    body,
    sender.name,
  );

  await transporter.sendMail({
    from: `"OKTZ Importação" <${process.env.GMAIL_USER}>`,
    to: recipients.join(', '),
    cc: cc.length ? cc.join(', ') : undefined,
    subject: `[OKTZ Imp] Pagamento ${payment.invoice_ref || `#${payment.id}`} — ${payment.supplier_name || 'Fornecedor'} — ${fmt(payment.amount, payment.currency)}`,
    html,
    replyTo: process.env.GMAIL_USER,
  });
}

async function sendCustomsEmail(process_, recipients, cc, customMessage, sender) {
  const transporter = createTransporter();

  const statusLabel = {
    draft: 'Rascunho', in_progress: 'Em Andamento',
    customs_clearance: 'Em Desembaraço', released: 'Liberado',
    completed: 'Concluído', suspended: 'Suspenso',
  }[process_.status] || process_.status;

  const body = `
    ${customMessage ? `<div class="alert"><strong>Mensagem:</strong><br>${customMessage.replace(/\n/g, '<br>')}</div>` : ''}
    <div class="card">
      <div class="row"><span class="lbl">Nº do Processo</span><span class="val">${process_.process_number}</span></div>
      <div class="row"><span class="lbl">Fornecedor</span><span class="val">${process_.supplier_name || '—'}</span></div>
      <div class="row"><span class="lbl">Produto</span><span class="val">${process_.product_description}</span></div>
      <div class="row"><span class="lbl">NCM</span><span class="val">${process_.ncm_code || '—'}</span></div>
      <div class="row"><span class="lbl">Valor Invoice</span><span class="val">${fmt(process_.invoice_value, process_.currency)}</span></div>
      <div class="row"><span class="lbl">Custo Total (Landed)</span><span class="val">${fmt(process_.total_landed_cost || 0, 'BRL')}</span></div>
      <div class="row"><span class="lbl">Status</span><span class="val"><span class="badge b-progress">${statusLabel}</span></span></div>
      ${process_.estimated_arrival ? `<div class="row"><span class="lbl">Prev. Chegada</span><span class="val">${new Date(process_.estimated_arrival + 'T12:00:00').toLocaleDateString('pt-BR')}</span></div>` : ''}
    </div>`;

  const html = baseHtmlWrapper(
    `Atualização Processo Aduaneiro — ${process_.process_number}`,
    body,
    sender.name,
  );

  await transporter.sendMail({
    from: `"OKTZ Importação" <${process.env.GMAIL_USER}>`,
    to: recipients.join(', '),
    cc: cc.length ? cc.join(', ') : undefined,
    subject: `[OKTZ Imp] Processo ${process_.process_number} — ${statusLabel} — ${process_.product_description}`,
    html,
    replyTo: process.env.GMAIL_USER,
  });
}

async function sendGenericEmail(recipients, cc, subject, message, sender) {
  const transporter = createTransporter();

  const body = `<div class="card" style="white-space:pre-wrap;line-height:1.7;font-size:14px">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>`;

  const html = baseHtmlWrapper(subject, body, sender.name);

  await transporter.sendMail({
    from: `"OKTZ Importação" <${process.env.GMAIL_USER}>`,
    to: recipients.join(', '),
    cc: cc.length ? cc.join(', ') : undefined,
    subject: `[OKTZ Imp] ${subject}`,
    html,
    replyTo: process.env.GMAIL_USER,
  });
}

module.exports = { sendPaymentEmail, sendCustomsEmail, sendGenericEmail };
