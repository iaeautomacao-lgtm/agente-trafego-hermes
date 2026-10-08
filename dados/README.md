# `dados/` — fonte de dados do painel

O painel (`index.html`) lê **`dados/campanhas.json`** ao carregar. Quem edita este arquivo é o agente **Dados de Campanhas** (`skills/trafego-pago/ddm-dados-campanhas`), depois de analisar um export do Meta Ads. Commit + push + "Atualizar do remoto" no cPanel e os gráficos mudam sozinhos.

## `campanhas.json`

```
{
  "versao": 1,
  "atualizado_em": "AAAA-MM-DD",
  "atualizado_por": "quem/qual agente",
  "benchmarks": { "ctr_pct": [0.8, 1.5], "cpl_brl": [25, 70], "conversao_pct": [10, 25], "frequencia_max": 3.0 },
  "campanhas": [ <campanha>, ... ]        // mais recente primeiro
}
```

### `<campanha>` — escrita pelo Orquestrador quando a campanha é montada (passo 5 da skill)

| campo | tipo | exemplo |
|---|---|---|
| `id` | string única | `"2026-10-matricula-trancada"` |
| `nome`, `data`, `via`, `objetivo`, `publico`, `orcamento`, `periodo`, `tempo` | string | — |
| `score` | número 0–100 (compliance da campanha) | `18` |
| `veredito`, `status` | string | `"aprovado com ressalvas"` |
| `arquivo` | caminho do relatório completo | `"exemplos/….md"` |
| `criativos[]` | `{ id, conj, hl, fmt, score, v }` — `v` ∈ aprovado / com ressalvas / reprovado | — |
| `etapa` | `montada` → `aprovada` → `publicada` → `analisada` (quem muda: Orquestrador / Orquestrador após o board / Publicador / Dados) | `"aprovada"` |
| `historico[]` | `{ etapa, em (ISO), por }` — uma linha por mudança de etapa | — |
| `publicacao` | escrito pelo Publicador: `{ meta_campaign_id, adset_ids[], ad_ids[], publicado_em, status: "PAUSED" }` | — |
| `resultados` | `null` até a campanha rodar; depois o bloco abaixo | — |

### `resultados` — escrito SOMENTE pelo agente Dados de Campanhas

```
{
  "simulado": false,                       // true só em exemplos; o painel mostra aviso
  "fonte": "Meta Ads Manager — export AAAA-MM-DD",
  "periodo": { "inicio": "AAAA-MM-DD", "fim": "AAAA-MM-DD" },
  "analisado_em": "AAAA-MM-DD",
  "analisado_por": "Dados de Campanhas (Hermes) — issue GRU-xx",
  "totais":   { "gasto", "impressoes", "alcance", "cliques", "leads", "conversoes" },
  "diario":   [ { "dia": "AAAA-MM-DD", "gasto", "impressoes", "cliques", "leads" }, ... ],
  "criativos":[ { "id", "conj", "gasto", "impressoes", "alcance", "cliques", "leads", "conversoes",
                  "status": "Escalar | Manter | Pausar | Reativar" }, ... ],
  "analise": {
    "resumo": "3–5 linhas",
    "funcionando": [ ... ], "nao_funcionando": [ ... ], "anomalias": [ ... ],
    "hipoteses": [ "Se testarmos X, esperamos Y, porque Z.", ... ],   // 3 a 5
    "recomendacao_orquestrador": "o que o próximo ciclo deve mudar e com que risco"
  }
}
```

Regras:
- Números crus, sem formatação (`2987.4`, não `"R$ 2.987,40"`). O painel calcula CTR, CPL, frequência e conversão.
- Campo que o export não trouxe → omitir (o painel mostra `—`). Nunca estimar.
- `id` dos criativos em `resultados.criativos` tem que bater com `criativos[].id` da campanha.
- Validar o JSON antes do commit: `python3 -m json.tool dados/campanhas.json > /dev/null`.

## `publicacoes/`

Um arquivo por campanha publicada (`<id>.json`), no formato de `publicacoes/exemplo-demo-2.json`: é o que `scripts/meta_publicar.py` lê para criar a campanha **em pausa** no Meta. Gerado pelo agente Publicador; os `*.resultado-*.json` guardam os ids criados.

## `exemplo-simulado.json`

Um bloco `resultados` inventado (`"simulado": true`) para validar os gráficos. O painel só o usa quando alguém clica em "Ver com dados simulados". Não copiar para `campanhas.json`.
