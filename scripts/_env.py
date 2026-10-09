"""Carrega ~/.hermes/.env para os scripts DDM sem nunca imprimir valores."""
import os


def carregar_env(caminho="~/.hermes/.env"):
    caminho = os.path.expanduser(caminho)
    if not os.path.exists(caminho):
        return
    with open(caminho, encoding="utf-8") as f:
        for linha in f:
            linha = linha.strip()
            if not linha or linha.startswith("#") or "=" not in linha:
                continue
            k, v = linha.split("=", 1)
            k = k.strip().removeprefix("export ").strip()
            v = v.strip().strip('"').strip("'")
            if k and v and not os.environ.get(k):
                os.environ[k] = v
