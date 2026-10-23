#!/usr/bin/env python3
"""
audiencia_sync.py — troca, todo dia, o público personalizado de um cliente no Meta
pela base nova do CRM da DDM (só quem ainda está em aberto).

A campanha não muda: só a lista de pessoas do público. Quem pagou sai da base do CRM
e, portanto, sai do público na troca seguinte.

Uso:
  python3 scripts/audiencia_sync.py --cliente inst-a --base ~/ddm-crm/inst-a/2026-10-22.csv              # dry-run (padrão)
  python3 scripts/audiencia_sync.py --cliente inst-a --base <csv> --excluir <pagos.csv>                    # tira quem pagou hoje
  python3 scripts/audiencia_sync.py --cliente inst-a --base <csv> --mock --gravar                          # simula + atualiza o painel
  python3 scripts/audiencia_sync.py --cliente inst-a --base <csv> --executar --gravar                      # troca de verdade no Meta

Base: CSV (vírgula ou ponto e vírgula) exportado do CRM. Colunas reconhecidas pelo nome:
  e-mail: email, e-mail, mail      telefone: telefone, celular, fone, phone, whatsapp, tel (pode ter várias)
Outras colunas (nome, CPF, valor...) são IGNORADAS e nunca saem do computador.

Privacidade (LGPD):
  - E-mail e telefone são normalizados e transformados em hash SHA-256 aqui; o Meta só recebe hashes.
  - O script nunca imprime, loga ou grava dado pessoal nem hash no repositório. Só contagens.
  - A base fica fora do repositório (ex.: ~/ddm-crm/). O estado de ontem (hashes) fica em ~/.hermes/audiencias/.

Variáveis (só para --executar), em ~/.hermes/.env:
  META_ACCESS_TOKEN               token com ads_management
  META_AUDIENCE_<CLIENTE>         id do público personalizado do cliente (ex.: META_AUDIENCE_INST_A)
  META_API_VERSION                opcional, padrão em scripts/_env.py (v26.0)

Travas:
  - --executar só roda se dados/campanhas.json → clientes[<cliente>].publico.base_legal estiver preenchido (LGPD).
  - Menos de 100 pessoas válidas → aborta (base provavelmente quebrada).
  - Tamanho mudou mais de 30% em relação à última troca → aborta, a não ser com --forcar
    (o agente só usa --forcar depois do OK humano do dia).
"""
import argparse, csv, hashlib, io, json, os, random, re, sys, time, urllib.error, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import carregar_env, meta_versao  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ESTADO_DIR = os.path.expanduser("~/.hermes/audiencias")
LOTE = 10000
MIN_PESSOAS = 100
VARIACAO_MAX = 0.30
COLS_EMAIL = {"email", "e-mail", "e_mail", "mail"}
COLS_FONE = {"telefone", "telefone1", "telefone2", "telefone3", "celular", "celular1", "celular2", "fone", "phone",
             "whatsapp", "tel", "telefone_celular", "fone1", "fone2"}
RE_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[a-z]{2,}$")


def die(msg, code=2):
    print("ERRO: " + msg, file=sys.stderr)
    sys.exit(code)


def h(v):
    return hashlib.sha256(v.encode("utf-8")).hexdigest()


def norm_email(v):
    v = (v or "").strip().lower()
    return v if RE_EMAIL.match(v) else None


def norm_fone(v):
    d = re.sub(r"\D", "", v or "").lstrip("0")
    if len(d) in (10, 11):
        d = "55" + d
    if d.startswith("55") and len(d) in (12, 13):
        return d
    return None


def ler_csv(caminho):
    caminho = os.path.expanduser(caminho)
    if not os.path.exists(caminho):
        die(f"arquivo não encontrado: {caminho}")
    with open(caminho, encoding="utf-8-sig", errors="replace") as f:
        texto = f.read()
    amostra = texto[:4096]
    sep = ";" if amostra.count(";") > amostra.count(",") else ","
    leitor = csv.DictReader(io.StringIO(texto), delimiter=sep)
    cab = [c.strip().lower() for c in (leitor.fieldnames or [])]
    c_email = [c for c in cab if c in COLS_EMAIL]
    c_fone = [c for c in cab if c in COLS_FONE or c.startswith("telefone") or c.startswith("celular")]
    if not c_email and not c_fone:
        die(f"nenhuma coluna de e-mail ou telefone reconhecida em {os.path.basename(caminho)} (colunas: {', '.join(cab)})")
    linhas = []
    for bruto in leitor:
        r = {(k or "").strip().lower(): (v or "") for k, v in bruto.items()}
        linhas.append(r)
    return linhas, c_email, c_fone


