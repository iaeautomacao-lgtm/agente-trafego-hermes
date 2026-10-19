# HANDOFF — Agente de Tráfego Pago (Meta Ads) · Grupo DDM

**Para:** o agente Claude no Cursor, que assume este projeto a partir de 19/10/2026.
**De:** Claude (Cowork), que construiu tudo até aqui junto com o João Guilherme (Gui).
**Leia este arquivo inteiro antes de mexer em qualquer coisa.** Depois mantenha o `WORKLOG.md` (formato no fim).

---

## 1. O que é
Um time de agentes de IA que monta campanhas de Meta Ads para a DDM (negociação de mensalidades com alunos/ex-alunos de faculdades). Público sensível: **nada pode constranger o aluno nem expor dívida** (LGPD + políticas Meta).

Cadeia: **Estrategista → Criativo → Designer → Compliance → [aprovação humana] → Publicador (sempre PAUSADO) → humano ativa no Ads Manager → Dados → próximo ciclo**, conduzida pelo **Orquestrador**.

Regra de ouro: **nada é publicado nem ativado sem um humano.** O Publicador só cria objetos com `status: PAUSED` (travado no código).

## 2. Onde está cada coisa
| O quê | Onde |
|---|---|
| Repo | `iaeautomacao-lgtm/agente-trafego-hermes` (público) · clone local no Mac: `~/Downloads/Agente-Trafego-main` |
| Skills dos agentes (fonte da verdade) | `skills/trafego-pago/ddm-*/SKILL.md` (7 skills) |
| Scripts | `scripts/meta_publicar.py` (publica PAUSADO; `--dry-run` padrão, `--mock`, `--executar`), `scripts/gerar_arte.py` (imagens Gemini, sem texto), `scripts/jev_risk_score.py` (score de risco Jev/TypeSafe 0–100), `scripts/testar_chaves.py` (testa as chaves sem mostrá-las), `scripts/_env.py` (lê `~/.hermes/.env`) |
| Dados do painel | `dados/campanhas.json` (campanhas, etapas montada→aprovada→publicada→analisada, `historico`, `resultados`), schema em `dados/README.md`; specs de publicação em `dados/publicacoes/` |
| Painel interno (CRM) | `index.html` (app de 1 arquivo, rotas por hash) → https://agente.trafego.grupoddm.ia.br |
| Paperclip (orquestração) | local no Mac: http://127.0.0.1:3100/GRU/ · empresa `01b7e083-3ae7-4f29-bdcd-f2ceca73d9b9` |
| Hermes (runtime dos agentes) | `~/.hermes/` no Mac; modelo `claude-sonnet-4-6` via OAuth Anthropic |
| Chaves | `~/.hermes/.env`: `GOOGLE_API_KEY` ✅, `TYPESAFE_API_KEY` ✅, `META_ACCESS_TOKEN` / `META_AD_ACCOUNT_ID` / `META_PAGE_ID` ❌ (faltam) |

## 3. Agentes no Paperclip (todos Hermes, claude-sonnet-4-6, reportam ao Orquestrador)
| Agente | ID | Skill |
|---|---|---|
| Orquestrador Hermes | `65238a5e-9057-41f4-b766-baee06e31f3a` | ddm-orquestrador-trafego |
| Estrategista de Tráfego 2 | `69acc6b1-15fb-4e8c-b022-5cb45bb33da1` | ddm-estrategista-trafego |
| Criativo de Anúncios 2 | `3bad73d5-d812-484b-aa1c-186ca22efc9f` | ddm-criativo-anuncios |
| Designer de Anúncios | `69f749f4-3853-47f5-8e75-ef31566d964b` | ddm-designer-anuncios |
| Compliance de Anúncios 2 | `3754b591-b3f5-4921-bc80-4bbbe5c1ccf6` | ddm-compliance-anuncios |
| Publicador Meta | `52b3283c-db52-492a-8f39-f9e972eed727` | ddm-publicador-meta |
| Dados de Campanhas 2 | `08e580ad-297e-4053-9c1c-f1a023fb3f2a` | ddm-dados-campanhas |

As skills vêm do GitHub. **Depois de cada push que muda uma skill:** Paperclip → Skills → a skill → **Check for updates → Install update** (senão o agente continua na versão antiga).
Cada agente também tem um `AGENTS.md` no Paperclip (Agent → Instructions). Atenção: o do Compliance tem um texto antigo + uma seção **"Atualização out/2026 — prevalece"** no fim; o do Designer tem a regra "só o script do repo". O AGENTS.md pesa mais que a skill — se mudar regra, confira os dois.

