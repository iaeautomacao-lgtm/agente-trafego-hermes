#!/usr/bin/env bash
# Instala as skills de tráfego pago da DDM no Hermes local (macOS/Linux).
set -e
SRC="$(cd "$(dirname "$0")/trafego-pago" && pwd)"
DST="${HERMES_HOME:-$HOME/.hermes}/skills/trafego-pago"
mkdir -p "$DST"
cp -R "$SRC"/. "$DST"/
echo "Skills instaladas em $DST:"
ls "$DST"
echo
echo "Teste rápido:"
echo '  hermes chat --oneshot -s ddm-estrategista-trafego -q "Campanha de reengajamento para a Faculdade Teste. Orçamento R$ 2.000. Período: outubro. Objetivo: aluno acessar o portal de negociação."'
