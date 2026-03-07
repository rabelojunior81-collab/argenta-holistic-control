# open-browser.ps1 — Abre o Mission Control no browser em modo kiosk
# Chamado pelo start-mc.bat em background após 3s de delay.

Start-Sleep -Seconds 3

$url  = "http://localhost:3030"
$args = "--app=$url --start-fullscreen --no-default-browser-check --no-first-run --disable-session-crashed-bubble"

$chromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
)

$edgePaths = @(
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)

$chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
$edge   = $edgePaths   | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($chrome) {
    Start-Process -FilePath $chrome -ArgumentList $args
} elseif ($edge) {
    Start-Process -FilePath $edge -ArgumentList $args
} else {
    # Fallback: abre no browser padrão do sistema
    Start-Process $url
}
