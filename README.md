# Agente de Tráfego Pago — Grupo DDM (Hermes + Paperclip)

Agente autônomo de tráfego pago (Meta Ads) para o Grupo DDM. A cadeia **Estrategista → Criativo → Compliance → aprovação humana → Dados** roda como skills do Hermes Agent, orquestradas pelo Paperclip. **Nada é publicado no Meta Ads sem aprovação humana.**

## Estado atual (out/2026)

| Parte | Onde | Status |
|---|---|---|
| 5 skills Hermes (`ddm-estrategista-trafego`, `ddm-criativo-anuncios`, `ddm-compliance-anuncios`, `ddm-dados-campanhas`, `ddm-orquestrador-trafego`) | `skills/trafego-pago/` | ✅ funcionando |
| Instalador das skills | `skills/install.sh` | ✅ |
| Demo pelo terminal (plano + 6 criativos + compliance, score 20) | `exemplos/campanha-faculdade-teste-2026-10-01.md` | ✅ |
| Demo pelo Paperclip (agente Orquestrador Hermes delegando por child issues, score 18) | `exemplos/demo-matricula-trancada-paperclip.md` | ✅ |
| Dashboard React/Vite + Express (herdado do repo `Agente-Trafego`) | `dashboard/` | ⚠️ parcial — bridge Hermes corrigida em `dashboard/server/hermes-bridge.js` |
| Prompts originais dos agentes (referência) | `AGENTES DE TRAFEGO PAGO/` | referência |
| Agente Designer (artes) | — | ⏳ pendente (Gustavo) |
| Integração com a API do Meta Ads | — | ⏳ pendente (publicar PAUSADO após aprovação) |

## Como rodar as skills

```bash
# 1. instalar as skills no Hermes
bash skills/install.sh

# 2. rodar a cadeia completa a partir de um briefing
hermes chat --oneshot -s ddm-orquestrador-trafego -q "Objetivo: ... Público: ... Orçamento: ... Período: ... Restrições: ..."
```

No Paperclip: criar uma tarefa para o agente **Orquestrador Hermes** com o briefing; ele cria as child issues para os agentes Estrategista/Criativo/Compliance e para no gate de aprovação humana.

## Publicação (processo DDM)

1. `git commit` + `git push` neste repositório.
2. No servidor (cPanel → Git™ Version Control), **atualizar** o clone do domínio `agente-trafego.grupoddm.ia.br`.

---

## Dashboard (documentação original)


Dashboard web para monitorar e executar agentes por meio de uma interface visual, integrando frontend em React/Vite, backend em Express e execução dos agentes via Hermes CLI.

O sistema permite visualizar o status da API, acompanhar agentes disponíveis, executar agentes individualmente e rodar fluxos completos a partir de briefings ou relatórios.

## Visão geral

Este projeto possui:

- Frontend em React com Vite
- Backend em Node.js com Express
- Integração com Hermes CLI
- API REST para execução dos agentes
- Painel visual para acompanhamento de status
- Execução individual de agentes
- Execução de fluxo completo
- Estrutura preparada para autenticação, persistência e automações futuras

## Pré-requisitos

Antes de iniciar, verifique se você possui instalado:

- Node.js v18 ou superior
- npm
- Hermes CLI disponível no PATH, caso deseje executar agentes reais

Para verificar as versões:

```bash
node -v
npm -v
hermes --version
```

## Instalação

Acesse a pasta do projeto:

```bash
cd dashboard
```

Instale as dependências:

```bash
npm install
```

## Como iniciar o sistema

### Opção A: iniciar frontend e backend juntos

Esta é a forma recomendada para uso local.

```bash
npm run dev
```

Esse comando inicia:

- Backend Express na porta `3001`
- Frontend Vite na porta `5173`

### Opção B: iniciar separadamente para debug

Em um terminal, inicie o backend:

```bash
npm run server
```

Em outro terminal, inicie o frontend:

```bash
npm run client
```

### Opção C: executar no Windows

Também é possível iniciar o sistema pelo arquivo:

```bash
start.bat
```

## Acesso local

Após iniciar o sistema, acesse no navegador:

```text
http://localhost:5173
```

O dashboard exibirá:

- Status da API
- Status dos agentes
- Cards dos agentes disponíveis
- Botão para executar fluxo completo
- Modal para execução individual de agentes
- Retorno da execução na própria interface

## Como usar os agentes

### Pela interface do dashboard

1. Abra o dashboard no navegador.
2. Clique em um card de agente.
3. Digite o input no modal.
4. Clique em **Enviar**.
5. Aguarde o processamento.
6. Veja o resultado na tela.

### Pela API

Também é possível interagir diretamente com a API.

#### Listar agentes

```bash
curl http://localhost:3001/api/agents
```

#### Executar um agente específico

```bash
curl -X POST http://localhost:3001/api/agents/estrategista/execute \
  -H "Content-Type: application/json" \
  -d '{"input": "Briefing: campanha para re-engajamento..."}'
```