def pessoas(caminho):
    """Lista de (email_hash|'', [fone_hash...]) por linha válida + contagens."""
    linhas, c_email, c_fone = ler_csv(caminho)
    saida, invalidas = [], 0
    for r in linhas:
        e = next((norm_email(r[c]) for c in c_email if norm_email(r.get(c))), None)
        fs = []
        for c in c_fone:
            for parte in re.split(r"[/|,]", r.get(c, "")):
                f = norm_fone(parte)
                if f and f not in fs:
                    fs.append(f)
        if not e and not fs:
            invalidas += 1
            continue
        saida.append((h(e) if e else "", [h(f) for f in fs]))
    return saida, invalidas, len(linhas)


def chaves(p):
    s = set()
    for e, fs in p:
        if e:
            s.add("e:" + e)
        s.update("f:" + f for f in fs)
    return s


def montar_linhas(base, excluir):
    """Remove quem está em `excluir` (qualquer chave em comum) e desduplica. Devolve linhas [EMAIL, PHONE]."""
    fora = chaves(excluir)
    vistos, linhas, removidos, pessoas_ok, canon = set(), [], 0, 0, set()
    for e, fs in base:
        ks = ({"e:" + e} if e else set()) | {"f:" + f for f in fs}
        if ks & fora:
            removidos += 1
            continue
        if ks & vistos:
            continue
        vistos |= ks
        pessoas_ok += 1
        canon.add(("e:" + e) if e else ("f:" + fs[0]))
        if not fs:
            linhas.append([e, ""])
        else:
            linhas.append([e, fs[0]])
            linhas.extend(["", f] for f in fs[1:])
    return linhas, pessoas_ok, removidos, canon


def estado_path(cliente):
    return os.path.join(ESTADO_DIR, f"{cliente}.json")