## 4. Estado em 19/10/2026
**Funcionando e validado**
- Cadeia completa com delegação correta, loop de correção (Compliance reprova → Criativo refaz, máx. 2) e parada na aprovação humana (demos GRU-3, GRU-8, GRU-17).
- Agente Dados: dry run com CSV simulado (`exemplos/export-meta-simulado-2026-10.csv`), números 100% corretos (GRU-7).
- Publicador: testado em `--mock` (22 chamadas) e `--dry-run`; recusa spec sem aprovação humana.
- Jev: funcionando no Compliance (ex.: GRU-21 → "JEV: 11 · maiores sinais: …"). Custo irrisório (~540 tokens por criativo).
- Gemini: chave na conta Google correta com faturamento e teto mensal; `testar_chaves.py` gerou imagem real em 5,4 s.
- Painel no ar com pipeline de etapas, editor de SKILL.md (salva direto no GitHub com token pessoal do usuário), resultados com gráficos.

**Não validado ainda**
- **Designer gerando imagens reais dentro do Paperclip.** No GRU-17 (09/10) ele *não* usou o Gemini: procurou uma chave com nome errado e desenhou mockups com PIL. Correção publicada em `66f829d` e instalada no Paperclip (skill + AGENTS.md: só `scripts/gerar_arte.py`, a partir da pasta do repo; proibido PIL/SVG/HTML/mockup; se falhar, escrever `IMAGENS: não geradas — <erro>`). **Falta um re-teste.**

**Tarefas abertas no Paperclip:** GRU-8 e GRU-17 (demos) em revisão aguardando o Gui; GRU-1 (onboarding) pode ser ignorado.

## 5. Próximos passos (em ordem)
1. **Re-teste curto do Designer** (1 conjunto, 2 criativos, feed + stories = 4 imagens). Critério: PNGs reais de ~1–2 MB em `artes/<id>/`, anexados ao issue, sem texto na imagem; Compliance com linha `JEV:` em cada criativo. Mostre as imagens ao Gui.
2. **Painel mostrar as artes** dos criativos (hoje só mostra textos/scores).
3. **Quando o Gustavo liberar o Meta Business Manager:** Gui coloca `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `META_PAGE_ID` no `~/.hermes/.env` → rodar `meta_publicar.py` em `--dry-run` numa campanha aprovada → só então `--executar` (tudo PAUSADO) → humano ativa.
4. Depois de 3+ dias rodando: export do Meta → agente Dados → `dados/campanhas.json` → painel.

## 6. Como publicar mudanças
1. Editar no repo → `git add -A && git commit -m "..." && git push` (o Mac já guarda o token no Keychain).
2. **Servidor:** o site não atualiza sozinho. Um humano logado no cPanel (`https://devhub.grupoddm.ia.br:2083/`) roda "Git Version Control → agente-trafego (site) → Atualizar do remoto" (repositório `/home/grpia/apps/agente-trafego`, branch `main`). Peça ao Gui. A sessão do cPanel expira rápido.
3. **Paperclip:** Check for updates nas skills alteradas (seção 3).

## 7. Regras que não se negociam
- **Nunca** ler, imprimir, colar ou commitar chaves/tokens. Os scripts leem `~/.hermes/.env` sozinhos. Credenciais e logins são sempre do Gui.
- Nada ativo no Meta: só `PAUSED`; ativação é humana no Ads Manager.
- Sem públicos personalizados/listas de alunos sem base legal (LGPD art. 11). Lista de palavras proibidas no SKILL.md do Compliance.
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
c0ecc72 repo inicial · 5806f89/30d4a2c/b9dea42 painel v1 · a9b7b24 agente Dados + Resultados · 1d068e6 painel estilo CRM · 33860b4 editor de skills no painel · 32332f2 Publicador Meta + etapas · c59719a scripts Jev/Gemini/teste de chaves · 14601c1 Designer com Gemini + Compliance com Jev · 66f829d Designer sem imagens falsas.

## 10. Log de trabalho (obrigatório)
Mantenha `WORKLOG.md` na raiz deste repo, igual ao do Call-sandwich-Retell: cabeçalho `## YYYY-MM-DD (Weekday) — Work log (~total)` e linhas `HH:MM–HH:MM (~duração) — o que foi feito (commit/issue)`, horário de Nova York, commit + push ao fim de cada sessão. A tarefa diária do Dev Hub vai usar esse arquivo como fonte.
