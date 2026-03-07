#!/usr/bin/env bash
# sync-hmc.sh — Sincroniza holistic-mission-control → argenta-holistic-control
#
# Uso:
#   ./sync-hmc.sh                      # auto-commit com timestamp
#   ./sync-hmc.sh "mensagem customizada"
#
# O que faz:
#   1. Stage de todos os arquivos modificados/novos (respeita .gitignore)
#   2. Commit com mensagem semântica (ou a fornecida)
#   3. Push para origin (argenta-holistic-control)
#
# Quando usar:
#   - Após finalizar qualquer sub-sprint
#   - Antes de uma sessão de aprovação
#   - Sempre que quiser garantir que o repo standalone está atualizado
#
# Quando NÃO usar:
#   - Quando estiver no processo de fork agnóstico (Sprint 9)
#     — nesse ponto os repos divergem intencionalmente

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Verifica se está no repo correto
REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
if [[ "$REMOTE" != *"argenta-holistic-control"* ]]; then
  echo "⚠ AVISO: remote origin não é argenta-holistic-control"
  echo "  Remote atual: $REMOTE"
  echo "  Execute de dentro de sandbox/holistic-mission-control/"
  exit 1
fi

# Verifica se há algo para commitar
git add -A
if git diff --staged --quiet; then
  echo "✓ Nada para sincronizar — repositório já está atualizado."
  exit 0
fi

# Mensagem do commit
if [ -n "$1" ]; then
  MSG="$1"
else
  MSG="chore: sync — $(date '+%Y-%m-%d %H:%M')"
fi

git commit -m "$MSG

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git push origin master

echo ""
echo "✓ Sincronizado com argenta-holistic-control"
echo "  Branch: master"
echo "  Commit: $(git rev-parse --short HEAD)"
echo ""
echo "→ Para sincronizar também o workspace argenta_fenix:"
echo "  cd $(git rev-parse --show-toplevel)/../.."
echo "  git add sandbox/holistic-mission-control"
echo "  git commit -m 'chore: sync holistic-mission-control'"
echo "  git push"
