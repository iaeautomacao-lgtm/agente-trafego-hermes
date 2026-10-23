#!/usr/bin/env python3
"""
resultados_ddmp.py — junta o que o Meta gastou com o que aconteceu no DDMP, por criativo.

  Meta (export do Ads Manager)  → gasto, impressões, alcance, cliques por anúncio
  DDMP (export do sistema DDM)  → visitas e acordos por cliente / campanha / criativo (parâmetros do link)
  Saída                         → custo por visita, custo por acordo e uma sugestão (Escalar/Manter/Pausar) por criativo

Uso:
  python3 scripts/resultados_ddmp.py --cliente inst-a --campanha inst-a-sempre --ddmp ddmp.csv --meta meta.csv
  python3 scripts/resultados_ddmp.py ... --gravar        # grava em dados/campanhas.json (o painel desenha)

Export do DDMP — um dos dois formatos (nomes de coluna sem diferenciar maiúsculas):
  a) um evento por linha:   data, cliente, campanha, criativo, evento        (evento = visita | acordo)
                            [valor]  (valor do acordo, opcional)
  b) já somado:             data, cliente, campanha, criativo, visitas, acordos [, valor_acordos]
  Também aceita utm_cliente / utm_campaign / utm_content como nomes de coluna.
  NUNCA inclua nome, CPF, telefone ou e-mail no export — só contagens. O script recusa colunas assim.

Export do Meta — CSV do Ads Manager no nível "Anúncio" (pt-BR ou inglês), com colunas como:
  Nome do anúncio | Ad name · Valor usado (BRL) | Amount spent (BRL) · Impressões | Impressions ·
  Alcance | Reach · Cliques no link | Link clicks · [Dia | Day]
  O criativo é lido do começo do nome do anúncio ("02 — Resolva…" → 02, como o Publicador nomeia;
  "Criativo 06" → 06, como o Gustavo nomeia no Ads Manager).

Acordos: só contam para a sugestão quando o cliente fecha acordo DENTRO do DDMP
(clientes[].acordos_rastreados = true). Ex.: Cruzeiro fecha no sistema dela → acordos parciais → base = custo por visita.
Verba: compara o gasto do período com dados/campanhas.json → verba.total_max_brl e avisa a partir de 80%.

Sem o export do Meta, sai só visitas/acordos (sem custos). Sem o do DDMP, sai só o lado do Meta.
Nada é estimado: campo ausente fica fora do JSON.
"""
import argparse, csv, io, json, os, re, statistics, sys, time, unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROIBIDAS = {"nome", "cpf", "telefone", "celular", "email", "e-mail", "whatsapp", "rg", "endereco", "endereço"}


def die(msg, code=2):
    print("ERRO: " + msg, file=sys.stderr)
    sys.exit(code)


def slug(v):
    v = unicodedata.normalize("NFKD", str(v or "")).encode("ascii", "ignore").decode().lower().strip()
    return re.sub(r"[^a-z0-9]+", "-", v).strip("-")


def num(v):
    v = str(v or "").strip().replace("R$", "").replace(" ", "")
    if not v or v in {"-", "—"}:
        return 0.0
    if "," in v and "." in v:
        v = v.replace(".", "").replace(",", ".") if v.rfind(",") > v.rfind(".") else v.replace(",", "")
    elif "," in v:
        v = v.replace(",", ".")
    try:
        return float(v)
    except ValueError:
        return 0.0


def ler(caminho):
    caminho = os.path.expanduser(caminho)
    if not os.path.exists(caminho):
        die(f"arquivo não encontrado: {caminho}")
    with open(caminho, encoding="utf-8-sig", errors="replace") as f:
        t = f.read()
    sep = ";" if t[:4096].count(";") > t[:4096].count(",") else ","
    rd = csv.DictReader(io.StringIO(t), delimiter=sep)
    return [{(k or "").strip().lower(): (v or "").strip() for k, v in r.items()} for r in rd]


def col(r, *nomes):
    for n in nomes:
        if n in r:
            return r[n]
    return ""


def dia_iso(v):
    v = (v or "").strip()[:10]
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", v)
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else v


def criativo_id(v):
    v = re.sub(r"^(criativo|anuncio|ad)-", "", slug(v))
    m = re.match(r"^(\d{1,3})(?:-|$)", v)
    if m:
        return m.group(1).zfill(2)
    m = re.match(r"^(\d-[a-z])(?:-|$)", v)
    return m.group(1).upper() if m else v


