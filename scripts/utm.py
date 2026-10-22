#!/usr/bin/env python3
"""
utm.py — monta e confere o link de cada anúncio para o DDMP com os parâmetros de rastreio.

O sistema da DDM (Jair) lê estes parâmetros quando o aluno chega no DDMP e liga
a visita (e o acordo, quando acontece dentro do DDMP) ao criativo que trouxe a pessoa.

Uso:
  python3 scripts/utm.py montar --cliente inst-a --campanha natal --criativo 02
  python3 scripts/utm.py montar --cliente inst-a --campanha natal --criativo 02 --destino https://wa.me/55...
  python3 scripts/utm.py conferir "https://ddmp.com.br/?utm_source=meta&cliente=inst-a&campanha=natal&criativo=02"

Configuração em dados/campanhas.json → "utm" (destino padrão, nomes dos parâmetros, parâmetros fixos).
Valores sempre em minúsculas, sem acento, sem espaço (ex.: "black-friday", "02").
"""
import argparse, json, os, re, sys, unicodedata, urllib.parse

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PADRAO = {
    "destino": "https://ddmp.com.br/",
    "parametros": {"cliente": "cliente", "campanha": "campanha", "criativo": "criativo"},
    "fixos": {"utm_source": "meta", "utm_medium": "paid_social"},
}


def config():
    cfg = json.loads(json.dumps(PADRAO))
    try:
        with open(os.path.join(RAIZ, "dados", "campanhas.json"), encoding="utf-8") as f:
            u = json.load(f).get("utm") or {}
        cfg["destino"] = u.get("destino", cfg["destino"])
        cfg["parametros"].update(u.get("parametros") or {})
        cfg["fixos"] = u.get("fixos", cfg["fixos"])
    except (OSError, ValueError):
        pass
    return cfg


def slug(v):
    v = unicodedata.normalize("NFKD", str(v)).encode("ascii", "ignore").decode().lower().strip()
    v = re.sub(r"[^a-z0-9]+", "-", v).strip("-")
    if not v:
        raise ValueError("valor vazio depois de normalizar")
    return v


def montar(cliente, campanha, criativo, destino=None, cfg=None):
    cfg = cfg or config()
    destino = destino or cfg["destino"]
    p = cfg["parametros"]
    params = dict(cfg["fixos"])
    params[p["cliente"]] = slug(cliente)
    params[p["campanha"]] = slug(campanha)
    params[p["criativo"]] = slug(criativo)
    partes = urllib.parse.urlsplit(destino)
    q = urllib.parse.parse_qsl(partes.query, keep_blank_values=True)
    q = [(k, v) for k, v in q if k not in params] + list(params.items())
    return urllib.parse.urlunsplit(partes._replace(query=urllib.parse.urlencode(q)))


def conferir(link, cfg=None):
    """Devolve (ok, valores, problemas)."""
    cfg = cfg or config()
    q = dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(link).query))
    problemas, valores = [], {}
    for nome, chave in cfg["parametros"].items():
        v = q.get(chave)
        if not v:
            problemas.append(f"falta o parâmetro '{chave}'")
        elif v != slug(v):
            problemas.append(f"'{chave}={v}' fora do padrão (use '{slug(v)}')")
        valores[nome] = v
    for k, v in cfg["fixos"].items():
        if q.get(k) != v:
            problemas.append(f"'{k}' deveria ser '{v}'")
    if not urllib.parse.urlsplit(link).scheme.startswith("http"):
        problemas.append("link sem https://")
    return (not problemas), valores, problemas


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    m = sub.add_parser("montar")
    m.add_argument("--cliente", required=True)
    m.add_argument("--campanha", required=True)
    m.add_argument("--criativo", required=True)
    m.add_argument("--destino")
    c = sub.add_parser("conferir")
    c.add_argument("link")
    a = ap.parse_args()
    if a.cmd == "montar":
        print(montar(a.cliente, a.campanha, a.criativo, a.destino))
        return
    ok, valores, problemas = conferir(a.link)
    print(json.dumps({"ok": ok, "valores": valores, "problemas": problemas}, ensure_ascii=False, indent=2))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
