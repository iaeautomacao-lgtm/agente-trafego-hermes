#!/usr/bin/env python3
"""
meta_publicar.py — publica uma campanha no Meta Ads SEMPRE EM PAUSA (status PAUSED).

Uso:
  python3 scripts/meta_publicar.py dados/publicacoes/<campanha>.json --dry-run   # só mostra as chamadas (padrão)
  python3 scripts/meta_publicar.py dados/publicacoes/<campanha>.json --mock      # simula respostas (teste do fluxo)
  python3 scripts/meta_publicar.py dados/publicacoes/<campanha>.json --executar  # chama a API de verdade

Variáveis de ambiente (só para --executar):
  META_ACCESS_TOKEN   token de usuário do sistema com ads_management
  META_AD_ACCOUNT_ID  id numérico da conta de anúncios (sem o prefixo act_)
  META_PAGE_ID        id da Página do Facebook que assina os anúncios
  META_API_VERSION    opcional, padrão v21.0

Garantias:
  - Todo objeto criado (campanha, conjuntos, anúncios) nasce com status PAUSED. Não existe opção para ACTIVE aqui.
  - Nada é criado sem `aprovacao_humana.aprovado = true` no arquivo de publicação.
  - Sem bibliotecas externas: só stdlib (urllib).
"""
import json, os, sys, time, urllib.request, urllib.parse, urllib.error

STATUS_FIXO = "PAUSED"


def die(msg, code=2):
    print("ERRO: " + msg, file=sys.stderr)
    sys.exit(code)


def carregar_spec(caminho):
    with open(caminho, encoding="utf-8") as f:
        spec = json.load(f)
    for k in ("campanha", "conjuntos"):
        if k not in spec:
            die(f"spec sem a chave obrigatória '{k}'")
    ap = spec.get("aprovacao_humana") or {}
    if ap.get("aprovado") is not True:
        die("aprovacao_humana.aprovado não é true — a campanha não foi aprovada por um humano; nada será criado")
    if not spec["conjuntos"]:
        die("nenhum conjunto de anúncios no spec")
    for c in spec["conjuntos"]:
        if not c.get("anuncios"):
            die(f"conjunto '{c.get('nome')}' sem anúncios")
    return spec


class Cliente:
    def __init__(self, modo):
        self.modo = modo  # dry-run | mock | executar
        self.chamadas = []
        self._seq = 1000
        if modo == "executar":
            self.token = os.environ.get("META_ACCESS_TOKEN") or die("META_ACCESS_TOKEN ausente")
            self.conta = os.environ.get("META_AD_ACCOUNT_ID") or die("META_AD_ACCOUNT_ID ausente")
            self.pagina = os.environ.get("META_PAGE_ID") or die("META_PAGE_ID ausente")
        else:
            self.token = "<META_ACCESS_TOKEN>"
            self.conta = os.environ.get("META_AD_ACCOUNT_ID", "<META_AD_ACCOUNT_ID>")
            self.pagina = os.environ.get("META_PAGE_ID", "<META_PAGE_ID>")
        self.versao = os.environ.get("META_API_VERSION", "v21.0")
        self.base = f"https://graph.facebook.com/{self.versao}"

    def post(self, caminho, dados):
        # trava de segurança: qualquer status enviado é PAUSED
        if "status" in dados and dados["status"] != STATUS_FIXO:
            die(f"tentativa de criar objeto com status {dados['status']} — proibido")
        url = f"{self.base}/{caminho}"
        registro = {"POST": url, "dados": dados}
        self.chamadas.append(registro)
        if self.modo == "dry-run":
            print(f"\nPOST {url}")
            print(json.dumps(dados, ensure_ascii=False, indent=2))
            self._seq += 1
            return {"id": f"dry_{self._seq}"}
        if self.modo == "mock":
            self._seq += 1
            resp = {"id": f"mock_{self._seq}"}
            if caminho.endswith("/adimages"):
                resp = {"images": {k: {"hash": f"mockhash_{self._seq}"} for k in ["arquivo"]}}
            print(f"[mock] POST {caminho} → {resp}")
            return resp
        corpo = dict(dados)
        corpo["access_token"] = self.token
        # campos aninhados vão como JSON string
        for k, v in list(corpo.items()):
            if isinstance(v, (dict, list)):
                corpo[k] = json.dumps(v, ensure_ascii=False)
        req = urllib.request.Request(url, data=urllib.parse.urlencode(corpo).encode(), method="POST")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            die(f"Meta API {e.code} em {caminho}: {e.read().decode()[:600]}")


