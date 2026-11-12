# Work log: Agente de Tráfego Pago (Meta Ads) — Grupo DDM

Times are America/New_York. Automated/background monitoring runs are not counted in time totals. "~" = estimate. Rules: `project-worklog` skill.
Last updated: 2026-11-12 by Claude Code

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
  - Planejamento: lista diária de quem abordar e retornos (visitas/acordos); usuários finais do OK do dia, treinados pelo Gui.
  - Jair (TI): técnico (API do sistema, domínio do DDMP, registro de visitas/acordos por link).
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
| Base legal do público registrada (LGPD) + autorização da Cruzeiro | Gui com Gustavo e o jurídico (o Gui cuida; não cobrar) | 2026-10-22 | 2026-11-12 | `base_legal` em `dados/campanhas.json`; troca diária do público pode ir para produção |

### Needs Gui's decision
- Repo público: antes do primeiro export real, decidir se o repo vira privado ou se os resultados da Cruzeiro ficam só locais — desde 2026-10-23.
- Re-teste do Designer (imagens reais, 2 criativos) — só com OK do Gui — desde 2026-10-19.

### Next up (agent can do now)
1. Quando o Gui trouxer a fonte do mailing (sistema da DDM): ligar em `audiencia_sync.py` (`--api` ou `--base`) e rodar em dry-run — ~15–30 min
2. Material de treino do planejamento (OK do dia, painel) — quando o Gui pedir

### Blocked / at risk
- Primeira troca do público da Cruzeiro — bloqueada pela base legal e pela autorização da Cruzeiro (jurídico, via Gustavo); o público atual no Meta está pronto (~36–43 mil) — Gui/Gustavo.
- Rotina diária do Orquestrador no Paperclip — só depois de haver dado real — Gui.

### Recently done (last 7 days)
- Gui administrador do portfólio do Grupo DDM no Meta, no lugar do login compartilhado (2026-11-01)
- Token do Meta (system user `agente-trafego`), app publicado, anúncio validado sem criar nada; limite de gasto na campanha da Cruzeiro (2026-11-10)
- Paperclip: skills atualizadas e regra de verba nos AGENTS.md (2026-11-10)
- Push resolvido (colaborador no repo certo), 13 commits enviados; `ddm-audiencia-crm` no Paperclip com o `--api` (2026-11-11)
- `audiencia_sync.py --api` (2026-11-11)
- Gustavo confirmou: R$ 100/dia é a soma de todas as campanhas ativas, igual à trava de `meta_publicar.py` e ao AGENTS.md (2026-11-11)

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
- 17:30–18:50 (~1 h 20 min, est.) — Revisão cruzada Grok + GPT no Cursor Automations (infra compartilhada, `agent-playbook`): 6 automações ativas, entre elas `Grok/GPT cross-reviewer - agente-trafego` neste repo (só gatilho por rótulo `review:grok` / `review:gpt`, porque o repo é público). Teste ponta a ponta feito em outro repo (pluris-lms, PR de teste já fechado): os dois revisores postaram em ~2 min, o Grok confirmou os achados do GPT e ambos deram AGREE. Neste repo ainda falta criar os rótulos (a conta `joaoguilherme-ops` só tem leitura; precisa da conta dona) e testar com um PR (Cursor)
- 2026-10-29 (time not recorded, ~1 h est.) — Revisão cruzada para repos sem o app do Cursor: espelhos privados em `joaoguilherme-ops` (`winko-apresentacao-xr-mirror`, `ddm-chat-agents-xr-mirror`), script `xr-mirror.sh` copia o PR para o espelho e devolve as reviews ao PR real; automações específicas Grok/GPT para `ddm-chat-agents`. Testado com PRs descartáveis nos dois repos (REVIEW x2, CONCLUSION, AGREE x2), todos fechados sem mesclar. Pendente: push do `agent-playbook` (aguardando o OK do Gui) (Cursor)
- Open: token do Meta + `testar_chaves.py --meta` (Gui) · mensagem ao Jair (Gui) · Paperclip check for updates + AGENTS.md (Gui) · decisões de linguagem e repo público (Gui + Gustavo) · criar rótulos `review:gpt`/`review:grok` neste repo com a conta dona (Gui)

