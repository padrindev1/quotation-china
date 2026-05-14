# 🚀 Deployment Guide - OKTZ ERP

Guia completo para fazer deploy da aplicação em produção.

---

## 📋 Pré-requisitos

- ✅ Node.js 18+ instalado
- ✅ npm ou yarn
- ✅ Servidor com acesso SSH
- ✅ Domínio configurado (opcional)
- ✅ SSL/TLS certificate (recomendado)
- ✅ Banco de dados (opcional)

---

## 🏗️ Arquitetura de Produção

```
┌─────────────────────────────────────────┐
│         Client (Browser)                 │
│  OKTZ ERP Frontend                      │
└────────────────┬────────────────────────┘
                 │ HTTPS
┌────────────────▼────────────────────────┐
│    Nginx (Reverse Proxy)                 │
│  - SSL/TLS                              │
│  - Rate Limiting                        │
│  - Static file caching                  │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│   Node.js Application (PM2)             │
│  Express + Helmet + CORS                │
│  PORT: 3000 (internal only)             │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│      Database (Optional)                 │
│  PostgreSQL / MongoDB / etc.            │
└─────────────────────────────────────────┘
```

---

## 🔧 Opção 1: Deploy Local/VPS com PM2

### Step 1: Conectar via SSH
```bash
ssh user@your-server.com
cd /var/www/oktz-erp
```

### Step 2: Clone do Repositório
```bash
git clone https://github.com/seu-usuario/oktz-erp.git
cd oktz-erp
```

### Step 3: Instalar Dependências
```bash
npm install --production
```

### Step 4: Configurar Environment
```bash
cat > .env << EOF
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://seu-dominio.com
DB_URL=... (se aplicável)
JWT_SECRET=seu-secret-seguro-aqui
EOF

# Permissões seguras
chmod 600 .env
```

### Step 5: Instalar PM2 Globalmente
```bash
npm install -g pm2
```

### Step 6: Iniciar Aplicação com PM2
```bash
pm2 start server.js --name "oktz-erp" --instances max --exec-mode cluster
pm2 save
pm2 startup
```

### Step 7: Verificar Status
```bash
pm2 status
pm2 logs oktz-erp
```

### Step 8: Configurar Nginx como Reverse Proxy
```bash
sudo nano /etc/nginx/sites-available/oktz-erp
```

Adicione:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name seu-dominio.com;
    
    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name seu-dominio.com;
    
    # SSL Certificate (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;
    
    # Security headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Cache
    client_max_body_size 10M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Cache estático
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Ativar:
```bash
sudo ln -s /etc/nginx/sites-available/oktz-erp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 9: Certificado SSL (Let's Encrypt)
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d seu-dominio.com
```

### Step 10: Verificar Aplicação
```bash
curl https://seu-dominio.com/cotacao-china.html
```

✅ **Deploy concluído!**

---

## 🐳 Opção 2: Docker

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.9'

services:
  oktz-erp:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      ALLOWED_ORIGINS: https://seu-dominio.com
    restart: always
    volumes:
      - ./logs:/app/logs
```

### Build & Run
```bash
docker-compose up -d
docker-compose logs -f oktz-erp
```

---

## ☁️ Opção 3: Heroku

### Preparar
```bash
npm install -g heroku
heroku login
heroku create seu-app-oktz
```

### Procfile
```
web: npm start
```

### Deploy
```bash
git push heroku main
heroku open
```

### Logs
```bash
heroku logs --tail
```

---

## 🔐 Checklist de Segurança

### ✅ Antes do Deploy

- [ ] `.env` não está commitado
- [ ] Node variables configuradas
- [ ] SSL/TLS certificado válido
- [ ] Rate limiting ativado
- [ ] CORS configurado corretamente
- [ ] CSP headers configurados
- [ ] Senha admin alterada
- [ ] Logs configurados
- [ ] Backup database configurado
- [ ] Monitoring ativado

### ✅ Headers de Segurança

Verificar se Helmet.js está retornando:
```bash
curl -I https://seu-dominio.com

# Esperado:
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

---

## 📊 Monitoramento & Logs

### PM2 Monitoring
```bash
# Dashboard em tempo real
pm2 monit

# Logs persistidos
pm2 logs oktz-erp --lines 100

# Erro específico
pm2 logs oktz-erp --err
```

### Logging com Winston (Recomendado)
```javascript
// server.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### Monitoramento de Performance
```bash
# New Relic
npm install newrelic
require('newrelic'); // No início de server.js

# Datadog
npm install datadog
# Configure via environment variables

# Sentry (Error Tracking)
npm install @sentry/node
Sentry.init({ dsn: 'https://...' });
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run build
      - name: Deploy
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          mkdir -p ~/.ssh
          echo "$DEPLOY_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh -i ~/.ssh/deploy_key user@server.com 'cd /var/www/oktz-erp && git pull && npm install && pm2 restart oktz-erp'
```

---

## 🔧 Manutenção em Produção

### Atualizar Aplicação
```bash
ssh user@server.com
cd /var/www/oktz-erp
git pull origin main
npm install --production
pm2 restart oktz-erp
```

### Backup de Database
```bash
# Backup diário via cron
0 2 * * * /usr/local/bin/backup-db.sh

# Script backup-db.sh:
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/var/backups/oktz
mkdir -p $BACKUP_DIR
pg_dump -U postgres oktz_db > $BACKUP_DIR/oktz_$DATE.sql
```

### Rollback
```bash
# Se algo der errado
git revert HEAD
npm install
pm2 restart oktz-erp
```

---

## 📈 Escaling

### Load Balancing com Nginx
```nginx
upstream oktz_backend {
    server localhost:3001 weight=1;
    server localhost:3002 weight=1;
    server localhost:3003 weight=1;
    server localhost:3004 weight=1;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;
    
    location / {
        proxy_pass http://oktz_backend;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Múltiplas Instâncias
```bash
# Iniciar em portas diferentes
pm2 start server.js --name "oktz-1" -i 4 --port 3001
pm2 start server.js --name "oktz-2" -i 4 --port 3002
pm2 start server.js --name "oktz-3" -i 4 --port 3003
pm2 start server.js --name "oktz-4" -i 4 --port 3004
```

---

## 🚨 Troubleshooting

### Erro: "Port 3000 already in use"
```bash
# Encontrar processo
lsof -i :3000

# Matar processo
kill -9 <PID>

# Ou usar porta diferente
PORT=3001 npm start
```

### Erro: "Cannot find module"
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install --production
```

### Erro: "EACCES: permission denied"
```bash
# Adicionar permissões
sudo chown -R $USER:$USER /var/www/oktz-erp
chmod -R 755 /var/www/oktz-erp
```

### Memory Leak
```bash
# Monitorar memória
pm2 monit

# Aumentar heap
node --max-old-space-size=4096 server.js

# Ou em PM2
pm2 start server.js --node-args="--max-old-space-size=4096"
```

---

## ✅ Verificação Final

```bash
# 1. Servidor rodando
pm2 status

# 2. Nginx funcionando
sudo systemctl status nginx

# 3. SSL válido
openssl s_client -connect seu-dominio.com:443

# 4. Aplicação acessível
curl -I https://seu-dominio.com/cotacao-china.html

# 5. Logs limpos
pm2 logs oktz-erp --lines 10

# 6. Backup ativo
ls -la /var/backups/oktz/
```

---

## 📞 Suporte

Problemas com deploy?
- 📧 support@oktz.com.br
- 🐛 GitHub Issues
- 📖 Verifique [README.md](./README.md)

**Deploy realizado com sucesso! 🎉**