def publicar(spec, cli):
    camp = spec["campanha"]
    conta = f"act_{cli.conta}"
    objetivo = camp.get("objetivo", "OUTCOME_LEADS")
    r = cli.post(f"{conta}/campaigns", {
        "name": camp["nome"],
        "objective": objetivo,
        "status": STATUS_FIXO,
        "special_ad_categories": camp.get("special_ad_categories", []),
        "buying_type": "AUCTION",
    })
    campanha_id = r["id"]
    resultado = {"campanha_id": campanha_id, "status": STATUS_FIXO, "conjuntos": []}

    for conj in spec["conjuntos"]:
        seg = conj.get("segmentacao", {})
        targeting = {
            "geo_locations": seg.get("geo_locations", {"countries": ["BR"]}),
            "age_min": seg.get("idade_min", 22),
            "age_max": seg.get("idade_max", 40),
        }
        if seg.get("interesses"):
            targeting["flexible_spec"] = [{"interests": seg["interesses"]}]
        if seg.get("publicos_personalizados"):
            # exige base legal documentada (LGPD) — só entra se o spec trouxer explicitamente
            targeting["custom_audiences"] = seg["publicos_personalizados"]
        r = cli.post(f"{conta}/adsets", {
            "name": conj["nome"],
            "campaign_id": campanha_id,
            "status": STATUS_FIXO,
            "daily_budget": int(round(conj["orcamento_diario_brl"] * 100)),  # centavos
            "billing_event": "IMPRESSIONS",
            "optimization_goal": conj.get("otimizacao", "LEAD_GENERATION" if objetivo == "OUTCOME_LEADS" else "LINK_CLICKS"),
            "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
            "targeting": targeting,
            "start_time": conj.get("inicio") or spec.get("inicio"),
            "end_time": conj.get("fim") or spec.get("fim"),
        })
        conj_id = r["id"]
        saida_conj = {"nome": conj["nome"], "adset_id": conj_id, "anuncios": []}

        for an in conj["anuncios"]:
            img_hash = None
            if an.get("imagem"):
                if not os.path.exists(an["imagem"]) and cli.modo == "executar":
                    die(f"imagem não encontrada: {an['imagem']}")
                r = cli.post(f"{conta}/adimages", {"filename": an["imagem"]})
                imgs = r.get("images", {})
                img_hash = next(iter(imgs.values()))["hash"] if imgs else None
            link_data = {
                "link": an["link"],
                "message": an["texto"],
                "name": an["headline"],
                "description": an.get("descricao", ""),
                "call_to_action": {"type": an.get("cta", "LEARN_MORE"), "value": {"link": an["link"]}},
            }
            if img_hash:
                link_data["image_hash"] = img_hash
            r = cli.post(f"{conta}/adcreatives", {
                "name": f"{an['id']} — {an['headline']}",
                "object_story_spec": {"page_id": cli.pagina, "link_data": link_data},
            })
            creative_id = r["id"]
            r = cli.post(f"{conta}/ads", {
                "name": f"{an['id']} — {an['headline']}",
                "adset_id": conj_id,
                "creative": {"creative_id": creative_id},
                "status": STATUS_FIXO,
            })
            saida_conj["anuncios"].append({"id": an["id"], "ad_id": r["id"], "creative_id": creative_id})
        resultado["conjuntos"].append(saida_conj)
    return resultado


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__); sys.exit(1)
    spec_path = args[0]
    modo = "dry-run"
    if "--mock" in args: modo = "mock"
    if "--executar" in args: modo = "executar"
    spec = carregar_spec(spec_path)
    cli = Cliente(modo)
    print(f"Modo: {modo} · campanha: {spec['campanha']['nome']} · conjuntos: {len(spec['conjuntos'])} · anúncios: {sum(len(c['anuncios']) for c in spec['conjuntos'])} · status: {STATUS_FIXO}")
    res = publicar(spec, cli)
    res["modo"] = modo
    res["chamadas"] = len(cli.chamadas)
    res["publicado_em"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    saida = spec_path.replace(".json", f".resultado-{modo}.json")
    with open(saida, "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=2)
    print(f"\nOK — {res['chamadas']} chamadas ({modo}). Resultado em {saida}")
    if modo == "executar":
        print(f"Campanha {res['campanha_id']} criada em PAUSA. Ative manualmente no Ads Manager depois de conferir.")


if __name__ == "__main__":
    main()