def ddmp(caminho, cliente_utm, campanha_utm):
    linhas = ler(caminho)
    if linhas:
        perigosas = PROIBIDAS & set(linhas[0].keys())
        if perigosas:
            die(f"o export do DDMP tem colunas com dado pessoal ({', '.join(sorted(perigosas))}). "
                "Peça um export só com contagens por cliente/campanha/criativo.")
    por, diario = {}, {}
    for r in linhas:
        if slug(col(r, "cliente", "utm_cliente")) != cliente_utm:
            continue
        if campanha_utm and slug(col(r, "campanha", "utm_campaign", "utm_campanha")) != campanha_utm:
            continue
        cid = criativo_id(col(r, "criativo", "utm_content", "utm_criativo"))
        if not cid:
            continue
        x = por.setdefault(cid, {"visitas_ddmp": 0, "acordos": 0, "valor_acordos": 0.0})
        d = diario.setdefault(dia_iso(col(r, "data", "dia", "date")), {"visitas_ddmp": 0, "acordos": 0})
        if "evento" in r or "tipo" in r:
            ev = slug(col(r, "evento", "tipo"))
            if ev.startswith("visit") or ev in {"acesso", "sessao"}:
                x["visitas_ddmp"] += 1; d["visitas_ddmp"] += 1
            elif ev.startswith("acordo"):
                x["acordos"] += 1; d["acordos"] += 1
                x["valor_acordos"] += num(col(r, "valor", "valor_acordo"))
        else:
            v, a = int(num(col(r, "visitas", "acessos"))), int(num(col(r, "acordos")))
            x["visitas_ddmp"] += v; d["visitas_ddmp"] += v
            x["acordos"] += a; d["acordos"] += a
            x["valor_acordos"] += num(col(r, "valor_acordos", "valor"))
    return por, diario


def meta(caminho):
    por, diario = {}, {}
    for r in ler(caminho):
        nome = col(r, "nome do anúncio", "nome do anuncio", "ad name")
        if not nome:
            continue
        cid = criativo_id(nome.split("—")[0].split(" - ")[0])
        x = por.setdefault(cid, {"gasto": 0.0, "impressoes": 0, "alcance": 0, "cliques": 0, "nome_meta": nome})
        g = num(col(r, "valor usado (brl)", "valor gasto (brl)", "amount spent (brl)", "amount spent"))
        x["gasto"] += g
        x["impressoes"] += int(num(col(r, "impressões", "impressoes", "impressions")))
        x["alcance"] += int(num(col(r, "alcance", "reach")))
        x["cliques"] += int(num(col(r, "cliques no link", "link clicks", "cliques (todos)", "clicks (all)")))
        dia = dia_iso(col(r, "dia", "day", "início dos relatórios", "reporting starts"))
        if dia:
            diario.setdefault(dia, {"gasto": 0.0})["gasto"] += g
    return por, diario


