# HANDOFF — Agente de Tráfego Pago (Meta Ads) · Grupo DDM

**Para:** quem pega o projeto (agente do Cursor, Claude desktop, ou pessoa). **Leia inteiro antes de mexer.** Mantenha o `WORKLOG.md` (formato no fim).

> **22/10/2026 — o escopo mudou.** Na reunião de 20/10 o Gustavo explicou o que ele quer de verdade, e é diferente do que estava montado (campanha nova a partir de briefing, aprovada uma a uma). As seções 1–5 abaixo já estão no modelo novo. A reestruturação de 22/10 foi feita pelo Claude desktop (Cowork), a pedido do Gui.

---

## 1. O que é (modelo "sempre ligado", 20/10/2026)
A DDM negocia dívidas de mensalidade de alunos para instituições de ensino (clientes). Cada cliente tem **uma campanha de Meta Ads sempre ligada**. Os agentes fazem o trabalho do dia:
- **Público**: a base do CRM com os alunos em aberto daquele cliente (telefone + e-mail) **substitui todo dia** o público personalizado do cliente no Meta. Quem pagou sai. A campanha não muda.
- **Criativos**: renovados quando a Análise pede ou quando muda o tema (Natal, Black Friday…). Primeiro a imagem, depois a copy "de acordo com o criativo".
- **Rastreio**: todo link leva `cliente`, `campanha`, `criativo` (ex.: `?cliente=inst-a&campanha=natal&criativo=02`). O sistema da DDM (Jair) registra a visita no DDMP e o acordo, quando fechado lá.
- **Resultado**: custo por visita e por acordo de cada criativo → escalar, manter, pausar.
- **Humano**: **um OK por dia**, num horário fixo (padrão 09:00). Tudo que o Publicador cria nasce `PAUSED` (travado no código); uma pessoa liga no Ads Manager (o Gustavo já viu o Meta exigir isso).

Exemplo real mostrado pelo Gustavo: R$ 3.888 gastos → 2.291 pessoas no DDMP (≈ R$ 1,70/visita); melhor criativo a R$ 1,52. Copy que rodou: "Resolva suas dívidas, fale conosco pelo WhatsApp" — por isso a regra de linguagem mudou: **pode falar de negociar dívidas**; não pode ameaçar, expor a pessoa, prometer ou criar urgência falsa.

