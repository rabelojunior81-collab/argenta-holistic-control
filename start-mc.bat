@echo off
title Mission Control — Argenta Fênix

:: ── Config ───────────────────────────────────────────────────────────────────
set MC_URL=http://localhost:3030
set MC_DIR=%~dp0
set DELAY_BROWSER=3000

:: ── Banner ───────────────────────────────────────────────────────────────────
color 2F
cls
echo.
echo   ╔══════════════════════════════════════════╗
echo   ║   MISSION CONTROL — ARGENTA FENIX        ║
echo   ║   Iniciando sistema...                   ║
echo   ╚══════════════════════════════════════════╝
echo.

:: ── Navega para o diretório do projeto ───────────────────────────────────────
cd /d "%MC_DIR%"

:: ── Verifica Node.js ──────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERRO] Node.js nao encontrado. Instale em https://nodejs.org
    pause
    exit /b 1
)

echo   [OK] Node.js detectado
echo   [..] Iniciando Mission Control...
echo.

:: ── Inicia o servidor em background ──────────────────────────────────────────
start "Mission Control Server" /min cmd /c "node start.mjs"

:: ── Aguarda servidor inicializar ──────────────────────────────────────────────
echo   [..] Aguardando servidor (3s)...
timeout /t 3 /nobreak >nul

:: ── Abre o browser em modo kiosk (sem barras, fullscreen) ────────────────────
echo   [..] Abrindo dashboard em modo fullscreen...
echo.

:: Tenta Chrome primeiro
set CHROME_PATH=
for %%i in (
    "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    "%LocalAppData%\Google\Chrome\Application\chrome.exe"
) do (
    if exist %%i (
        set CHROME_PATH=%%i
        goto :found_chrome
    )
)

:found_chrome
if defined CHROME_PATH (
    echo   [OK] Chrome encontrado — abrindo em modo kiosk
    start "" %CHROME_PATH% --app=%MC_URL% --start-fullscreen --disable-features=TranslateUI --no-default-browser-check --no-first-run
    goto :done
)

:: Tenta Edge
for %%i in (
    "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
    "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) do (
    if exist %%i (
        echo   [OK] Edge encontrado — abrindo em modo kiosk
        start "" %%i --app=%MC_URL% --start-fullscreen --disable-features=TranslateUI
        goto :done
    )
)

:: Fallback — abre com o browser padrão
echo   [WARN] Chrome/Edge nao encontrado — usando browser padrao
start "" %MC_URL%

:done
echo.
echo   ╔══════════════════════════════════════════╗
echo   ║   Mission Control ATIVO                  ║
echo   ║   Dashboard: http://localhost:3030        ║
echo   ║                                          ║
echo   ║   Feche esta janela para encerrar tudo   ║
echo   ╚══════════════════════════════════════════╝
echo.
echo   [Pressione qualquer tecla para encerrar o servidor]
pause >nul

:: ── Encerra o servidor ao fechar ─────────────────────────────────────────────
echo   [..] Encerrando Mission Control...
taskkill /f /im node.exe /fi "WINDOWTITLE eq Mission Control Server" >nul 2>&1
echo   [OK] Encerrado.
timeout /t 1 /nobreak >nul