def ler_estado(cliente):
    try:
        with open(estado_path(cliente), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def gravar_estado(cliente, ks, pessoas_ok):
    os.makedirs(ESTADO_DIR, mode=0o700, exist_ok=True)
    with open(estado_path(cliente), "w", encoding="utf-8") as f:
        json.dump({"em": time.strftime("%Y-%m-%dT%H:%M:%S"), "pessoas": pessoas_ok, "chaves": sorted(ks)}, f)
    os.chmod(estado_path(cliente), 0o600)


def enviar(cliente, linhas, modo):
    if modo == "dry-run":
        n = (len(linhas) + LOTE - 1) // LOTE
        print(f"[dry-run] POST /<META_AUDIENCE_{cliente.upper().replace('-', '_')}>/usersreplace · {n} lote(s) de até {LOTE} · schema [EMAIL, PHONE] (SHA-256)")
        return {"lotes": n, "recebidos": len(linhas), "invalidos_meta": None}
    if modo == "mock":
        n = (len(linhas) + LOTE - 1) // LOTE
        print(f"[mock] usersreplace · {n} lote(s) · {len(linhas)} linhas")
        return {"lotes": n, "recebidos": len(linhas), "invalidos_meta": 0}
    carregar_env()
    token = os.environ.get("META_ACCESS_TOKEN") or die("META_ACCESS_TOKEN ausente")
    var = "META_AUDIENCE_" + cliente.upper().replace("-", "_")
    aud = os.environ.get(var) or die(f"{var} ausente em ~/.hermes/.env")
    versao = meta_versao()
    url = f"https://graph.facebook.com/{versao}/{aud}/usersreplace"
    sessao = int(time.time() * 1000) * 1000 + random.randint(0, 999)
    lotes = [linhas[i:i + LOTE] for i in range(0, len(linhas), LOTE)] or [[]]
    recebidos, invalidos = 0, 0
    for i, lote in enumerate(lotes, 1):
        corpo = {
            "access_token": token,
            "session": json.dumps({"session_id": sessao, "batch_seq": i, "last_batch_flag": i == len(lotes),
                                   "estimated_num_total": len(linhas)}),
            "payload": json.dumps({"schema": ["EMAIL", "PHONE"], "data": lote}),
        }
        req = urllib.request.Request(url, data=urllib.parse.urlencode(corpo).encode(), method="POST")
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                j = json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            die(f"Meta API {e.code} no lote {i}/{len(lotes)}: {e.read().decode()[:400]}")
        recebidos += int(j.get("num_received", 0))
        invalidos += int(j.get("num_invalid_entries", 0))
        print(f"lote {i}/{len(lotes)} enviado")
    return {"lotes": len(lotes), "recebidos": recebidos, "invalidos_meta": invalidos}


def gravar_painel(cliente, resumo):
    caminho = os.path.join(RAIZ, "dados", "campanhas.json")
    with open(caminho, encoding="utf-8") as f:
        d = json.load(f)
    cli = next((c for c in d.get("clientes", []) if c.get("id") == cliente), None)
    if not cli:
        die(f"cliente '{cliente}' não existe em dados/campanhas.json → clientes")
    p = cli.setdefault("publico", {})
    p.update({k: resumo[k] for k in ("ultima_sync", "pessoas", "linhas", "entraram", "sairam", "removidos_pagos",
                                     "invalidas_crm", "modo")})
    p["status"] = "sincronizado" if resumo["modo"] == "executar" else ("simulado" if resumo["modo"] == "mock" else "dry-run")
    hist = p.setdefault("historico", [])
    hist.append({"data": resumo["ultima_sync"][:10], "pessoas": resumo["pessoas"], "entraram": resumo["entraram"],
                 "sairam": resumo["sairam"], "modo": resumo["modo"]})
    p["historico"] = hist[-30:]
    d["atualizado_em"] = time.strftime("%Y-%m-%d")
    d["atualizado_por"] = f"Público CRM · {cliente}"
    tmp = caminho + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, caminho)
    print(f"painel: dados/campanhas.json → clientes[{cliente}].publico atualizado")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cliente", required=True, help="id do cliente em dados/campanhas.json (ex.: inst-a)")
    ap.add_argument("--base", required=True, help="CSV do CRM com quem está em aberto hoje")
    ap.add_argument("--excluir", help="CSV com quem pagou/fechou acordo desde a exportação (opcional)")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--dry-run", action="store_true")
    g.add_argument("--mock", action="store_true")
    g.add_argument("--executar", action="store_true")
    ap.add_argument("--forcar", action="store_true", help="aceita variação > 30%% (só depois do OK humano)")
    ap.add_argument("--gravar", action="store_true", help="atualiza o card do público no painel (dados/campanhas.json)")
    a = ap.parse_args()
    modo = "executar" if a.executar else ("mock" if a.mock else "dry-run")

    base, invalidas, total = pessoas(a.base)
    excl = pessoas(a.excluir)[0] if a.excluir else []
    linhas, pessoas_ok, removidos, ks = montar_linhas(base, excl)

    anterior = ler_estado(a.cliente)
    if anterior:
        ant = set(anterior.get("chaves", []))
        entraram = len(ks - ant)
        sairam = len(ant - ks)
        variacao = (pessoas_ok - anterior.get("pessoas", 0)) / max(anterior.get("pessoas", 1), 1)
    else:
        entraram, sairam, variacao = None, None, 0.0

    print(f"Modo: {modo} · cliente: {a.cliente} · linhas no CRM: {total} · pessoas válidas: {pessoas_ok} · "
          f"sem e-mail/telefone válido: {invalidas} · removidos (pagos): {removidos} · linhas para o Meta: {len(linhas)}")
    if anterior:
        print(f"Desde a última troca ({anterior.get('em', '?')}): {anterior.get('pessoas')} → {pessoas_ok} pessoas "
              f"({variacao:+.0%}) · entraram: {entraram} · saíram: {sairam}")
    else:
        print("Primeira troca deste cliente neste computador (sem comparação com ontem).")

    if pessoas_ok < MIN_PESSOAS:
        die(f"só {pessoas_ok} pessoas válidas (mínimo {MIN_PESSOAS}) — base provavelmente quebrada; nada enviado")
    if anterior and abs(variacao) > VARIACAO_MAX and not a.forcar and modo == "executar":
        die(f"o público mudou {variacao:+.0%} desde a última troca (limite {VARIACAO_MAX:.0%}). "
            "Confira a base e, se estiver certa, rode de novo com --forcar depois do OK humano.")

    if modo == "executar":
        try:
            with open(os.path.join(RAIZ, "dados", "campanhas.json"), encoding="utf-8") as f:
                cli = next((c for c in json.load(f).get("clientes", []) if c.get("id") == a.cliente), {})
        except (OSError, ValueError):
            cli = {}
        if not (cli.get("publico") or {}).get("base_legal"):
            die("base legal do público não registrada (clientes[].publico.base_legal em dados/campanhas.json) — nada enviado")
    r = enviar(a.cliente, linhas, modo)
    resumo = {
        "cliente": a.cliente, "modo": modo, "ultima_sync": time.strftime("%Y-%m-%dT%H:%M"),
        "linhas_crm": total, "invalidas_crm": invalidas, "pessoas": pessoas_ok, "linhas": len(linhas),
        "removidos_pagos": removidos, "entraram": entraram, "sairam": sairam,
        "variacao_pct": round(variacao * 100, 1) if anterior else None, **r,
    }
    if modo == "executar":
        gravar_estado(a.cliente, ks, pessoas_ok)
    if a.gravar:
        gravar_painel(a.cliente, resumo)
    print("RESUMO " + json.dumps(resumo, ensure_ascii=False))
    if modo == "executar":
        print("OK — público trocado no Meta. A campanha não foi alterada.")


if __name__ == "__main__":
    main()
