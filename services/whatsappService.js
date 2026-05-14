const path = require('path');

let client = null;
let status = 'disabled';
let qrCode = null;
let initAttempted = false;

function initWhatsApp() {
  if (initAttempted) return;
  initAttempted = true;

  try {
    const { Client, LocalAuth } = require('whatsapp-web.js');
    const qrcode = require('qrcode-terminal');

    status = 'initializing';

    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '..', 'data', 'whatsapp-session'),
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      },
    });

    client.on('qr', (qr) => {
      status = 'qr_required';
      qrCode = qr;
      console.log('\n📱 WhatsApp — escaneie o QR code no seu celular:');
      qrcode.generate(qr, { small: true });
    });

    client.on('authenticated', () => {
      status = 'authenticated';
      qrCode = null;
      console.log('✓ WhatsApp autenticado');
    });

    client.on('ready', () => {
      status = 'connected';
      qrCode = null;
      console.log('✓ WhatsApp conectado');
    });

    client.on('auth_failure', (msg) => {
      status = 'auth_failed';
      console.error('WhatsApp auth failure:', msg);
    });

    client.on('disconnected', (reason) => {
      status = 'disconnected';
      client = null;
      initAttempted = false;
      console.log('WhatsApp desconectado:', reason);
    });

    client.initialize().catch((err) => {
      status = 'error';
      console.error('WhatsApp init error:', err.message);
    });
  } catch (err) {
    status = 'error';
    console.error('WhatsApp module error:', err.message);
  }
}

if (process.env.WHATSAPP_ENABLED === 'true') {
  initWhatsApp();
}

async function sendWhatsApp(phoneNumber, message) {
  if (status !== 'connected' || !client) {
    throw new Error(`WhatsApp não está conectado (status: ${status}). Verifique o painel de notificações.`);
  }
  const digits = phoneNumber.replace(/\D/g, '');
  if (!digits) throw new Error('Número de telefone inválido');

  const chatId = digits.endsWith('@c.us') ? digits : `${digits}@c.us`;
  await client.sendMessage(chatId, message);
}

function getWhatsAppStatus() {
  return { status, hasQr: !!qrCode, qr: status === 'qr_required' ? qrCode : null };
}

function reconnect() {
  if (client) {
    client.destroy().catch(() => {});
    client = null;
  }
  initAttempted = false;
  initWhatsApp();
}

module.exports = { initWhatsApp, sendWhatsApp, getWhatsAppStatus, reconnect };
