@echo off
chcp 65001 >nul 2>&1
title Mission Control - Argenta Fenix
cls

rem Navega para o diretorio do projeto
cd /d "%~dp0"

rem Verifica Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   [ERRO] Node.js nao encontrado. Instale em https://nodejs.org
    echo.
    pause
    exit /b 1
)

rem Abre o browser apos 3s em background (sem janela extra)
start "" /b powershell -WindowStyle Hidden -File "%~dp0open-browser.ps1"

rem Inicia o servidor no foreground desta janela
rem Quando o servidor encerrar (via botao no dashboard ou Ctrl+C), continua aqui.
node start.mjs

echo.
echo   Mission Control encerrado. Fechando em 2s...
timeout /t 2 /nobreak >nul
exit
