"""Carrega ~/.hermes/.env para os scripts DDM sem nunca imprimir valores."""
import json, os

# Versão da Graph/Marketing API usada por todos os scripts (sobrescreva com META_API_VERSION no .env).
# v21–v23 já saíram de suporte; v26.0 é a atual em out/2026.
META_API_VERSION_PADRAO = "v26.0"

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


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


def meta_versao():
    return os.environ.get("META_API_VERSION", META_API_VERSION_PADRAO)


def verba():
    """Limites de verba aprovados (dados/campanhas.json → verba). {} se não houver."""
    try:
        with open(os.path.join(RAIZ, "dados", "campanhas.json"), encoding="utf-8") as f:
            return json.load(f).get("verba") or {}
    except (OSError, ValueError):
        return {}
