#!/usr/bin/env python3
"""
jev_risk_score.py — segunda opinião de risco (0–100) para criativos da DDM, usando Jev (TypeSafe).

Uso:
  python3 scripts/jev_risk_score.py --texto "headline. texto do anúncio"
  python3 scripts/jev_risk_score.py --pack dados/publicacoes/exemplo-demo-2.json   # pontua todos os anúncios do spec
  python3 scripts/jev_risk_score.py --pack <spec>.json --saida <arquivo>.json

Lê TYPESAFE_API_KEY do ambiente ou de ~/.hermes/.env. Nunca imprime a chave.
Score: 0 = sem risco, 100 = risco máximo. Mesmo sentido do score do agente Compliance.
"""
import argparse, json, os, sys, urllib.request, urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import carregar_env  # noqa: E402

URL = "https://api.typesafe.ai/v1/systemone"
MODELO = "jev-latest"

# 8 perguntas atômicas, cada uma vira uma probabilidade (noul). Pesos somam 100.
PERGUNTAS = {
    "promessa_garantida": (18, "O texto promete um resultado garantido (desconto certo, aprovação certa, nome limpo, quitação garantida)?"),
    "ameaca_coercao": (18, "O texto contém ameaça, intimidação ou pressão coercitiva (processo, negativação, consequências) contra o leitor?"),
    "exposicao_divida": (16, "O texto expõe, insinua ou menciona a dívida ou a situação financeira do leitor de forma que terceiros perceberiam?"),
    "constrangimento": (12, "O tom do texto é humilhante, culpabilizante ou constrangedor para o leitor?"),
    "urgencia_artificial": (10, "O texto cria urgência artificial (últimas horas, só hoje, última chance) sem prazo real?"),
    "dado_sensivel": (10, "O texto usa ou sugere dados pessoais sensíveis do leitor (saúde, renda, situação familiar, nome da instituição de ensino)?"),
    "informacao_enganosa": (10, "O texto contém afirmação enganosa ou que não pode ser comprovada?"),
    "linguagem_cobranca": (6, "O texto usa linguagem típica de cobrança (débito, dívida, pendência financeira, quitar, negociar dívida)?"),
}


def pontuar(texto, chave):
    corpo = {
        "state": texto,
        "model": MODELO,
        "questions": {k: {"type": "noul", "instructions": q} for k, (_, q) in PERGUNTAS.items()},
    }
    req = urllib.request.Request(URL, data=json.dumps(corpo).encode(), method="POST", headers={
        "Authorization": f"Bearer {chave}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            resp = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"ERRO Jev {e.code}: {e.read().decode()[:400]}")
    respostas = resp.get("answers", {})
    detalhe, score = {}, 0.0
    for k, (peso, _) in PERGUNTAS.items():
        p = float(respostas.get(k, {}).get("noul", 0) or 0)
        p = max(0.0, min(1.0, p))
        detalhe[k] = round(p, 3)
        score += peso * p
    return {"score": round(score), "detalhe": detalhe, "usage": resp.get("usage", {})}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--texto")
    ap.add_argument("--pack")
    ap.add_argument("--saida")
    a = ap.parse_args()
    carregar_env()
    chave = os.environ.get("TYPESAFE_API_KEY")
    if not chave:
        raise SystemExit("ERRO: TYPESAFE_API_KEY não encontrada no ambiente nem em ~/.hermes/.env")
    resultados = []
    if a.texto:
        resultados.append({"id": "texto", **pontuar(a.texto, chave)})
    elif a.pack:
        spec = json.load(open(a.pack, encoding="utf-8"))
        for conj in spec.get("conjuntos", []):
            for an in conj.get("anuncios", []):
                t = f"{an.get('headline','')}. {an.get('texto','')} {an.get('descricao','')}".strip()
                r = pontuar(t, chave)
                resultados.append({"id": an.get("id"), "headline": an.get("headline"), **r})
                print(f"{an.get('id'):>4}  score {r['score']:>3}  {an.get('headline','')}")
    else:
        ap.error("use --texto ou --pack")
    if a.texto:
        print(json.dumps(resultados[0], ensure_ascii=False, indent=2))
    if a.saida:
        json.dump(resultados, open(a.saida, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print(f"OK — resultado em {a.saida}")
    return resultados


if __name__ == "__main__":
    main()
