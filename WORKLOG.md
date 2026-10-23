# WORKLOG — Agente de Tráfego Pago (Meta Ads)

Formato: `## YYYY-MM-DD (Weekday) — Work log (~total)` e linhas `HH:MM–HH:MM (~duração) — o que foi feito (commit/issue)`. Horário de Nova York. Histórico até 19/10/2026 está resumido no `HANDOFF.md` (seção 9).

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
