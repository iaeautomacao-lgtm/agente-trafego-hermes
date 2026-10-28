# Work log: Agente de Tráfego Pago (Meta Ads) — Grupo DDM

Times are America/New_York. Automated/background monitoring runs are not counted in time totals. "~" = estimate. Rules: `project-worklog` skill.
Last updated: 2026-10-28 15:10 by Claude Code (sessão do Meta / cPanel)

## 1. Project overview
- **O que é e por quê:** um time de agentes de IA que mantém as campanhas de Meta Ads da Grupo DDM (cobrança de mensalidades de faculdades) **sempre ligadas**, uma por cliente (instituição), falando com os alunos que ainda estão em aberto. Escopo definido pelo Gustavo na reunião de 20/10/2026: o público do Meta é a base do CRM com quem está em aberto, trocada todo dia (quem pagou sai); o anúncio leva ao DDMP ou ao WhatsApp com `cliente`/`campanha`/`criativo` no link; o resultado é custo por visita e por acordo de cada criativo; um humano dá um OK por dia. Sucesso = acordos/visitas no DDMP a custo baixo, dentro da verba.
- **Como funciona:**
  - Repo **público** `iaeautomacao-lgtm/agente-trafego-hermes`; clone no Mac do Gui em `~/Downloads/Agente-Trafego-main`. Por ser público, ids do Meta, URLs do Ads Manager, dados de alunos e chaves nunca entram no repo, em issue ou no log.
  - 9 skills em `skills/trafego-pago/` (fonte da verdade) rodam como agentes Hermes no Paperclip local (modelo `claude-sonnet-4-6`, todos reportam ao Orquestrador Hermes). Ciclo do dia: Público CRM → Resultados DDMP → Análise → (se precisar) Planejador → Criativo (imagens, Gemini) → Copy → Compliance → OK do dia → Publicador.
  - Scripts Python: `audiencia_sync.py` (CSV do CRM → hash SHA-256 → troca do público; trava de 30%; exige base legal), `resultados_ddmp.py`, `utm.py`, `meta_publicar.py` (tudo nasce `PAUSED`; recusa link sem rastreio; travas de verba), `gerar_arte.py`, `jev_risk_score.py`, `testar_chaves.py`. Graph API v26. Chaves em `~/.hermes/.env`, fora do repo.
  - Painel: `index.html` + `dados/campanhas.json`, publicado no servidor da DDM por cPanel ("Atualizar do remoto" manual depois do push). O dashboard React/Express em `dashboard/` é herdado, só referência.
  - Histórico até 19/10/2026 está resumido no `HANDOFF.md` (seção 9); detalhe de tudo em `HANDOFF.md` e `README.md`.
- **Estado atual (28/10/2026):**
  - Nada no Meta ainda. Scripts testados só offline (dry-run, mock, exports falsos). Gui começou em 28/10 a criar o usuário do sistema e o token do Meta (passo a passo dado na sessão; não concluído).
  - Painel no ar com o commit d50fe5b (cPanel atualizado pelo Gui em 27/10; verificado: `dados/campanhas.json` no site traz verba e Cruzeiro).
  - Primeiro cliente: Cruzeiro (campanha existente, hoje desativada; 6 criativos do Gustavo em `dados/campanhas.json`).
  - Paperclip: 9 skills e 2 agentes novos (Público CRM, Resultados DDMP) instalados em 22/10; as mudanças de 23/10 em 4 skills ainda precisam de "Check for updates" (não verificado se foi feito).
  - Falta para ligar: token do Meta + ids, limite de gasto no Ads Manager, exports do CRM e do DDMP, base legal do público. Re-teste do Designer (imagens reais no Paperclip) pendente.
- **Pessoas e papéis:**
  - Gui (João Guilherme): dono; tem o login do Facebook e todas as credenciais; dá os OKs; faz a ponte entre os agentes.
  - Gustavo: gestor; define escopo, verba, acesso ao Meta e base legal do público.
  - Jair (TI): exports do CRM e do DDMP; registro de visitas/acordos por link.
  - Gisele / Arthur: login do cPanel / Dev Hub (resolvido em 23/10).
  - Agentes: Claude desktop (Cowork) fez a reestruturação de 22/10; Claude Code as correções de 23/10; agente do Cursor (cloud, leitura) assumiu em 19/10. Canal de coordenação: issue #1.
