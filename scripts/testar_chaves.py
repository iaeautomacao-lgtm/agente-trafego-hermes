#!/usr/bin/env python3
"""
testar_chaves.py — confere as chaves em ~/.hermes/.env sem mostrá-las e faz 1 chamada real em cada API.
Saída: artes/teste/teste-feed.png + scripts/teste-chaves.resultado.json (sem segredos).
Uso (na pasta do repositório):
  python3 scripts/testar_chaves.py            # Jev + Gemini (gera 1 imagem)
  python3 scripts/testar_chaves.py --meta     # só o Meta: SOMENTE LEITURA (GET), não cria nem altera nada
"""
import json, os, sys, time, traceback, urllib.error, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import carregar_env, meta_versao  # noqa: E402

_pre_shell = bool(os.environ.get("GOOGLE_API_KEY"))
carregar_env()


def meta_get(caminho, campos):
    """Só GET. Devolve (ok, json|erro). O token vai na URL e nunca é impresso."""
    url = f"https://graph.facebook.com/{meta_versao()}/{caminho}?" + urllib.parse.urlencode(
        {"fields": campos, "access_token": os.environ["META_ACCESS_TOKEN"]})
    try:
        with urllib.request.urlopen(urllib.request.Request(url, method="GET"), timeout=30) as r:
            return True, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            err = json.loads(e.read().decode()).get("error", {})
            return False, f"HTTP {e.code} · {err.get('type', '')} {err.get('code', '')}: {err.get('message', '')[:200]}"
        except ValueError:
            return False, f"HTTP {e.code}"
    except urllib.error.URLError as e:
        return False, f"sem conexão: {e.reason}"


def testar_meta():
    """Confere token e ids do Meta lendo nomes e status. Não imprime ids nem token."""
    sufixos = sorted({k.split("_", 2)[2] for k in os.environ if k.startswith(("META_AUDIENCE_", "META_ADSET_"))})
    vars_ = ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID", "META_PAGE_ID"] + \
        [f"META_{t}_{c}" for c in sufixos for t in ("AUDIENCE", "ADSET")]
    out = {"quando": time.strftime("%Y-%m-%dT%H:%M:%S"), "versao_api": meta_versao(), "chaves": {}, "leituras": {}}
    for k in vars_:
        out["chaves"][k] = f"presente ({len(os.environ[k])} caracteres)" if os.environ.get(k) else "ausente"
    print("Chaves Meta:", json.dumps(out["chaves"], ensure_ascii=False, indent=2))
    if not os.environ.get("META_ACCESS_TOKEN"):
        print("Sem META_ACCESS_TOKEN — nada a testar.")
        return out
    checagens = [("token", "me", "name")]
    if os.environ.get("META_AD_ACCOUNT_ID"):
        checagens.append(("conta", f"act_{os.environ['META_AD_ACCOUNT_ID']}",
                          "name,currency,account_status,amount_spent,spend_cap,timezone_name"))
    if os.environ.get("META_PAGE_ID"):
        checagens.append(("pagina", os.environ["META_PAGE_ID"], "name"))
    for c in sufixos:
        if os.environ.get(f"META_AUDIENCE_{c}"):
            checagens.append((f"publico_{c.lower()}", os.environ[f"META_AUDIENCE_{c}"],
                              "name,subtype,approximate_count_lower_bound,approximate_count_upper_bound,"
                              "operation_status,delivery_status"))
        if os.environ.get(f"META_ADSET_{c}"):
            checagens.append((f"conjunto_{c.lower()}", os.environ[f"META_ADSET_{c}"],
                              "name,status,effective_status,daily_budget,optimization_goal,campaign{name,status,objective,spend_cap}"))
    for nome, caminho, campos in checagens:
        ok, r = meta_get(caminho, campos)
        if ok:
            r.pop("id", None)
            if isinstance(r.get("campaign"), dict):
                r["campaign"].pop("id", None)
        out["leituras"][nome] = {"ok": ok, ("dados" if ok else "erro"): r}
        print(f"{'OK  ' if ok else 'ERRO'} {nome}: {json.dumps(r, ensure_ascii=False) if ok else r}")
    return out


