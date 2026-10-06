================================================================================
INSTRUÇÕES DE USO — DASHBOARD DDM AGENTS
================================================================================

================================================================================
1. PRÉ-REQUISITOS
================================================================================

✓ Node.js v18+ instalado
✓ npm instalado
✓ Hermes CLI disponível no PATH (para execução real dos agentes)


================================================================================
2. INSTALAÇÃO
================================================================================

# Na pasta do dashboard
cd dashboard
npm install


================================================================================
3. INICIAR O SISTEMA
================================================================================

OPÇÃO A: Tudo junto (recomendado)
─────────────────────────────────
npm run dev

# Isso inicia:
# - Backend Express na porta 3001
# - Frontend Vite na porta 5173


OPÇÃO B: Separadamente (para debug)
───────────────────────────────────
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client


OPÇÃO C: Windows (clique duplo)
───────────────────────────────
Executar: start.bat


================================================================================
4. ACESSAR
================================================================================

Abrir no navegador: http://localhost:5173

O dashboard mostrará:
- Status da API (online/offline)
- 4 agentes com status atual
- Botão "Executar Fluxo Completo"
- Modal para executar agente individual


================================================================================
5. USAR OS AGENTES
================================================================================

VIA DASHBOARD:
──────────────
1. Clique em um card de agente
2. Digite o input no modal
3. Clique "Enviar"
4. Veja o output na mesma tela

VIA API DIRETA:
───────────────
# Listar agentes
curl http://localhost:3001/api/agents

# Executar agente específico
curl -X POST http://localhost:3001/api/agents/estrategista/execute \
  -H "Content-Type: application/json" \
  -d '{"input": "Briefing: campanha para re-engajamento..."}'

# Executar fluxo completo
curl -X POST http://localhost:3001/api/agents/flow/full \
  -H "Content-Type: application/json" \
  -d '{"briefing": "Criar campanha para alunos da Faculdade X..."}'

# Análise de dados
curl -X POST http://localhost:3001/api/agents/flow/analysis \
  -H "Content-Type: application/json" \
  -d '{"relatorio": "CTR: 1.2%, CPL: R$45, Conversões: 23..."}'


================================================================================
6. ESTRUTURA DE ARQUIVOS
================================================================================

dashboard/
├── server/                    # Backend Express
│   ├── index.js              # Servidor principal
│   ├── hermes.js             # Integração com Hermes CLI
│   └── routes/
│       └── agents.js         # Rotas da API
├── src/                       # Frontend React
│   ├── components/
│   │   ├── Dashboard.jsx     # Dashboard principal
│   │   ├── AgentPanel.jsx    # Painel dos agentes DDM
│   │   └── AgentPanel.css    # Estilos
│   └── services/
│       └── AgentService.js   # Cliente da API
├── package.json              # Dependências
├── vite.config.js            # Config do Vite + proxy
├── start.bat                 # Script Windows
└── start.sh                  # Script Linux/Mac


================================================================================
7. API ENDPOINTS
================================================================================

GET  /api/health              # Health check
GET  /api/agents              # Lista agentes
GET  /api/agents/:id          # Detalhes do agente
POST /api/agents/:id/execute  # Executa agente
POST /api/agents/:id/reset    # Reseta status
POST /api/agents/flow/full    # Fluxo completo
POST /api/agents/flow/analysis # Análise de dados
GET  /api/agents/meta/history # Histórico de execuções
GET  /api/agents/meta/health  # Status do Hermes


================================================================================
8. TROUBLESHOOTING
================================================================================

PROBLEMA: "API Offline" no dashboard
SOLUÇÃO:  Verifique se o backend está rodando (npm run server)

PROBLEMA: "Hermes Offline" 
SOLUÇÃO:  Verifique se o Hermes CLI está no PATH (hermes --version)

PROBLEMA: Agente não executa
SOLUÇÃO:  Verifique se a skill existe (hermes skills list)

PROBLEMA: Porta 3001 já em uso
SOLUÇÃO:  Altere PORT no server/index.js ou use:
          PORT=3002 npm run server


================================================================================
9. PRÓXIMOS PASSOS
================================================================================

☐ Testar execução real com Hermes
☐ Adicionar persistência (SQLite/MongoDB)
☐ Adicionar autenticação
☐ Integrar n8n para automações Meta Ads
☐ Deploy em produção

================================================================================
