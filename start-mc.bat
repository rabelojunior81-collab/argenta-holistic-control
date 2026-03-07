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

:: ── Abre o browser após 3s (em background, não bloqueia) ─────────────────────
start /min cmd /c "timeout /t 3 /nobreak >nul & call :open_browser"
goto :start_server

:open_browser
set MC_URL=http://localhost:3030

for %%i in (
    "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    "%LocalAppData%\Google\Chrome\Application\chrome.exe"
) do (
    if exist %%i (
        start "" %%i --app=%MC_URL% --start-fullscreen --disable-features=TranslateUI --no-default-browser-check --no-first-run --disable-session-crashed-bubble
        exit /b 0
    )
)

for %%i in (
    "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
    "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) do (
    if exist %%i (
        start "" %%i --app=%MC_URL% --start-fullscreen --disable-features=TranslateUI
        exit /b 0
    )
)

start "" %MC_URL%
exit /b 0

:start_server
:: ── Inicia o servidor no foreground desta janela ─────────────────────────────
:: Quando o servidor encerrar (via [⏻] no dashboard ou Ctrl+C), esta janela fecha.
node start.mjs

:: ── Cleanup automático ao sair ────────────────────────────────────────────────
echo.
echo   Mission Control encerrado. Fechando em 2s...
timeout /t 2 /nobreak >nul