- **Regras e restrições** (HANDOFF seção 7):
  - Nunca ler, imprimir, colar ou commitar chaves/tokens; agente nenhum faz login no Meta.
  - Nada ativo no Meta: só `PAUSED`; ativação é humana no Ads Manager.
  - Base do CRM e exports do DDMP nunca entram no repo, issue ou log (só contagens); público vai ao Meta só em hash e só com base legal registrada.
  - Imagem falsa é pior que nenhuma. Testes pequenos (custo de Claude + Gemini).
  - Linguagem: pode falar de negociar dívidas; não pode ameaçar, expor, prometer ou criar urgência falsa (skill do Compliance).
- **Números-chave:**
  - Verba: R$ 100/dia somando as campanhas, teto R$ 3.000 (Gustavo, 23/10). Cruzeiro: R$ 30/dia no Meta hoje (23/10).
  - Referência do Gustavo (20/10): R$ 3.888 gastos → 2.291 visitas no DDMP (≈ R$ 1,70/visita); melhor criativo R$ 1,52.
  - Jev nos criativos atuais da Cruzeiro: 57 (06), 29 (02), 19 (WhatsApp genérico) (23/10).

## 2. To-do and waiting-on (current)

### Waiting on others
| Item | Waiting on (who) | Since | Last follow-up | What happens when it arrives |
|---|---|---|---|---|
| Formato do export diário do CRM (quem está em aberto, por cliente) e do export do DDMP (por data/cliente/campanha/criativo) | Jair (TI) | 2026-10-22 | not recorded | `audiencia_sync.py` em dry-run com a base real; `resultados_ddmp.py` ajustado |
| Confirmar o domínio do DDMP e que ele grava `cliente`/`campanha`/`criativo` | Jair | 2026-10-23 | 2026-10-26: mensagem rascunhada para o Gui enviar (envio não confirmado) | links e resultados por criativo confiáveis |
| Base legal do público registrada | Gustavo (jurídico) | 2026-10-22 | not recorded | troca diária do público pode ir para produção |
| Confirmar que R$ 100/dia é a soma das campanhas | Gustavo | 2026-10-23 | not recorded | travas de verba confirmadas |

### Needs Gui's decision
- Token do Meta + ids no `~/.hermes/.env` e limite de gasto no Ads Manager (Gui, com o login do Gustavo; passo a passo no HANDOFF 5.1a/1b) — desde 2026-10-23; Gui em andamento desde 2026-10-28 (Business Suite → Configurações → Usuários do sistema) — bloqueia qualquer coisa no Meta. Ao terminar: `python3 scripts/testar_chaves.py --meta`.
- Paperclip: "Check for updates" nas 4 skills alteradas em 23/10 + regra de verba no AGENTS.md do Orquestrador Hermes e do Dados de Campanhas 2 — desde 2026-10-23.
- Repo público: antes do primeiro export real, decidir se o repo vira privado ou se os resultados da Cruzeiro ficam só locais — desde 2026-10-23.
- Regra de linguagem × criativos que já rodaram (afrouxar a regra ou só os novos seguem) — Gui + Gustavo — desde 2026-10-23.
- Re-teste do Designer (imagens reais, 2 criativos) — só com OK do Gui — desde 2026-10-19.

### Next up (agent can do now)
1. (nada sem o token do Meta ou os exports; ver Blocked / at risk)

### Blocked / at risk
- Primeira troca do público da Cruzeiro: conferir antes com `testar_chaves.py --meta` se o público não está marcado para expirar (regra do Meta desde jan/2026; a campanha está desativada) — bloqueado pelo token — Gui.
- Rotina diária do Orquestrador no Paperclip — só depois de haver dado real — Gui.

### Recently done (last 7 days)
- Modelo "sempre ligado": scripts `utm.py`, `audiencia_sync.py`, `resultados_ddmp.py`, `meta_publicar.py` com spec do dia; painel claro/escuro; 9 skills reescritas (2026-10-22)
- Paperclip atualizado (9 skills, agentes Público CRM e Resultados DDMP, AGENTS.md dos 9); painel com a identidade do Grupo DDM (2026-10-22)
- Verba, Graph API v26, upload de imagem corrigido, travas de verba, cliente Cruzeiro, `testar_chaves.py --meta` (commit d50fe5b) (2026-10-23)
- Push de d50fe5b + cPanel "Atualizar do remoto"; painel no ar verificado (2026-10-27)