## 2. Onde está cada coisa
| O quê | Onde |
|---|---|
| Repo | `iaeautomacao-lgtm/agente-trafego-hermes` (**público**) · clone no Mac: `~/Downloads/Agente-Trafego-main` |
| Skills (fonte da verdade) | `skills/trafego-pago/ddm-*/SKILL.md` (9 skills) |
| Scripts | `audiencia_sync.py` (troca o público: CSV → hash → `usersreplace`; dry-run/mock/executar; trava de 30%; exige base legal) · `resultados_ddmp.py` (gasto Meta + visitas/acordos DDMP por criativo) · `utm.py` (monta/confere links) · `meta_publicar.py` (spec `adicionar`/`pausar` do dia, ou campanha nova; sempre PAUSED; recusa link sem rastreio) · `gerar_arte.py` (Gemini) · `jev_risk_score.py` (Jev) · `testar_chaves.py` · `_env.py` |
| Dados do painel | `dados/campanhas.json` v2 (clientes → público + campanha sempre ligada → criativos + resultados; `ok_diario`), schema em `dados/README.md`; simulação em `dados/exemplo-simulado.json` |
| Bases e exports (fora do git) | `~/ddm-crm/<cliente>/<data>.csv` (CRM), `~/ddm-crm/ddmp/<data>.csv`, `~/ddm-crm/meta/<cliente>-<data>.csv` |
| Painel | `index.html` → https://agente.trafego.grupoddm.ia.br · tema claro (padrão) / escuro no topo · `?sim=1` abre a simulação |
| Paperclip | http://127.0.0.1:3100/GRU/ · empresa `01b7e083-3ae7-4f29-bdcd-f2ceca73d9b9` · iniciar com `npx paperclipai run` |
| Chaves (`~/.hermes/.env`) | `GOOGLE_API_KEY` ✅ · `TYPESAFE_API_KEY` ✅ · `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `META_PAGE_ID`, `META_AUDIENCE_<CLIENTE>`, `META_ADSET_<CLIENTE>` ❌ (Gustavo) |

## 3. Agentes no Paperclip (Hermes, claude-sonnet-4-6, Reports to = Orquestrador Hermes)
| # | Papel novo | Nome no Paperclip | ID | Skill |
|---|---|---|---|---|
| O | Orquestrador (ciclo diário + OK do dia) | Orquestrador Hermes | `65238a5e-9057-41f4-b766-baee06e31f3a` | ddm-orquestrador-trafego |
| 1 | Público CRM | Público CRM | `34f4dcdf-d58d-492b-a94d-eca831a356b4` | ddm-audiencia-crm |
| 2 | Planejador de campanhas | Estrategista de Tráfego 2 | `69acc6b1-15fb-4e8c-b022-5cb45bb33da1` | ddm-estrategista-trafego |
| 3 | Criativo (imagens) | Designer de Anúncios | `69f749f4-3853-47f5-8e75-ef31566d964b` | ddm-designer-anuncios |
| 4 | Copy | Criativo de Anúncios 2 | `3bad73d5-d812-484b-aa1c-186ca22efc9f` | ddm-criativo-anuncios |
| 5 | Compliance | Compliance de Anúncios 2 | `3754b591-b3f5-4921-bc80-4bbbe5c1ccf6` | ddm-compliance-anuncios |
| 6 | Publicador Meta | Publicador Meta | `52b3283c-db52-492a-8f39-f9e972eed727` | ddm-publicador-meta |
| 7 | Resultados DDMP | Resultados DDMP | `5a084b5b-eab3-4dac-b8c6-881cc46a1ef8` | ddm-resultados-ddmp |
| 8 | Análise de campanhas | Dados de Campanhas 2 | `08e580ad-297e-4053-9c1c-f1a023fb3f2a` | ddm-dados-campanhas |

Os nomes de skill não mudaram (para não quebrar o Paperclip); só o conteúdo. Em 22/10: as 9 skills estão em `3e435e7` no Paperclip e os 2 agentes novos foram criados. **Depois de cada push que mude skill:** Skills → a skill → **Check for updates → Install update**.
**AGENTS.md (22/10):** os 9 foram reescritos — modelo sempre ligado, "a skill prevalece", regras fixas (PAUSED, sem chaves, sem dado de aluno) + o Execution Contract do Paperclip. As versões antigas ficam no histórico de revisões de cada agente no Paperclip. O AGENTS.md pesa mais que a skill: se mudar regra, mude os dois.

## 4. Estado em 22/10/2026
**Pronto (testado com dados falsos):** as 9 skills reescritas; `audiencia_sync.py` (dry-run, mock, trava de 30%, entraram/saíram, recusa sem base legal); `resultados_ddmp.py` (exports Meta + DDMP → custo por visita/acordo e sugestão); `utm.py`; `meta_publicar.py` no modo do dia (mock: 2 anúncios novos + 1 pausa); painel novo com tema claro/escuro.
**Falta de outras pessoas:** acesso ao Meta + ids (Gustavo) · export diário do CRM e export do DDMP por UTM (Jair/TI) · verba (Gustavo) · base legal do público registrada (Gustavo/jurídico) · login do cPanel/Dev Hub (Gisele/Arthur).
**Ainda do modelo antigo, não validado:** Designer gerando imagens reais dentro do Paperclip (re-teste pendente, só com OK do Gui).

## 5. Próximos passos (em ordem)
1. ~~Paperclip: skills, agentes novos, AGENTS.md~~ (feito em 22/10).
2. Rotina diária do Orquestrador no Paperclip (~08:00 Brasília) — só depois que houver dado real; até lá, rodar à mão.
3. Com o Jair: formato do export do CRM (quem está em aberto, por cliente) e do DDMP (contagens por data/cliente/campanha/criativo). Ajustar `resultados_ddmp.py` se os nomes de coluna forem outros.
4. Com o Gustavo: acesso ao Meta, ids do público e do conjunto de cada cliente, base legal, verba. Primeiro `audiencia_sync.py` em dry-run com a base real; depois `--executar`.
5. Re-teste do Designer (imagens reais) num pedido "tema novo" pequeno (2 criativos).

## 6. Como publicar mudanças
1. Editar no repo → `git add -A && git commit -m "..." && git push` (o Mac já guarda o token no Keychain).
2. **Servidor:** o site não atualiza sozinho. Um humano logado no cPanel (`https://devhub.grupoddm.ia.br:2083/`) roda "Git Version Control → agente-trafego (site) → Atualizar do remoto" (repositório `/home/grpia/apps/agente-trafego`, branch `main`). Peça ao Gui. A sessão do cPanel expira rápido.
3. **Paperclip:** Check for updates nas skills alteradas (seção 3).

