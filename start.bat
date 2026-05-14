@echo off
echo.
echo  ============================================
echo   OKTZ ERP - Setor de Importacao
echo  ============================================
echo.

if not exist ".env" (
  echo [AVISO] Arquivo .env nao encontrado!
  echo Copiando .env.example para .env...
  copy .env.example .env
  echo.
  echo [IMPORTANTE] Edite o arquivo .env antes de continuar:
  echo   - Defina JWT_SECRET com uma chave forte
  echo   - Configure GMAIL_USER e GMAIL_APP_PASSWORD
  echo   - Altere ADMIN_DEFAULT_PASSWORD
  echo.
  pause
)

if not exist "node_modules" (
  echo Instalando dependencias...
  npm install
  echo.
)

echo Iniciando servidor...
node server.js
pause