## 3. Log

## 2026-10-19 (Monday) — Work log (~25 min)
- 12:30–12:45 (~15 min) — HANDOFF.md e este WORKLOG.md criados (Claude/Cowork) para passar o projeto ao agente do Cursor
- 12:34–12:44 (~10 min) — Agente do Cursor assume: git pull, leitura do HANDOFF.md/WORKLOG.md, plano do re-teste do Designer (seção 5.1); nada executado, aguardando OK do Gui

## 2026-10-22 (Thursday) — Escopo novo: modelo "sempre ligado" (~30 min)
- 11:52–11:58 (~6 min) — Leitura da transcrição da reunião de 20/10 com o Gustavo; os 5 agentes dele comparados com os nossos 7; decisões do Gui: Claude desktop implementa, base do CRM por CSV diário até o Jair definir, painel claro por padrão (Claude/Cowork)
- 11:58–12:06 (~8 min) — Scripts: `utm.py`, `audiencia_sync.py` (troca diária do público, hash SHA-256, trava de 30%, exige base legal), `resultados_ddmp.py` (custo por visita/acordo por criativo); `meta_publicar.py` com spec do dia (adicionar/pausar, recusa link sem rastreio); perguntas do Jev ajustadas; tudo testado com dados falsos
- 12:06–12:12 (~6 min) — Painel reescrito: tema claro (padrão) / escuro, OK do dia, clientes e campanhas sempre ligadas, criativos com custo por visita/acordo, links com rastreio, públicos; `dados/campanhas.json` v2 + `exemplo-simulado.json`
- 12:12–12:20 (~8 min) — 9 skills reescritas (novas: `ddm-audiencia-crm`, `ddm-resultados-ddmp`), README, `dados/README.md`, HANDOFF (seções 1–5)
- Open: push + "Atualizar do remoto" no cPanel (login 401 — Gisele/Arthur) (Gui)
- Open: Paperclip — atualizar 7 skills, importar 2 novas, criar agentes Público CRM e Resultados DDMP, limpar AGENTS.md antigos (Gui + Claude)
- Open: formato dos exports do CRM e do DDMP (Jair) · acesso Meta, ids, base legal, verba (Gustavo)

## 2026-10-22 (Thursday) — Paperclip no modelo novo + identidade visual (~20 min)
- 13:00–13:08 (~8 min) — Paperclip: 7 skills atualizadas para 3e435e7, skills novas `ddm-audiencia-crm` e `ddm-resultados-ddmp` importadas, agentes **Público CRM** (34f4dcdf) e **Resultados DDMP** (5a084b5b) criados (Hermes, claude-sonnet-4-6, reportam ao Orquestrador); AGENTS.md dos 9 agentes reescritos para o modelo sempre ligado (revisões antigas guardadas no Paperclip) (Claude/Cowork)
- 13:08–13:20 (~12 min) — Painel com a identidade do logo Grupo DDM: marca DDM (`assets/ddm-marca.png`) + "GRUPO" no menu, laranja em degradê #FF4500→#FF6108, Montserrat/Inter, fundo branco/cinza neutro (claro) e grafite (escuro), favicon

