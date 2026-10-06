# Agentes de Tráfego Pago DDM

Sistema autônomo de agentes de IA para gestão de campanhas Meta Ads.

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                         DASHBOARD                                │
│                            │                                     │
│                            ▼                                     │
│                    ┌───────────────┐                            │
│                    │ ORQUESTRADOR  │                            │
│                    │    (skill)    │                            │
│                    └───────┬───────┘                            │
│                            │                                     │
│     ┌──────────────────────┼──────────────────────┐             │
│     │                      │                      │             │
│     ▼                      ▼                      ▼             │
│ ┌────────┐           ┌────────┐            ┌────────┐          │
│ │  EST.  │──────────▶│ CRIAT. │───────────▶│ COMPL. │          │
│ │ skill 1│   plano   │ skill 2│  criativos │ skill 3│          │
│ └────────┘           └────────┘            └────────┘          │
│                                                  │               │
│                                            aprovados             │
│                                                  ▼               │
│                                         [APROVAÇÃO HUMANA]       │
│                                                  │               │
│                                                  ▼               │
│                                           ┌────────┐            │
│                      hipóteses ◀──────────│ DADOS  │            │
│                      próx. ciclo          │ skill 4│            │
│                                           └────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Agentes

| # | Nome | Função | Input | Output |
|---|------|--------|-------|--------|
| 1 | **Estrategista** | Planejamento de campanha | Briefing | Plano estruturado |
| 2 | **Criativo** | Produção de copies | Plano | Pack de criativos |
| 3 | **Compliance** | Revisão legal/ética | Criativos | Parecer aprovação |
| 4 | **Dados** | Análise de métricas | Relatório Meta | Hipóteses próx. ciclo |

## Skills Hermes

```
C:\Users\gisele.oliveira\AppData\Local\hermes\skills\trafego-pago\
├── ddm-estrategista-trafego\SKILL.md
├── ddm-criativo-anuncios\SKILL.md
├── ddm-compliance-anuncios\SKILL.md
├── ddm-dados-campanhas\SKILL.md
└── ddm-orquestrador-trafego\SKILL.md
```

## Como Usar

### Via CLI Hermes
```bash
# Carregar skill e executar
hermes --skill ddm-orquestrador-trafego "INICIAR: campanha para re-engajamento de alunos"
```

### Via Dashboard
O dashboard envia comandos para o Hermes e exibe o status de cada agente.

## Documentação por Agente

- [01-estrategista.txt](./01-estrategista.txt)
- [02-criativo.txt](./02-criativo.txt)
- [03-compliance.txt](./03-compliance.txt)
- [04-dados.txt](./04-dados.txt)

## Arquivos de Configuração

- [fluxo-agentes.txt](./fluxo-agentes.txt) - Fluxo detalhado entre agentes
- [palavras-proibidas.txt](./palavras-proibidas.txt) - Lista de termos proibidos

---
*Setor de Tráfego Pago DDM | Versão 1.0*
