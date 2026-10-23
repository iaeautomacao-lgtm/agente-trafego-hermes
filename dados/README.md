# `dados/` — fonte de dados do painel (versão 2, modelo "sempre ligado")

O painel (`index.html`) lê **`dados/campanhas.json`** ao carregar. Commit + push + "Atualizar do remoto" no cPanel e o painel muda sozinho.

> **O repositório é público.** Aqui só entram contagens e textos de anúncio. **Nunca**: base de alunos (CSV do CRM), export do DDMP com dado pessoal, ids reais do Meta (conta, público, conjunto, anúncio), tokens. Bases e exports ficam em `~/ddm-crm/` no Mac; ids e tokens no `~/.hermes/.env`.

## `campanhas.json`

```
{
  "versao": 2,
  "modelo": "sempre-ligado",
  "atualizado_em": "AAAA-MM-DD", "atualizado_por": "quem/qual agente",
  "ok_diario": { "horario": "09:00", "fuso": "America/Sao_Paulo", "pendente": <ok> | null, "historico": [ { data, por, em, itens } ] },
  "verba": { "diaria_max_brl": 100, "total_max_brl": 3000, "aprovada_por", "em", "nota" },   // somando todas as campanhas; os scripts leem daqui
  "utm": { "destino": "https://ddmp.com.br/", "parametros": { "cliente": "cliente", "campanha": "campanha", "criativo": "criativo" },
           "fixos": { "utm_source": "meta", "utm_medium": "paid_social" } },
  "benchmarks": { "custo_visita_brl": [1.0, 2.5], "frequencia_max": 3.0, "gasto_minimo_para_decidir_brl": 50 },
  "clientes": [ <cliente>, ... ],
  "pilotos": [ ... ]          // campanhas do modelo antigo (briefing), só para histórico
}
```

### `<cliente>` — criado pelo Orquestrador (pedido "cliente novo")
| campo | quem escreve | exemplo |
|---|---|---|
| `id`, `nome`, `utm_cliente` | Orquestrador | `"inst-a"`, `"Instituição A"`, `"inst-a"` |
| `acordos_rastreados` | humano | `true` se o acordo é fechado dentro do DDMP; `false` se o cliente fecha no sistema dele (Cruzeiro) → a sugestão usa custo por visita |
| `publico` | **Público CRM** (`scripts/audiencia_sync.py --gravar`) | `{ nome, base_legal, ultima_sync, pessoas, linhas, entraram, sairam, removidos_pagos, invalidas_crm, modo, status, historico[] }` |
| `publico.base_legal` | humano (uma vez) | `"contrato DDM–cliente + LGPD art. 7º, X · confirmado por Gustavo em 2026-10-xx"` — sem isso o script não envia ao Meta |
| `campanhas[]` | Orquestrador | ver abaixo |

### `<campanha>` (uma por cliente, sempre ligada)
| campo | quem escreve | exemplo |
|---|---|---|
| `id`, `nome`, `utm_campanha`, `tema`, `proximo_tema`, `destino`, `orcamento_diario_brl`, `inicio`, `status` (`montando`/`ligada`/`pausada`) | Orquestrador | `"inst-a-sempre"`, `"Sempre ligada"`, `"natal"`, `"Natal"` |
| `criativos[]` | Orquestrador (Copy + Compliance) · status pelo Publicador/Análise | `{ id: "07", titulo, copy, cta, link, imagem, compliance: { score, v, nota }, jev, status }` |
| `criativos[].status` | `aguardando OK` (Orquestrador) → `em pausa` (Publicador) → `ligado` (Análise, quando vê gasto) → `pausado` (Publicador) | — |
| `resultados` | **Resultados DDMP** (`scripts/resultados_ddmp.py --gravar`) + **Análise** (`analise`, ajustes em `sugestao`) | ver abaixo |

### `resultados`
```
{
  "simulado": false,
  "fonte": "Meta Ads export + DDMP export",
  "periodo": { "inicio": "AAAA-MM-DD", "fim": "AAAA-MM-DD" },
  "medido_em": "AAAA-MM-DD",
  "base_comparacao": "custo_acordo" | "custo_visita", "mediana": 79.41,
  "totais":   { gasto, impressoes, alcance, cliques, visitas_ddmp, acordos, valor_acordos?, custo_visita, custo_acordo },
  "criativos":[ { id, gasto, impressoes, alcance, cliques, visitas_ddmp, acordos, custo_visita, custo_acordo, sugestao, motivo } ],
  "diario":   [ { dia, gasto, visitas_ddmp, acordos } ],
  "analise":  { resumo, funcionando[], nao_funcionando[], recomendacao }      // agente Análise
}
```
- Números crus (`2987.4`), nunca `"R$ 2.987,40"`. Campo que o export não trouxe → omitir.
- `criativos[].id` em `resultados` = `criativos[].id` da campanha = valor de `criativo=` no link = começo do nome do anúncio no Meta (`"07 — Black Friday…"`).
- Validar antes do commit: `python3 -m json.tool dados/campanhas.json > /dev/null`.

### `ok_diario.pendente` — escrito pelo Orquestrador
`{ data, issue, itens: [ { tipo: publico|criativos|pausar|escalar|alerta, texto, status: feito|aguardando|info } ] }`. Depois do OK vai para `historico`.

## `publicacoes/`
- `exemplo-ciclo-diario.json` — formato do dia a dia (`adicionar` anúncios num conjunto existente + `pausar`), lido por `scripts/meta_publicar.py`. Os specs reais do dia (`<cliente>-AAAA-MM-DD.json`) e os `*.resultado-*.json` **não vão para o git**.
- `exemplo-demo-2.json` — formato antigo (campanha nova inteira, em pausa).

## `exemplo-simulado.json`
Um `campanhas.json` inteiro inventado (`"simulado": true`), na ordem de grandeza da campanha mostrada na reunião de 20/10 (R$ 3.888 → 2.291 visitas). O painel só usa quando alguém clica em "Ver com dados simulados" (ou abre `index.html?sim=1`). Não copiar para `campanhas.json`.