## 2026-10-23 (Friday) — Verba, Cruzeiro e correções antes do Meta (~15 min)
- ~16:50–17:05 (~15 min, est.) — Transcrição + prints da reunião de 20/10 relidos com o que mudou: verba R$ 100/dia e teto R$ 3.000 (Gustavo), login do Facebook com o Gui, cPanel resolvido, base do CRM só na produção. Graph API v21 → v26 (`scripts/_env.py`); `meta_publicar.py`: upload de imagem corrigido (base64 em vez do nome do arquivo), campanha nova padrão tráfego/visualização da página de destino, travas de verba (soma diária ≤ R$ 100, spend_cap R$ 3.000); `resultados_ddmp.py`: anúncios "Criativo NN", `acordos_rastreados` por cliente, alerta de verba ≥ 80%; `testar_chaves.py --meta` (só GET, sem ids no output); cliente Cruzeiro em `dados/campanhas.json`; painel com verba e pendências; 4 skills e HANDOFF (seções 2, 4, 5, 7). Testes offline: dry-run, mock, executar com urlopen falso, junção de criativos com exports falsos, painel sem erro de JS. Jev nos criativos atuais da Cruzeiro: 57 (06), 29 (02), 19 (WhatsApp genérico) (Claude Code)
- Open: token do Meta + ids no `~/.hermes/.env` e limite de gasto no Ads Manager (Gui, com o login do Gustavo)
- Open: Paperclip → Check for updates nas 4 skills alteradas + regra de verba no AGENTS.md do Orquestrador Hermes e do Dados de Campanhas 2 (Gui)
- Open: repo público → decidir antes do primeiro export real se o repo vira privado ou se `resultados` da Cruzeiro fica só local (Gui)
- Open: confirmar com o Jair o domínio do DDMP (`utm.destino` = https://ddmp.com.br/, tirado da transcrição) e que ele grava `cliente`/`campanha`/`criativo`; confirmar com o Gustavo que R$ 100/dia é a soma das campanhas
- Open: decidir a regra de linguagem × criativos que já rodaram (Gui + Gustavo) · base legal do público (Gustavo) · export do DDMP (Jair) · cPanel "Atualizar do remoto" depois do push (Gui)

## 2026-10-26 (Monday) — Plano de ação + mensagem ao Jair (~10 min)
- (time not recorded, ~10 min) — Recap do que foi feito e do que falta; plano passo a passo por tarefa para o Gui; mensagem em português para o Jair (domínio do DDMP, parâmetros `cliente`/`campanha`/`criativo`, export diário só com contagens, base do CRM só na produção) (Claude Code)
- Open: enviar a mensagem ao Jair (Gui) · token do Meta (Gui)

## 2026-10-27 (Tuesday) — Painel atualizado no servidor (~10 min)
- (time not recorded, ~10 min) — Push de d50fe5b confirmado no GitHub (commit de 23/10 com emenda: pendências de AGENTS.md, repo público e confirmações do Jair/Gustavo). Gui rodou "Atualizar do remoto" no cPanel (Gerenciar → Extrair ou Implantar) no repo `agente-trafego (site)`, que estava parado em 14601c1 de 09/10. Verificado no ar: `dados/campanhas.json` com atualizado_em 2026-10-23, teto R$ 3.000 e cliente Cruzeiro; painel com as pendências novas (Claude Code + Gui)

## 2026-10-28 (Wednesday) — Formato do worklog + token do Meta (~20 min)
- (time unknown, ~5 min) — WORKLOG no formato do skill project-worklog (visão geral, pendências, log, resumo); parte do rollout registrado em Call-sandwich-Retell.
- (time not recorded, ~10 min) — Passo a passo para o Gui criar, no Business Suite do portfólio Grupo DDM, o usuário do sistema `agente-trafego`, atribuir conta de anúncios e a Página "DDM Soluções em Cobrança" (os anúncios rodam nela, não na página grupoddm), criar/atribuir um app Business, gerar o token e preencher as 5 variáveis no `~/.hermes/.env`. Em andamento pelo Gui; nada verificado ainda (Claude Code)
- ~15:05–15:10 (~5 min, est.) — Passada do fim do dia no WORKLOG (dias 26–28/10, pendências) (Claude Code)
- Open: token do Meta + `testar_chaves.py --meta` (Gui) · mensagem ao Jair (Gui) · Paperclip check for updates + AGENTS.md (Gui) · decisões de linguagem e repo público (Gui + Gustavo)

## 4. Summary (2026-10-19 → today)
- Total time: ~2 h 10 min (estimated; sum of the day totals 2026-10-19 → 2026-10-28; earlier history is in `HANDOFF.md` section 9, not counted)
- Main deliverables / decisions:
  - Handoff do projeto ao agente do Cursor; HANDOFF.md e WORKLOG.md (19/10)
  - Escopo novo "sempre ligado" (reunião de 20/10 com o Gustavo); decisões do Gui em 22/10: Claude desktop implementa, base do CRM por CSV diário até o Jair definir, painel claro por padrão
  - Scripts, 9 skills, painel e Paperclip no modelo novo; identidade visual do Grupo DDM (22/10)
  - Verba aprovada (R$ 100/dia, teto R$ 3.000), Cruzeiro como primeiro cliente, correções antes do Meta (23/10)
  - Painel no ar com d50fe5b (27/10); criação do token do Meta iniciada pelo Gui (28/10)