## 2026-11-01 (Sunday) — Acesso ao Meta pela conta do Gui (~10 min)
- (time not recorded, ~5 min) — O login compartilhado que o Gustavo passou parou na verificação por chave de acesso (passkey), que fica no aparelho do dono da conta. Recomendado não insistir (risco de bloqueio da conta e da conta de anúncios) e pedir ao Gustavo que adicionasse o Facebook do Gui como administrador do portfólio; mensagem rascunhada (Claude Code)
- (time not recorded, ~5 min) — Gui adicionado como administrador do portfólio do Grupo DDM. Passo a passo do token refeito a partir da conta do Gui (conferir controle total, app Business, usuário do sistema, ativos, token, `.env`, teste). Token ainda não gerado; nada verificado (Claude Code)
- Open: token do Meta + `testar_chaves.py --meta` (Gui) · demais itens de 28/10 sem mudança

## 2026-11-04 (Wednesday) — Skill genérica a partir deste kit (~1 h 30 min, est.)
- (time not recorded, ~1 h 30 min est.) — Skill `meta-ads-launch` criada em `~/agent-playbook/skills/` (fora deste repo): entrevista → repo pessoal do Gui → `project.json` → 7 skills + scripts derivados dos daqui (sem nada da DDM) → empresa própria no Paperclip. Scripts copiados leem as chaves do Meta só de `~/.hermes/projects/<slug>.env`, nunca do `~/.hermes/.env` da DDM. Nada mudou neste repo nem no Paperclip da DDM (Claude Code)

## 2026-11-06 (Friday) — Acesso do agente ao Meta montado (~40 min, est.)
- (time not recorded, ~40 min est.) — Com o OK do Gui, Claude Code operou o Business Suite pelo Chrome (Gui digitou SMS e senha). Conta certa confirmada: portfólio Grupo DDM, conta de anúncios "Grupo DDM" com 5 campanhas da Cruzeiro, todas desativadas ("DDMPay - Cruzeiro Base Ativos", R$ 30/dia; conjunto "DDM Pay - Cruzeiro" com o público "Cruzeiro", lista de clientes, ~36–43 mil). Gui se registrou como desenvolvedor Meta; app próprio "DDM Trafego" criado (caso de uso API de Marketing, ligado ao Grupo DDM, não publicado, nível de acesso limitado). Usuário do sistema `agente-trafego` criado como **Employee** (não Admin: só enxerga o que foi atribuído) com: conta de anúncios (gerenciar campanhas), Página "DDM Soluções em Cobrança" (anúncios), app (desenvolver). Os 4 ids coletados; gravar no `.env` foi bloqueado pelo modo automático, ficou com o Gui. Achado: o público "Cruzeiro" mostra "Aceitar termos" (termos de público personalizado não aceitos na conta), o que bloqueia a troca diária pela API. Nada publicado, nada ligado (Claude Code)
- Open: gerar o token e colar no `.env` junto com os 4 ids (Gui) · aceitar os termos de público personalizado (Gustavo/DDM, junto com a base legal) · limite de gasto R$ 3.000 (Gui, com OK)

## 2026-11-09 (Monday) — Token do Meta funcionando (~20 min, est.)
- (time not recorded, ~20 min est.) — Gustavo aprovou a geração do token (duas vezes: a primeira aprovação se perdeu numa nova verificação de conta). Gui gerou o token do `agente-trafego` e gravou as 5 variáveis no `.env`. `testar_chaves.py --meta`: token, conta "Grupo DDM", público "Cruzeiro" (pronto, ~36–43 mil) e conjunto "DDM Pay - Cruzeiro" (campanha pausada) OK; termos de público personalizado aceitos na conta (o "Aceitar termos" da tela era só do usuário). Teste ajustado: Página conferida por `promote_pages` em vez de ler a Página, mais alertas de termos e de limite de gasto. Achados: (1) o token não enxerga a Página (`promote_pages`, `assigned_pages` vazios), então publicar anúncio pode falhar sem permissão de Página; (2) a conta tem limite de gasto de ~R$ 5.052 com ~R$ 4.921 já gastos: sobram ~R$ 132 antes de parar de veicular (Claude Code)
- Open: decidir validação sem criar nada × novo token com permissões de Página (Gui) · redefinir o limite de gasto da conta para R$ 3.000 (Gui, com OK do Gustavo) · push dos commits locais (Gui)

