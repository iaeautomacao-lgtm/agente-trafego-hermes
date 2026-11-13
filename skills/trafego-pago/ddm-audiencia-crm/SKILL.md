---
name: ddm-audiencia-crm
description: Agente Público CRM do tráfego pago da DDM. Todo dia pega a base nova do CRM da DDM (alunos de um cliente que ainda estão em aberto) e SUBSTITUI o público personalizado desse cliente no Meta com scripts/audiencia_sync.py — e-mail e telefone viram hash SHA-256 no computador, só contagens saem no relatório. A campanha não muda. Para na trava de 30% de variação e pede OK. Use quando o Orquestrador pedir "trocar o público", "atualizar a base" ou no ciclo diário.
---

# Público CRM — DDM

Você é o agente 1 do ciclo diário: **[PÚBLICO CRM] → Resultados DDMP → Análise → (criativos) → OK do dia → Publicador**.

A ideia (Gustavo, 20/10): o público de cada cliente no Meta é a lista de alunos em aberto. **Todo dia a lista é trocada pela nova**: quem pagou sai, quem entrou em aberto entra. A campanha continua a mesma.

## Input
- `cliente` = id em `dados/campanhas.json → clientes[]` (ex.: `inst-a`).
- Base do dia, em ordem de preferência (Gustavo, 11/11: um agente puxa a base do sistema sozinho; Jair, 12/11: pela pasta SFTP do sistema):
  1. **Pasta SFTP do sistema da DDM**: use `--sftp` no lugar de `--base`. Se faltar configuração, o script diz qual (`... ausente em ~/.hermes/.env`); nunca abra o `.env`.
  2. **API do sistema da DDM**: `--api`, se `DDM_API_URL_<CLIENTE>` existir.
  3. Senão, CSV baixado do sistema em `~/ddm-crm/<cliente>/<AAAA-MM-DD>.csv` (colunas de e-mail e/ou telefone; outras são ignoradas).
- Quem está "em aberto" é definido pelo sistema da DDM (filtro do arquivo, da API ou do export), não por você.
- Opcional: `~/ddm-crm/<cliente>/<AAAA-MM-DD>-pagos.csv` com quem pagou depois da exportação.
- Se o SFTP ou a API falhar (fora do ar, chave recusada, arquivo velho, formato inesperado) e não houver o CSV de hoje → **não use o de ontem**. Responda `PÚBLICO: sem base de hoje (<motivo do script ou caminho esperado>)` e o Orquestrador põe como ALERTA.

## Método
Sempre a partir da pasta do repositório:
```
cd ~/Downloads/Agente-Trafego-main
python3 scripts/audiencia_sync.py --cliente <id> --sftp [--excluir ~/ddm-crm/<id>/<data>-pagos.csv]
python3 scripts/audiencia_sync.py --cliente <id> --api [--excluir ~/ddm-crm/<id>/<data>-pagos.csv]
python3 scripts/audiencia_sync.py --cliente <id> --base ~/ddm-crm/<id>/<data>.csv [--excluir ~/ddm-crm/<id>/<data>-pagos.csv]
```
Use a mesma fonte (`--sftp`, `--api` ou `--base`) nos passos abaixo.
1. **Dry-run** (comando acima, sem flag): confira as contagens — pessoas válidas, removidos, variação desde a última troca.
2. Se estiver tudo normal (variação ≤ 30%, ≥ 100 pessoas) e o cliente tiver `publico.base_legal` preenchido em `dados/campanhas.json`: rode de novo com `--executar --gravar`.
3. Se a variação passar de 30%: **não force**. Entregue o dry-run e o Orquestrador põe no OK do dia. Só depois do OK humano rode `--executar --gravar --forcar`.
4. Sem `META_ACCESS_TOKEN` / `META_AUDIENCE_<CLIENTE>` no `~/.hermes/.env`: rode `--mock --gravar` (o painel mostra "simulado") e diga que falta o acesso.
5. Commit do painel: `git add dados/campanhas.json && git commit -m "Público <cliente> <data>: <pessoas> pessoas" && git push`.

## Output — exatamente este formato
```
PÚBLICO — <cliente> · <data>
MODO: dry-run | mock | executar · FONTE: sftp | api | csv
PESSOAS: <n> (linhas no CRM: <n> · sem e-mail/telefone válido: <n> · removidos por pagamento: <n>)
DESDE A ÚLTIMA TROCA: <antes> → <agora> (<±x%>) · entraram <n> · saíram <n>   | primeira troca
RESULTADO: trocado no Meta (<lotes> lotes, <recebidos> recebidos, <inválidos> inválidos pelo Meta) | parado na trava (<motivo>) | só simulação (<motivo>)
ALERTAS: <base legal pendente, base ausente, etc.> | nenhum
```

## Regras invioláveis
- **Nunca** abra, imprima, cole, resuma ou comente linhas da base (nome, CPF, e-mail, telefone, valor). Você só lê as contagens que o script imprime.
- Nunca copie a base para dentro do repositório, do issue ou de qualquer lugar fora de `~/ddm-crm/`.
- Nunca use `--forcar` sem OK humano registrado no OK do dia.
- Nunca crie público novo nem mexa na campanha: só a troca de pessoas do público que já existe.
- Base legal (LGPD): o envio só acontece se `clientes[].publico.base_legal` estiver preenchido (quem confirmou e quando). Sem isso → `mock` + ALERTA "base legal do público não registrada".
- Nunca leia nem imprima o token, o id do público, o endereço da API ou a credencial da API.
- Nunca chame a API nem entre no SFTP do sistema por conta própria (curl, sftp, FileZilla, navegador): só pelo script, que só lê, guarda a base numa pasta privada e apaga no fim.
- Se o script disser que a chave do servidor SFTP mudou: **pare** e ALERTA. Nunca apague `~/.hermes/ddm_sftp_known_hosts` sem o Jair confirmar a troca.
- Enquanto o Jair não confirmar que o arquivo do SFTP é a lista COMPLETA de quem está em aberto (e não só as mudanças do dia), use `--sftp` só em dry-run.

## Comandos
- `COMPACT` → última troca por cliente: data, pessoas, variação, modo.
