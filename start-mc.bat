@echo off
title Mission Control — Argenta Fênix
color 2F
cls

:: ── Navega para o diretório do projeto ───────────────────────────────────────
cd /d "%~dp0"

:: ── Verifica Node.js ──────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   [ERRO] Node.js nao encontrado. Instale em https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: ── Abre o browser após 3s (PowerShell em background, sem janela extra) ────────
start "" /b powershell -WindowStyle Hidden -File "%~dp0open-browser.ps1"

:: ── Inicia o servidor no foreground desta janela ─────────────────────────────
:: Quando o servidor encerrar (via [⏻] no dashboard ou Ctrl+C), esta janela fecha.
node start.mjs

:: ── Cleanup automático ao sair ────────────────────────────────────────────────
echo.
echo   Mission Control encerrado. Fechando em 2s...
timeout /t 2 /nobreak >nul