## 2026-11-10 (Tuesday) — Agente liberado para publicar no Meta (~35 min, est.)
- (time not recorded, ~20 min est.) — Validação "só validar" (`execution_options=validate_only`, não cria nada) de um anúncio no conjunto da Cruzeiro: primeiro falhou porque o app DDM Trafego estava em modo de desenvolvimento. Gustavo (WhatsApp): limite de gasto da conta ele vai aumentando, não mexer; política de privacidade é a do site do Grupo DDM. Gui preencheu no app a política (`grupoddm.tech/politica-de-privacidade`), termos (`grupoddm.tech/conformidade`), exclusão de dados e categoria, e publicou o app. Nova validação: `{"success": true}`; conferido que nenhum anúncio novo foi criado (6 anúncios, os do Gustavo). Token: system user, nunca expira, `ads_management`/`ads_read`/`business_management`. Plano B (novo token com permissão de Página) não foi necessário (Claude Code)
- (time not recorded, ~15 min est.) — Com o "pode" do Gui: limite de gasto na campanha "DDMPay - Cruzeiro Base Ativos" = gasto vitalício (R$ 3.888,97) + R$ 3.000 = R$ 6.888,97; campanha continua PAUSED, diária R$ 30. Paperclip pela API local: skills atualizadas (as 4 de 23/10 em `2e44a94`, as outras 5 sem mudança) e regra de verba (R$ 100/dia somando, teto R$ 3.000, aviso em 80%) no AGENTS.md do Orquestrador Hermes e do Dados de Campanhas 2, conferida depois de gravar. Push: a conta `joaoguilherme-ops` só tem leitura no repo (`push: false`); o remoto usa `iaeautomacao-lgtm`, cuja credencial no Mac falhou. Mensagens para Jair (exports, domínio) e Gustavo (R$ 100/dia somado, base legal, base do CRM, regra de linguagem) rascunhadas (Claude Code)
- Open: acesso de escrita ao repo (dono `iaeautomacao-lgtm` adiciona `joaoguilherme-ops` como colaborador, ou token) · respostas do Jair e do Gustavo

