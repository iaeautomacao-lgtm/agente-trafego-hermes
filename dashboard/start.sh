#!/bin/bash
echo "============================================"
echo "  DDM Agents Dashboard - Iniciando..."
echo "============================================"
echo ""
echo "Porta Frontend: 5173"
echo "Porta Backend:  3001"
echo ""
echo "Pressione Ctrl+C para parar"
echo ""
cd "$(dirname "$0")"
npm run dev