def sugerir(criativos, acordos_rastreados):
    """Regra simples; o agente de Análise confirma ou muda com justificativa."""
    base = "custo_visita"
    if acordos_rastreados and sum(1 for c in criativos if c.get("custo_acordo")) >= 2:
        base = "custo_acordo"
    vals = [c[base] for c in criativos if c.get(base)]
    if len(vals) < 2:
        return base, None
    med = statistics.median(vals)
    for c in criativos:
        v, g = c.get(base), c.get("gasto", 0)
        if g < 50 or v is None:
            c["sugestao"] = "Manter"; c["motivo"] = "pouco gasto para concluir" if g < 50 else "sem resultado medido"
        elif v > 2 * med:
            c["sugestao"] = "Pausar"; c["motivo"] = f"{base.replace('_', ' ')} {v:.2f} > 2× a mediana ({med:.2f})"
        elif v <= 0.7 * med:
            c["sugestao"] = "Escalar"; c["motivo"] = f"{base.replace('_', ' ')} {v:.2f} ≤ 70% da mediana ({med:.2f})"
        else:
            c["sugestao"] = "Manter"; c["motivo"] = f"perto da mediana ({med:.2f})"
    return base, med


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cliente", required=True)
    ap.add_argument("--campanha", required=True, help="id da campanha em dados/campanhas.json")
    ap.add_argument("--ddmp")
    ap.add_argument("--meta")
    ap.add_argument("--gravar", action="store_true")
    a = ap.parse_args()
    if not a.ddmp and not a.meta:
        die("passe --ddmp e/ou --meta")

    caminho = os.path.join(RAIZ, "dados", "campanhas.json")
    with open(caminho, encoding="utf-8") as f:
        dados = json.load(f)
    cli = next((c for c in dados.get("clientes", []) if c.get("id") == a.cliente), None) or die(f"cliente '{a.cliente}' não existe")
    camp = next((c for c in cli.get("campanhas", []) if c.get("id") == a.campanha), None) or die(f"campanha '{a.campanha}' não existe")
    cliente_utm = slug(cli.get("utm_cliente") or cli["id"])
    campanha_utm = slug(camp.get("utm_campanha") or "")

    d_por, d_dia = ddmp(a.ddmp, cliente_utm, campanha_utm) if a.ddmp else ({}, {})
    m_por, m_dia = meta(a.meta) if a.meta else ({}, {})

    ids = sorted(set(d_por) | set(m_por))
    criativos = []
    for cid in ids:
        c = {"id": cid}
        if cid in m_por:
            c.update({k: (round(v, 2) if isinstance(v, float) else v) for k, v in m_por[cid].items() if k != "nome_meta"})
        if cid in d_por:
            c.update({k: (round(v, 2) if isinstance(v, float) else v) for k, v in d_por[cid].items()})
            if not c.get("valor_acordos"):
                c.pop("valor_acordos", None)
        if c.get("gasto") and c.get("visitas_ddmp"):
            c["custo_visita"] = round(c["gasto"] / c["visitas_ddmp"], 2)
        if c.get("gasto") and c.get("acordos"):
            c["custo_acordo"] = round(c["gasto"] / c["acordos"], 2)
        criativos.append(c)
    base, med = sugerir(criativos, cli.get("acordos_rastreados") is True)

    tot = {}
    for k in ("gasto", "impressoes", "alcance", "cliques", "visitas_ddmp", "acordos", "valor_acordos"):
        vals = [c[k] for c in criativos if k in c]
        if vals:
            tot[k] = round(sum(vals), 2) if isinstance(vals[0], float) else sum(vals)
    if tot.get("gasto") and tot.get("visitas_ddmp"):
        tot["custo_visita"] = round(tot["gasto"] / tot["visitas_ddmp"], 2)
    if tot.get("gasto") and tot.get("acordos"):
        tot["custo_acordo"] = round(tot["gasto"] / tot["acordos"], 2)

    dias = sorted(set(d_dia) | set(m_dia))
    diario = []
    for dd in dias:
        if not re.match(r"\d{4}-\d{2}-\d{2}$", dd):
            continue
        x = {"dia": dd}
        if dd in m_dia: x["gasto"] = round(m_dia[dd]["gasto"], 2)
        if dd in d_dia: x.update(d_dia[dd])
        diario.append(x)

    alertas = []
    if not cli.get("acordos_rastreados") and tot.get("acordos") is not None:
        alertas.append("acordos parciais: este cliente fecha acordo fora do DDMP; a sugestão usa custo por visita")
    teto = (dados.get("verba") or {}).get("total_max_brl")
    if teto and tot.get("gasto"):
        pct = tot["gasto"] / teto
        if pct >= 0.8:
            alertas.append(f"verba: R$ {tot['gasto']:.2f} gastos no período = {pct:.0%} do teto de R$ {teto:.2f}")

    res = {
        "simulado": False,
        "fonte": " + ".join(f for f in (("Meta Ads export" if a.meta else ""), ("DDMP export" if a.ddmp else "")) if f),
        "periodo": {"inicio": diario[0]["dia"], "fim": diario[-1]["dia"]} if diario else None,
        "medido_em": time.strftime("%Y-%m-%d"),
        "base_comparacao": base, "mediana": round(med, 2) if med else None,
        "totais": tot, "criativos": criativos, "diario": diario,
    }
    if alertas:
        res["alertas"] = alertas
    if not res["periodo"]:
        res.pop("periodo")

    print(f"Cliente {a.cliente} · campanha {a.campanha} (utm: cliente={cliente_utm}, campanha={campanha_utm or '*'})")
    print(f"{'criativo':<9}{'gasto':>10}{'visitas':>9}{'acordos':>9}{'R$/visita':>11}{'R$/acordo':>11}  sugestão")
    for c in criativos:
        print(f"{c['id']:<9}{c.get('gasto', 0):>10.2f}{c.get('visitas_ddmp', 0):>9}{c.get('acordos', 0):>9}"
              f"{(c.get('custo_visita') or 0):>11.2f}{(c.get('custo_acordo') or 0):>11.2f}  {c.get('sugestao', '—')} ({c.get('motivo', '')})")
    print("TOTAL " + json.dumps(tot, ensure_ascii=False))
    for al in alertas:
        print("ALERTA " + al)

    if a.gravar:
        anterior = camp.get("resultados") or {}
        if anterior.get("analise"):
            res["analise"] = anterior["analise"]  # o agente de Análise reescreve depois
        camp["resultados"] = res
        dados["atualizado_em"] = time.strftime("%Y-%m-%d")
        dados["atualizado_por"] = f"Resultados DDMP · {a.cliente}/{a.campanha}"
        tmp = caminho + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(dados, f, ensure_ascii=False, indent=2)
            f.write("\n")
        os.replace(tmp, caminho)
        print(f"OK — gravado em dados/campanhas.json → {a.cliente}/{a.campanha}.resultados")


if __name__ == "__main__":
    main()
