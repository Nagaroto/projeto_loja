@echo off
REM ========================================
REM INSTALADOR AUTOMÁTICO DO PROJETO LOJA
REM Para Windows
REM ========================================

setlocal enabledelayedexpansion

echo.
echo ============================================
echo  PROJETO LOJA - SETUP AUTOMÁTICO WINDOWS
echo ============================================
echo.

REM Verificar se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python não foi encontrado!
    echo Por favor, instale Python 3.9+ em: https://www.python.org
    echo Certifique-se de marcar "Add Python to PATH"
    pause
    exit /b 1
)

echo [OK] Python detectado
python --version

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo [AVISO] Node.js não foi encontrado!
    echo Pode ser necessário para o frontend (React)
    echo Instale em: https://nodejs.org
)

echo.
echo [PASSO 1/4] Criando ambiente virtual Python...
if not exist venv (
    python -m venv venv
    echo [OK] Ambiente virtual criado
) else (
    echo [OK] Ambiente virtual já existe
)

echo.
echo [PASSO 2/4] Ativando ambiente virtual...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERRO] Falha ao ativar ambiente virtual
    pause
    exit /b 1
)

echo [OK] Ambiente virtual ativado

echo.
echo [PASSO 3/4] Instalando dependências Python...
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependências Python
    pause
    exit /b 1
)

echo [OK] Dependências Python instaladas

echo.
echo [PASSO 4/4] Instalando dependências Frontend (npm)...
cd frontend
if exist package.json (
    npm install
    if errorlevel 1 (
        echo [AVISO] Falha ao instalar dependências npm
        cd ..
    ) else (
        echo [OK] Dependências npm instaladas
        cd ..
    )
) else (
    echo [AVISO] Arquivo package.json não encontrado em frontend/
    cd ..
)

echo.
echo ============================================
echo  SETUP CONCLUÍDO COM SUCESSO!
echo ============================================
echo.
echo Próximos passos:
echo 1. Configure as variáveis de ambiente em config/settings.py
echo 2. Execute: python manage.py migrate
echo 3. Execute: python manage.py runserver
echo.
pause