if "--meta" in sys.argv:
    res_meta = testar_meta()
    saida = os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste-meta.resultado.json")
    json.dump(res_meta, open(saida, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("Resultado salvo em scripts/teste-meta.resultado.json (fora do git)")
    sys.exit(0 if all(x["ok"] for x in res_meta["leituras"].values()) and res_meta["leituras"] else 1)
res = {"quando": time.strftime("%Y-%m-%dT%H:%M:%S"), "chaves": {}, "jev": None, "gemini": None}
for k in ("GOOGLE_API_KEY", "TYPESAFE_API_KEY", "META_ACCESS_TOKEN"):
    res["chaves"][k] = "presente" if os.environ.get(k) else "ausente"
print("Chaves:", res["chaves"])

# diagnóstico da chave do Google SEM revelar o valor: quantas linhas, tamanho, prefixo esperado
_diag = {"definida_no_shell_antes": _pre_shell, "linhas_no_env": []}
_envp = os.path.expanduser("~/.hermes/.env")
if os.path.exists(_envp):
    for _l in open(_envp, encoding="utf-8"):
        _l = _l.strip()
        if _l.removeprefix("export ").startswith("GOOGLE_API_KEY="):
            _v = _l.split("=", 1)[1].strip().strip('"').strip("'")
            _diag["linhas_no_env"].append({"tamanho": len(_v), "formato_classico_AIza": _v.startswith("AIza")})
_g = os.environ.get("GOOGLE_API_KEY", "")
_diag["em_uso"] = {"tamanho": len(_g), "formato_classico_AIza": _g.startswith("AIza")}
res["diagnostico_google"] = _diag
print("Diagnóstico Google (sem o valor):", _diag)

# Jev
try:
    import jev_risk_score as jev
    if os.environ.get("TYPESAFE_API_KEY"):
        bom = jev.pontuar("Sua graduação ainda está disponível. Trancou a matrícula e quer retomar? Dá para conversar sem compromisso.", os.environ["TYPESAFE_API_KEY"])
        ruim = jev.pontuar("ÚLTIMA CHANCE: quite sua dívida hoje ou seu nome vai para o SPC e você será processado.", os.environ["TYPESAFE_API_KEY"])
        res["jev"] = {"ok": True, "score_texto_seguro": bom["score"], "score_texto_arriscado": ruim["score"], "detalhe_arriscado": ruim["detalhe"], "usage": [bom["usage"], ruim["usage"]]}
        print(f"Jev OK — texto seguro: {bom['score']}/100 · texto arriscado: {ruim['score']}/100")
except SystemExit as e:
    res["jev"] = {"ok": False, "erro": str(e)}; print("Jev:", e)
except Exception:
    res["jev"] = {"ok": False, "erro": traceback.format_exc()[-400:]}; print("Jev erro:", res["jev"]["erro"])

# Gemini
try:
    import gerar_arte as ga
    if os.environ.get("GOOGLE_API_KEY"):
        ch = os.environ["GOOGLE_API_KEY"]
        res["gemini"] = {"modelos_imagem": ga.modelos_de_imagem(ch)}
        print("Modelos de imagem disponíveis:", res["gemini"]["modelos_imagem"])
        raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        saida = os.path.join(raiz, "artes", "teste", "teste-feed.png")
        t0 = time.time()
        ga.gerar("A young Brazilian woman in her late twenties sitting at a kitchen table with a laptop and a coffee, smiling with relief, warm morning light.", saida, ch, "1:1")
        res["gemini"].update({"ok": True, "arquivo": "artes/teste/teste-feed.png", "segundos": round(time.time() - t0, 1)})
        print("Gemini OK — imagem em artes/teste/teste-feed.png")
except SystemExit as e:
    res["gemini"] = {**(res["gemini"] or {}), "ok": False, "erro": str(e)}; print("Gemini:", e)
except Exception:
    res["gemini"] = {**(res["gemini"] or {}), "ok": False, "erro": traceback.format_exc()[-400:]}; print("Gemini erro:", res["gemini"]["erro"])

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste-chaves.resultado.json")
json.dump(res, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("Resultado salvo em scripts/teste-chaves.resultado.json")