#### Executar fluxo completo

```bash
curl -X POST http://localhost:3001/api/agents/flow/full \
  -H "Content-Type: application/json" \
  -d '{"briefing": "Criar campanha para alunos da Faculdade X..."}'
```

#### Executar análise de dados

```bash
curl -X POST http://localhost:3001/api/agents/flow/analysis \
  -H "Content-Type: application/json" \
  -d '{"relatorio": "CTR: 1.2%, CPL: R$45, Conversões: 23..."}'
```

## Estrutura de arquivos

```text
dashboard/
├── server/
│   ├── index.js
│   ├── hermes.js
│   └── routes/
│       └── agents.js
│
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx
│   │   ├── AgentPanel.jsx
│   │   └── AgentPanel.css
│   │
│   └── services/
│       └── AgentService.js
│
├── package.json
├── vite.config.js
├── start.bat
└── start.sh
```

## Principais diretórios

### `server/`

Contém o backend da aplicação.

Arquivos principais:

- `index.js`: servidor principal Express
- `hermes.js`: camada de integração com o Hermes CLI
- `routes/agents.js`: rotas da API relacionadas aos agentes

### `src/`

Contém o frontend da aplicação.

Arquivos principais:

- `Dashboard.jsx`: tela principal do dashboard
- `AgentPanel.jsx`: painel visual dos agentes
- `AgentPanel.css`: estilos dos componentes
- `AgentService.js`: cliente responsável por consumir a API

## Endpoints da API

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/api/health` | Verifica se a API está online |
| GET | `/api/agents` | Lista todos os agentes |
| GET | `/api/agents/:id` | Retorna detalhes de um agente |
| POST | `/api/agents/:id/execute` | Executa um agente específico |
| POST | `/api/agents/:id/reset` | Reseta o status de um agente |
| POST | `/api/agents/flow/full` | Executa o fluxo completo |
| POST | `/api/agents/flow/analysis` | Executa análise de dados |
| GET | `/api/agents/meta/history` | Retorna o histórico de execuções |
| GET | `/api/agents/meta/health` | Verifica o status do Hermes |

## Troubleshooting

### API aparece como offline no dashboard

Verifique se o backend está rodando:

```bash
npm run server
```

Também confirme se a porta `3001` está livre.

### Hermes aparece como offline

Verifique se o Hermes CLI está instalado e disponível no PATH:

```bash
hermes --version
```

Se o comando não for reconhecido, será necessário instalar ou configurar o Hermes CLI corretamente no ambiente.

### Agente não executa

Verifique se a skill do agente existe:

```bash
hermes skills list
```

Também confira se o ID do agente usado na rota corresponde ao agente cadastrado no sistema.

### Porta 3001 já está em uso

Altere a porta no arquivo:

```text
server/index.js
```

Ou inicie o servidor com outra porta:

```bash
PORT=3002 npm run server
```

No Windows PowerShell:

```powershell
$env:PORT=3002; npm run server
```

## Deploy

Este projeto foi desenvolvido inicialmente para execução local.

Para deploy em produção, é necessário considerar:

- Separação entre frontend e backend
- Variáveis de ambiente
- Autenticação
- Proteção dos endpoints
- Controle de acesso por usuário ou setor
- Logs de execução
- Persistência dos históricos
- Ambiente seguro para execução do Hermes CLI

Caso o frontend seja publicado separadamente, gere o build com:

```bash
npm run build
```

A pasta final será:

```text
dist/
```

Essa pasta pode ser publicada em serviços de hospedagem estática.

## Segurança

Este projeto pode lidar com dados internos, briefings, relatórios e informações sensíveis da empresa.

Antes de publicar em qualquer ambiente externo, verifique se:

- O dashboard não está público sem autenticação
- Não existem tokens ou senhas no código
- Dados financeiros ou de clientes não estão expostos no frontend
- Arquivos `.env` não foram enviados ao repositório
- A API possui controle de acesso
- Os logs não armazenam informações sensíveis indevidamente

Recomenda-se usar autenticação antes de disponibilizar o sistema para outros setores.

## Próximos passos

- [ ] Testar execução real com Hermes CLI
- [ ] Adicionar autenticação
- [ ] Adicionar persistência com SQLite, PostgreSQL ou MongoDB
- [ ] Salvar histórico de execuções
- [ ] Criar controle de acesso por setor
- [ ] Integrar com n8n para automações
- [ ] Adicionar logs estruturados
- [ ] Criar ambiente de produção seguro
- [ ] Configurar deploy do frontend
- [ ] Configurar deploy do backend
- [ ] Documentar variáveis de ambiente
- [ ] Adicionar testes básicos da API

## Status do projeto

Projeto em fase inicial de desenvolvimento e validação local.

A estrutura atual permite testes internos e evolução para uma versão com autenticação, persistência e deploy em ambiente protegido.
