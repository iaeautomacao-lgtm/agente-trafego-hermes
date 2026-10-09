#!/usr/bin/env python3
"""
testar_chaves.py — confere as chaves em ~/.hermes/.env sem mostrá-las e faz 1 chamada real em cada API.
Saída: artes/teste/teste-feed.png + scripts/teste-chaves.resultado.json (sem segredos).
Uso (na pasta do repositório): python3 scripts/testar_chaves.py
"""
import json, os, sys, time, traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import carregar_env  # noqa: E402

_pre_shell = bool(os.environ.get("GOOGLE_API_KEY"))
carregar_env()
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
