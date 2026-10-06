### PLANO DE EXECUÇÃO - HERMES 



● # Agentes de Tráfego Pago — DDM × Meta Ads

\## Prompts base para OpenClaw

... (+287 more lines)

\*Versão 1.0 — Meta Ads / Fase inicial / OpenClaw na Hostinger\*

preciso que crie 4 agentes para fazer essas determinadas funcoes, ignore o openclaw, a ideia é de um dashboard (ja estou

criando) onde ira aparecer visualmente esses agntes, estilo no paperclip, mas estou fazendo do zero, a ideia é de ter agentes

cada um com funcção diferente e gerar um setor de ia autonomo de agentes focados em trafego pago, de inicio, vamos começar so

com esses 4 e depois pensamos em expandir, preciso que me ajude na construção deles, deixando registrado na pasta um txt sobre

cada um e o que ele faz ou esta fazendo... tambem preciso que construa uma arquitetura para integrar eles ao meu dashboard,

tambem estou pensando em usar n8n para integrações com a meta, mas nao sei se é realmente necessario, sempre antes de excutar

alguma coisam, me envie o plano de execução e depois de executar algo, um relatorio do que foi feito

Initializing agent...



────────────────────────────────────────



╭─ ⚕ Hermes ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮

&#x20;   Entendido! Antes de executar qualquer coisa, aqui está o plano de execução:







&#x20;   PLANO DE EXECUÇÃO



&#x20;   Fase 1 — Estrutura de Pastas e Documentação

&#x20;   Criar na pasta atual:





&#x20;   /agentes/

&#x20;     ├── 01-estrategista/

&#x20;     │   ├── README.txt          (descrição, função, inputs/outputs)

&#x20;     │   └── prompt.txt          (system prompt do agente)

&#x20;     ├── 02-criativo/

&#x20;     │   ├── README.txt

&#x20;     │   └── prompt.txt

&#x20;     ├── 03-compliance/

&#x20;     │   ├── README.txt

&#x20;     │   └── prompt.txt

&#x20;     ├── 04-dados/

&#x20;     │   ├── README.txt

&#x20;     │   └── prompt.txt

&#x20;     └── \_config/

&#x20;         ├── fluxo-agentes.txt   (como eles se conectam)

&#x20;         └── palavras-proibidas.txt



&#x20;   /arquitetura/

&#x20;     ├── visao-geral.txt         (diagrama em texto da arquitetura)

&#x20;     ├── api-spec.txt            (endpoints necessários para o dashboard)

&#x20;     └── integracao-n8n.txt      (análise: quando usar n8n vs. direto)





&#x20;   Fase 2 — Conteúdo de Cada Arquivo

&#x20;   - README de cada agente: nome, papel, objetivo, inputs esperados, outputs gerados, dependências

&#x20;   - Prompts: os system prompts completos que você forneceu (limpos e prontos para uso)

&#x20;   - Arquitetura: como o dashboard vai chamar os agentes, formato de dados, fluxo



&#x20;   Fase 3 — Análise n8n vs. Integração Direta

&#x20;   Vou documentar:

&#x20;   - Quando n8n faz sentido (webhooks Meta, automações complexas)

&#x20;   - Quando integração direta é melhor (chamadas simples de API)

&#x20;   - Recomendação para seu caso







&#x20;   PERGUNTAS ANTES DE EXECUTAR



&#x20;   1. Tecnologia do Dashboard — Está usando qual stack? (React, Vue, Next.js, outro?) Isso afeta a arquitetura de integração.



&#x20;   2. Backend — Já tem um backend ou vai criar? (Node.js, Python, etc.)



&#x20;   3. Onde os agentes vão rodar? — Opções:

&#x20;      - A) API própria (você hospeda os prompts e chama OpenAI/Anthropic)

&#x20;      - B) Hermes/Claude Code local

&#x20;      - C) Outro serviço de agentes



&#x20;   4. Meta Ads API — Já tem acesso à API do Meta (token de desenvolvedor, app criado)?







&#x20;   Responda essas perguntas e eu executo o plano com a arquitetura adequada para sua stack.

╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯



────────────────────────────────────────

● antes disso, daria para fazermos isso pelo hermes mesmo? porque a ideia é ter agentes autonomos atuando

────────────────────────────────────────





╭─ ⚕ Hermes ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮

&#x20;   Sim, dá perfeitamente! O Hermes tem exatamente o que você precisa para agentes autônomos:







&#x20;   COMO FUNCIONA NO HERMES



&#x20;   Opção 1 — Skills + delegate\_task (Recomendado)





&#x20;   ┌─────────────────────────────────────────────────────────┐

&#x20;   │                    VOCÊ (ou Dashboard)                  │

&#x20;   │                         │                               │

&#x20;   │                         ▼                               │

&#x20;   │              ┌──────────────────┐                       │

&#x20;   │              │   ORQUESTRADOR   │ ← skill master        │

&#x20;   │              │  (recebe briefing)│                      │

&#x20;   │              └────────┬─────────┘                       │

&#x20;   │                       │                                 │

&#x20;   │         ┌─────────────┼─────────────┐                   │

&#x20;   │         ▼             ▼             ▼                   │

&#x20;   │   ┌──────────┐  ┌──────────┐  ┌──────────┐             │

&#x20;   │   │ESTRATEG. │→ │ CRIATIVO │→ │COMPLIANCE│             │

&#x20;   │   │  (skill) │  │  (skill) │  │  (skill) │             │

&#x20;   │   └──────────┘  └──────────┘  └──────────┘             │

&#x20;   │                       │                                 │

&#x20;   │                       ▼                                 │

&#x20;   │              ┌──────────────────┐                       │

&#x20;   │              │      DADOS       │ ← fecha o loop        │

&#x20;   │              │     (skill)      │                       │

&#x20;   │              └──────────────────┘                       │

&#x20;   └─────────────────────────────────────────────────────────┘





&#x20;   Como funciona:

&#x20;   - Cada agente vira uma skill do Hermes

&#x20;   - O delegate\_task spawna subagentes que carregam a skill certa

&#x20;   - Fluxo sequencial: output de um → input do próximo

&#x20;   - Tudo roda autônomo, você só envia o briefing inicial



&#x20;   Opção 2 — Cronjobs (para automação recorrente)



&#x20;   Se quiser que o agente de Dados rode todo dia às 9h analisando métricas:



&#x20;   cronjob → carrega skill "ddm-dados" → puxa relatório → gera análise → notifica você





&#x20;   Opção 3 — Kanban (para fluxo visual de tarefas)



&#x20;   O Hermes tem um sistema Kanban embutido que pode gerenciar:



&#x20;   BACKLOG → ESTRATEGISTA → CRIATIVO → COMPLIANCE → APROVADO → DADOS









&#x20;   PLANO REVISADO



&#x20;   Fase 1 — Criar 4 Skills no Hermes



&#x20;   skills/

&#x20;     ├── ddm-estrategista-trafego/SKILL.md

&#x20;     ├── ddm-criativo-anuncios/SKILL.md

&#x20;     ├── ddm-compliance-anuncios/SKILL.md

&#x20;     └── ddm-dados-campanhas/SKILL.md





&#x20;   Fase 2 — Criar Skill Orquestradora



&#x20;   skills/

&#x20;     └── ddm-orquestrador/SKILL.md   ← coordena os 4 agentes





&#x20;   Fase 3 — Documentação na Pasta Atual

&#x20;   Manter os TXTs que você pediu para referência e para o dashboard



&#x20;   Fase 4 — Integração Dashboard

&#x20;   - Dashboard chama Hermes via CLI ou API

&#x20;   - Hermes executa o fluxo completo

&#x20;   - Retorna resultado estruturado (JSON)







&#x20;   VANTAGENS DESSA ABORDAGEM



&#x20;   ✅ Agentes realmente autônomos (delegate\_task)

&#x20;   ✅ Memória persistente entre sessões

&#x20;   ✅ Pode agendar execuções automáticas (cronjob)

&#x20;   ✅ Tudo em um só lugar, sem serviços externos

&#x20;   ✅ Dashboard só precisa chamar o Hermes