## 7. Regras que não se negociam
- **Nunca** ler, imprimir, colar ou commitar chaves/tokens. Os scripts leem `~/.hermes/.env` sozinhos. Credenciais e logins são sempre do Gui.
- Nada ativo no Meta: só `PAUSED`; ativação é humana no Ads Manager.
- Base de alunos (CRM) e exports do DDMP **nunca** entram no repositório, em issue ou em log: só contagens. O público só vai ao Meta em hash SHA-256 e só com `publico.base_legal` registrado. Lista de linguagem no SKILL.md do Compliance (versão 20/10).
- Ids reais do Meta (conta, público, conjunto, anúncio) ficam no `~/.hermes/.env` ou em arquivos locais ignorados pelo git — o repo é público.
- Imagem falsa é pior que nenhuma: se a ferramenta falhar, diga que falhou.
- Ao testar, mantenha campanhas pequenas (custo de Claude + Gemini).

## 8. Armadilhas conhecidas
- Agentes Hermes rodam com diretório de trabalho do Paperclip (`~/.paperclip/instances/default/workspaces/<agent-id>`), **não** no repo → as skills mandam fazer `cd ~/Downloads/Agente-Trafego-main` antes de rodar scripts.
- Paperclip + Hermes: o modelo tem de ser **`claude-sonnet-4-6` explícito** (o padrão "auto" dá 404); "Run test" falha com OAuth — pode pular.
- Todo agente novo precisa de **Reports to = Orquestrador Hermes** (agente sem chefe válido tem as runs canceladas).
- O Orquestrador às vezes se desatribui do issue principal e a cadeia trava → reatribuir o issue a ele e mandar uma mensagem.
- `AGENTS.md` antigo pode sobrepor a skill nova (aconteceu com o Compliance).
- O botão "Install update" às vezes só responde a clique direto.
- Sessão do cPanel cai se a aba navega ou fica ociosa.

## 9. Histórico (commits principais)
c0ecc72 repo inicial · 5806f89/30d4a2c/b9dea42 painel v1 · a9b7b24 agente Dados + Resultados · 1d068e6 painel estilo CRM · 33860b4 editor de skills no painel · 32332f2 Publicador Meta + etapas · c59719a scripts Jev/Gemini/teste de chaves · 14601c1 Designer com Gemini + Compliance com Jev · 66f829d Designer sem imagens falsas · 05b21c8 este HANDOFF · d57d251 WORKLOG takeover · (22/10) modelo sempre ligado + tema claro/escuro.

## 10. Log de trabalho (obrigatório)
Mantenha `WORKLOG.md` na raiz deste repo, igual ao do Call-sandwich-Retell: cabeçalho `## YYYY-MM-DD (Weekday) — Work log (~total)` e linhas `HH:MM–HH:MM (~duração) — o que foi feito (commit/issue)`, horário de Nova York, commit + push ao fim de cada sessão. A tarefa diária do Dev Hub vai usar esse arquivo como fonte.