## 2026-11-11 (Wednesday) — Planejamento, respostas do Gustavo, base pela API (~1 h, est.)
- (time not recorded, ~10 min est.) — Gui: a lista diária e os retornos são do time de **planejamento**, não do Jair (TI); o Gui monta a plataforma e treina o planejamento, não opera. Mensagem ao planejamento rascunhada; perguntas ao Gustavo (verba somada, base legal, base do CRM, regra de linguagem) enviadas pelo Gui. Push ainda pendente: `joaoguilherme-ops` segue sem escrita no repo e sem convite pendente (Claude Code)
- (time not recorded, ~10 min est.) — Respostas do Gustavo: (1) R$ 100/dia é a soma das campanhas ativas, confirmado, nada a mudar; (2) base legal: respondeu que o público vai com telefone e e-mail e o Meta usa internamente, sem dizer a base legal; pergunta refeita (art. 7º da LGPD, contrato do parceiro); (3) base: um agente deve puxar a base do sistema via API e atualizar o Meta via API (o lado do Meta já existe em `audiencia_sync.py`; o lado do sistema é escopo novo, ROI mostrado ao Gui); (4) linguagem: se a regra for do parceiro não muda, se for da DDM ajustar. Achado: as proibições do Compliance vêm do Meta (atributos pessoais, situação financeira) e do CDC art. 42 (sem ameaça nem constrangimento), não da DDM; "suas dívidas" genérico já passa com ressalva (Claude Code)
- (time not recorded, ~25 min est.) — Gui: trabalho da DDM não passa pelo cartão de ROI (é o emprego dele; memória salva). `audiencia_sync.py --api` (e515155): puxa a base do dia do sistema da DDM (CSV ou JSON, paginação só no mesmo servidor, https, resposta só na memória), mesmas travas de antes (base legal, mínimo 100, 30%); testado com API falsa local (250 registros em 3 páginas, CSV, 401, http remoto, paginação para outro servidor, base legal ausente) e o CSV antigo segue igual. Skill `ddm-audiencia-crm`: API primeiro, CSV do planejamento como reserva. `testar_chaves.py --meta`: Página vazia em `promote_pages` virou AVISO (anúncio já validou); rodado: tudo OK, sobram R$ 131,78 no limite da conta. Mensagens para o planejamento (critério de "em aberto", retornos, contato) e para o Jair (API) rascunhadas (Claude Code)
- (time not recorded, ~5 min) — Gustavo: base legal vai para o jurídico; os testes com a Cruzeiro (o público que já está no Meta) foram feitos sem autorização da Cruzeiro. Linguagem: decisão do Gustavo de usar a comunicação que funcionar melhor e testar o que o Meta aprova. GitHub conferido de novo: `joaoguilherme-ops` sem escrita e sem convite neste repo (Claude Code)
- (time not recorded, ~10 min) — Push resolvido: a conta do Grupo tem dois repos parecidos, `Agente-Trafego` (privado, antigo, de junho) e `agente-trafego-hermes` (o nosso); o Gui tinha se adicionado ao antigo. Adicionado ao certo, 13 commits enviados (2e44a94..97d455b); remoto sem usuário embutido e credencial pelo `gh` só neste repo. Paperclip: `ddm-audiencia-crm` atualizada para 97d455b (texto da API conferido); as outras 8 sem mudança de conteúdo (Claude Code + Gui)
- Open: cPanel "Atualizar do remoto" (Gui) · base legal + autorização da Cruzeiro (jurídico, via Gustavo) · API do sistema (Jair) · respostas do planejamento · Paperclip "Check for updates" na skill `ddm-audiencia-crm` depois do push

## 2026-11-12 (Thursday) — Pendências do Gui (~10 min, est.)
- (time not recorded, ~5 min est.) — Rótulos `review:gpt` e `review:grok` criados no repo (agora com escrita). cPanel tentado pelo navegador: sessão expirada, pede login; fica com o Gui. Passo a passo das pendências entregue ao Gui (Claude Code)
- (time not recorded, ~5 min) — Gui rodou o cPanel "Atualizar do remoto"; conferido no ar (o WORKLOG do site já tem 2026-11-12). Gui: ele mesmo está montando a extração dos mailings direto do sistema, então as mensagens ao planejamento e ao Jair foram canceladas; base legal fica com ele e o Gustavo (Claude Code + Gui)
- Open: fonte do mailing (Gui) · base legal + autorização da Cruzeiro (Gui com Gustavo e o jurídico)

## 4. Summary (2026-10-19 → today)
- Total time: ~2 h 10 min (estimated; sum of the day totals 2026-10-19 → 2026-10-28; earlier history is in `HANDOFF.md` section 9, not counted)
- Main deliverables / decisions:
  - Handoff do projeto ao agente do Cursor; HANDOFF.md e WORKLOG.md (19/10)
  - Escopo novo "sempre ligado" (reunião de 20/10 com o Gustavo); decisões do Gui em 22/10: Claude desktop implementa, base do CRM por CSV diário até o Jair definir, painel claro por padrão
  - Scripts, 9 skills, painel e Paperclip no modelo novo; identidade visual do Grupo DDM (22/10)
  - Verba aprovada (R$ 100/dia, teto R$ 3.000), Cruzeiro como primeiro cliente, correções antes do Meta (23/10)
  - Painel no ar com d50fe5b (27/10); criação do token do Meta iniciada pelo Gui (28/10)
