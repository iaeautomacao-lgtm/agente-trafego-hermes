# Agente de Tráfego Pago — Grupo DDM (Hermes + Paperclip)

Time de agentes que mantém as campanhas de Meta Ads da DDM **sempre ligadas** e falando com quem precisa: os alunos com mensalidades em aberto de cada cliente (instituição). Escopo definido pelo Gustavo na reunião de **20/10/2026**:

- **Público** = base do CRM da DDM com quem ainda está em aberto, **trocada todo dia** no público personalizado do cliente no Meta (quem pagou sai). A campanha não muda.
- **Anúncio** leva ao **DDMP** (ddmp.com.br) ou ao WhatsApp, com `cliente`, `campanha` e `criativo` no link.
- **Resultado** = visitas e acordos no DDMP por criativo → qual criativo dá o melhor retorno.
- **Humano**: um **OK por dia**, num horário fixo. Tudo que é criado no Meta nasce em pausa; uma pessoa liga no Ads Manager.

## Ciclo diário

```
~08:00  Público CRM ─▶ Resultados DDMP ─▶ Análise ─┬─▶ (se precisar) Planejador ─▶ Criativo (imagens) ─▶ Copy ─▶ Compliance
                                                    │
09:00   OK DO DIA (1 pessoa, 1 vez) ◀───────────────┘
depois  Publicador: anúncios novos EM PAUSA + pausa dos fracos ─▶ pessoa liga no Ads Manager
```

## Estado (22/10/2026)

| Parte | Onde | Status |
|---|---|---|
| 9 skills: `ddm-orquestrador-trafego`, `ddm-audiencia-crm` (novo), `ddm-estrategista-trafego` (Planejador), `ddm-designer-anuncios` (Criativo — imagens), `ddm-criativo-anuncios` (Copy), `ddm-compliance-anuncios`, `ddm-publicador-meta`, `ddm-resultados-ddmp` (novo), `ddm-dados-campanhas` (Análise) | `skills/trafego-pago/` | ✅ reescritas para o modelo sempre ligado · ⏳ instalar as 2 novas no Paperclip |
| Troca diária do público (CSV do CRM → hash SHA-256 → `usersreplace` no Meta; trava de 30%; exige base legal registrada) | `scripts/audiencia_sync.py` | ✅ testado com base falsa (dry-run/mock) · ⏳ export do CRM (Jair/TI) + acesso Meta (Gustavo) |
| Links com rastreio (`cliente`/`campanha`/`criativo`) | `scripts/utm.py` | ✅ |
| Resultados por criativo (gasto Meta + visitas/acordos DDMP → custo por visita/acordo + sugestão) | `scripts/resultados_ddmp.py` | ✅ testado com exports falsos · ⏳ formato real do export do DDMP (Jair) |
| Publicador: anúncios novos num conjunto existente + pausar, sempre PAUSED; recusa link sem rastreio | `scripts/meta_publicar.py` | ✅ `--mock`/`--dry-run` · ⏳ token Meta |
| Imagens (Gemini) | `scripts/gerar_arte.py` | ✅ |
| Segunda opinião de risco (Jev/TypeSafe), perguntas ajustadas ao novo modelo | `scripts/jev_risk_score.py` | ✅ |
| Painel: visão geral, OK do dia, campanhas por cliente, criativos com custo por visita/acordo, links, públicos, resultados, agentes; **tema claro (padrão) e escuro** | `index.html` + `dados/campanhas.json` → https://agente.trafego.grupoddm.ia.br | ✅ local · ⏳ deploy (login do cPanel) |
| Pilotos do modelo anterior (briefing → campanha) | `exemplos/`, `dados/campanhas.json → pilotos` | histórico |
| Dashboard React/Vite + Express (herdado) | `dashboard/` | referência |

## Como rodar

```bash
cd ~/Downloads/Agente-Trafego-main
python3 scripts/utm.py montar --cliente inst-a --campanha natal --criativo 02
python3 scripts/audiencia_sync.py --cliente inst-a --base ~/ddm-crm/inst-a/2026-10-22.csv            # dry-run
python3 scripts/resultados_ddmp.py --cliente inst-a --campanha inst-a-sempre --ddmp <ddmp.csv> --meta <meta.csv>
python3 scripts/meta_publicar.py dados/publicacoes/exemplo-ciclo-diario.json --dry-run
```
No Paperclip: o Orquestrador roda o ciclo do dia (rotina diária) e abre um único pedido de OK. Pedidos avulsos ("tema novo", "cliente novo") saem da tela **Novo tema / cliente** do painel.

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
