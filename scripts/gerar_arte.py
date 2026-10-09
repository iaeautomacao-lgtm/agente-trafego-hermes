#!/usr/bin/env python3
"""
gerar_arte.py — gera a imagem de um criativo com o modelo de imagem do Gemini (Google AI Studio).

Uso:
  python3 scripts/gerar_arte.py --prompt "..." --saida artes/<campanha>/<id>-feed.png [--formato 1:1|4:5|9:16] [--modelo ...]

Lê GOOGLE_API_KEY do ambiente ou de ~/.hermes/.env. Nunca imprime a chave.
Regra DDM: a imagem sai SEM TEXTO; headline e CTA entram depois, por cima (sobreposição), para o texto aprovado pelo Compliance não ser alterado.
"""
import argparse, base64, json, os, sys, urllib.request, urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import carregar_env  # noqa: E402

BASE = "https://generativelanguage.googleapis.com/v1beta"
MODELO_PADRAO = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
SUFIXO = (" Photographic ad image, natural light, Brazilian adult in a real everyday setting. "
          "No text, no letters, no logos, no watermarks anywhere in the image.")


def chamar(caminho, chave, corpo=None):
    req = urllib.request.Request(f"{BASE}/{caminho}", method="POST" if corpo else "GET",
                                 data=json.dumps(corpo).encode() if corpo else None,
                                 headers={"x-goog-api-key": chave, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        corpo_erro = e.read().decode()
        try:
            msg = json.loads(corpo_erro)["error"]["message"]
        except Exception:
            msg = corpo_erro[:400]
        raise SystemExit(f"ERRO Gemini {e.code}: {msg}")


def modelos_de_imagem(chave):
    r = chamar("models?pageSize=200", chave)
    return [m["name"].split("/")[-1] for m in r.get("models", []) if "image" in m["name"]]


def gerar(prompt, saida, chave, formato="1:1", modelo=MODELO_PADRAO):
    corpo = {
        "contents": [{"parts": [{"text": prompt + SUFIXO}]}],
        "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": formato}},
    }
    r = chamar(f"models/{modelo}:generateContent", chave, corpo)
    for c in r.get("candidates", []):
        for p in c.get("content", {}).get("parts", []):
            dado = p.get("inlineData") or p.get("inline_data")
            if dado and dado.get("data"):
                os.makedirs(os.path.dirname(saida) or ".", exist_ok=True)
                with open(saida, "wb") as f:
                    f.write(base64.b64decode(dado["data"]))
                return saida
    raise SystemExit(f"ERRO: o modelo não devolveu imagem. Resposta: {json.dumps(r)[:400]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--saida", required=True)
    ap.add_argument("--formato", default="1:1")
    ap.add_argument("--modelo", default=MODELO_PADRAO)
    a = ap.parse_args()
    carregar_env()
    chave = os.environ.get("GOOGLE_API_KEY")
    if not chave:
        raise SystemExit("ERRO: GOOGLE_API_KEY não encontrada no ambiente nem em ~/.hermes/.env")
    print("OK —", gerar(a.prompt, a.saida, chave, a.formato, a.modelo))


if __name__ == "__main__":
    main()
