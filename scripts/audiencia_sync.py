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
  python3 scripts/audiencia_sync.py --cliente inst-a --api                                                 # base direto do sistema da DDM (dry-run)
  python3 scripts/audiencia_sync.py --cliente inst-a --sftp                                                # arquivo do dia na pasta SFTP da DDM (dry-run)

Base: CSV (vírgula ou ponto e vírgula) exportado do CRM. Colunas reconhecidas pelo nome:
  e-mail: email, e-mail, mail      telefone: telefone, celular, fone, phone, whatsapp, tel (pode ter várias)
Outras colunas (nome, CPF, valor...) são IGNORADAS e nunca saem do computador.

Base pela API do sistema da DDM (--api, no lugar de --base): GET em DDM_API_URL_<CLIENTE>.
  Resposta aceita: CSV, lista JSON, ou objeto JSON com a lista em data/items/results/registros/devedores
  (ou na chave DDM_API_LISTA). Campos aninhados valem pelo último nome (contato.email → email);
  lista de telefones é aceita. Paginação: segue next/proxima/next_page_url só no mesmo servidor.
  A resposta fica só na memória: nada é gravado em disco além das contagens.

Base pela pasta SFTP do sistema da DDM (--sftp, no lugar de --base): usa o sftp do próprio Mac (OpenSSH),
  entra com chave (sem senha), só lista e baixa: nunca envia nem apaga nada no servidor.
  DDM_SFTP_ARQUIVO_<CLIENTE> é o caminho no servidor; aceita * (pega o mais novo) e datas no formato
  do strftime (%Y%m%d = hoje). O arquivo passa por uma pasta temporária privada (0700) fora do repositório
  e é apagado no fim, com erro ou sem. Arquivo com mais de DDM_SFTP_IDADE_MAX_H horas → aborta (base velha).
  A chave do servidor fica em ~/.hermes/ddm_sftp_known_hosts (gravada na 1ª conexão; se mudar, aborta).

Privacidade (LGPD):
  - E-mail e telefone são normalizados e transformados em hash SHA-256 aqui; o Meta só recebe hashes.
  - O script nunca imprime, loga ou grava dado pessoal nem hash no repositório. Só contagens.
  - A base fica fora do repositório (ex.: ~/ddm-crm/). O estado de ontem (hashes) fica em ~/.hermes/audiencias/.

Variáveis (só para --executar), em ~/.hermes/.env:
  META_ACCESS_TOKEN               token com ads_management
  META_AUDIENCE_<CLIENTE>         id do público personalizado do cliente (ex.: META_AUDIENCE_INST_A)
  META_API_VERSION                opcional, padrão em scripts/_env.py (v26.0)
Variáveis (só para --api), em ~/.hermes/.env:
  DDM_API_URL_<CLIENTE>           endereço que devolve quem está em aberto nesse cliente (https)
  DDM_API_TOKEN                   credencial só de leitura (opcional se o endereço não pedir)
  DDM_API_AUTH_HEADER             opcional, padrão Authorization
  DDM_API_AUTH_ESQUEMA            opcional, padrão Bearer (vazio = manda só o token)
  DDM_API_LISTA                   opcional, chave da lista na resposta JSON
Variáveis (só para --sftp), em ~/.hermes/.env:
  DDM_SFTP_HOST                   servidor SFTP da DDM
  DDM_SFTP_USUARIO                usuário só de leitura
  DDM_SFTP_PORTA                  opcional, padrão 22
  DDM_SFTP_CHAVE                  opcional, chave privada (padrão ~/.ssh/ddm_sftp)
  DDM_SFTP_ARQUIVO_<CLIENTE>      caminho do arquivo do dia (ex.: /pasta/cliente_%Y%m%d.csv ou /pasta/cliente_*.csv)
  DDM_SFTP_IDADE_MAX_H            opcional, idade máxima do arquivo em horas (padrão 30)

Travas:
  - --executar só roda se dados/campanhas.json → clientes[<cliente>].publico.base_legal estiver preenchido (LGPD).
  - Menos de 100 pessoas válidas → aborta (base provavelmente quebrada).
  - Tamanho mudou mais de 30% em relação à última troca → aborta, a não ser com --forcar
    (o agente só usa --forcar depois do OK humano do dia).
"""
import argparse, csv, hashlib, io, json, os, random, re, shutil, subprocess, sys, tempfile, time, urllib.error, urllib.parse, urllib.request

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


def colunas(cab, origem):
    """Escolhe as colunas de e-mail e telefone pelo nome (para campo aninhado vale o último nome)."""
    ult = lambda c: c.rsplit(".", 1)[-1]
    c_email = [c for c in cab if ult(c) in COLS_EMAIL]
    c_fone = [c for c in cab if ult(c) in COLS_FONE or ult(c).startswith(("telefone", "celular"))]
    if not c_email and not c_fone:
        die(f"nenhuma coluna de e-mail ou telefone reconhecida em {origem} (colunas: {', '.join(cab[:40])})")
    return c_email, c_fone


def linhas_de_csv(texto, origem):
    amostra = texto[:4096]
    sep = ";" if amostra.count(";") > amostra.count(",") else ","
    leitor = csv.DictReader(io.StringIO(texto), delimiter=sep)
    cab = [c.strip().lower() for c in (leitor.fieldnames or [])]
    c_email, c_fone = colunas(cab, origem)
    linhas = [{(k or "").strip().lower(): (v or "") for k, v in bruto.items() if isinstance(v, str)} for bruto in leitor]
    return linhas, c_email, c_fone


def decodificar(bruto):
    """UTF-8 (com ou sem BOM); senão Windows-1252, comum em exportação de sistema brasileiro."""
    try:
        return bruto.decode("utf-8-sig")
    except UnicodeDecodeError:
        return bruto.decode("cp1252", errors="replace")


def ler_csv(caminho):
    caminho = os.path.expanduser(caminho)
    if not os.path.exists(caminho):
        die(f"arquivo não encontrado: {caminho}")
    with open(caminho, "rb") as f:
        return linhas_de_csv(decodificar(f.read()), os.path.basename(caminho))


def achatar(reg, prefixo=""):
    """{'contato': {'email': x, 'telefones': [a, b]}} → {'contato.email': x, 'contato.telefones': 'a/b'}."""
    out = {}
    for k, v in (reg or {}).items():
        k = f"{prefixo}{str(k).strip().lower()}"
        if isinstance(v, dict):
            out.update(achatar(v, k + "."))
        elif isinstance(v, list):
            out[k] = "/".join(str(x) for x in v if isinstance(x, (str, int)))
        elif v is not None:
            out[k] = str(v)
    return out


def ler_api(cliente):
    """Base do dia direto do sistema da DDM. Só GET; nada da resposta vai para disco ou para a tela."""
    carregar_env()
    var = "DDM_API_URL_" + cliente.upper().replace("-", "_")
    url = os.environ.get(var) or die(f"{var} ausente em ~/.hermes/.env")
    base = urllib.parse.urlsplit(url)
    local = base.hostname in ("localhost", "127.0.0.1")
    if base.scheme != "https" and not (base.scheme == "http" and local):
        die(f"{var} precisa ser https")
    cab = {"Accept": "application/json, text/csv"}
    if os.environ.get("DDM_API_TOKEN"):
        esquema = os.environ.get("DDM_API_AUTH_ESQUEMA", "Bearer")
        cab[os.environ.get("DDM_API_AUTH_HEADER", "Authorization")] = \
            f"{esquema} {os.environ['DDM_API_TOKEN']}".strip()
    chave_lista = os.environ.get("DDM_API_LISTA")
    registros, paginas, proxima = [], 0, url
    while proxima:
        alvo = urllib.parse.urlsplit(proxima)
        if (alvo.scheme, alvo.netloc) != (base.scheme, base.netloc):
            die("a paginação apontou para outro servidor; parado para não mandar a credencial para fora")
        paginas += 1
        if paginas > 500:
            die("mais de 500 páginas na API; parado (confira a paginação)")
        try:
            with urllib.request.urlopen(urllib.request.Request(proxima, headers=cab, method="GET"), timeout=60) as r:
                tipo, corpo = r.headers.get("Content-Type", ""), r.read().decode("utf-8-sig", errors="replace")
        except urllib.error.HTTPError as e:
            die(f"API da DDM respondeu HTTP {e.code} na página {paginas}")
        except urllib.error.URLError as e:
            die(f"API da DDM fora do ar ou inacessível: {e.reason}")
        if "csv" in tipo or (corpo[:1] not in "[{" and paginas == 1):
            return linhas_de_csv(corpo, "resposta da API (CSV)")
        try:
            j = json.loads(corpo)
        except ValueError:
            die(f"API da DDM devolveu algo que não é CSV nem JSON na página {paginas}")
        atual, proxima = proxima, None
        if isinstance(j, dict):
            lista = j.get(chave_lista) if chave_lista else next(
                (j[k] for k in ("data", "items", "results", "registros", "devedores", "resultado") if isinstance(j.get(k), list)), None)
            if not isinstance(lista, list):
                die(f"não achei a lista de pessoas na resposta da API (chaves: {', '.join(list(j)[:20])}); defina DDM_API_LISTA")
            prox = next((j[k] for k in ("next", "proxima", "next_page_url") if isinstance(j.get(k), str) and j[k]), None)
            proxima = urllib.parse.urljoin(atual, prox) if prox else None
        elif isinstance(j, list):
            lista = j
        else:
            die("resposta da API em formato inesperado")
        registros.extend(achatar(x) for x in lista if isinstance(x, dict))
    cab_todas = sorted({k for r in registros for k in r})
    c_email, c_fone = colunas(cab_todas, "resposta da API")
    print(f"API da DDM: {len(registros)} registros em {paginas} página(s)")
    return registros, c_email, c_fone


SEGURO = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def ler_sftp(cliente):
    """Arquivo do dia na pasta SFTP da DDM. Só ls e get; o arquivo vive numa pasta 0700 apagada no fim."""
    carregar_env()
    var = "DDM_SFTP_ARQUIVO_" + cliente.upper().replace("-", "_")
    padrao = os.environ.get(var) or die(f"{var} ausente em ~/.hermes/.env")
    host = os.environ.get("DDM_SFTP_HOST") or die("DDM_SFTP_HOST ausente em ~/.hermes/.env")
    usuario = os.environ.get("DDM_SFTP_USUARIO") or die("DDM_SFTP_USUARIO ausente em ~/.hermes/.env")
    porta = os.environ.get("DDM_SFTP_PORTA", "22")
    chave = os.path.expanduser(os.environ.get("DDM_SFTP_CHAVE", "~/.ssh/ddm_sftp"))
    idade_max = float(os.environ.get("DDM_SFTP_IDADE_MAX_H", "30"))
    if not (SEGURO.match(host) and SEGURO.match(usuario) and porta.isdigit()):
        die("DDM_SFTP_HOST, DDM_SFTP_USUARIO ou DDM_SFTP_PORTA com caracteres inválidos")
    if not os.path.isfile(chave):
        die(f"chave SFTP não encontrada ({chave}); crie com: ssh-keygen -t ed25519 -N '' -f ~/.ssh/ddm_sftp")
    remoto = time.strftime(padrao) if "%" in padrao else padrao
    if any(c in remoto for c in '"\\\n\r') or not remoto.strip():
        die(f"{var} com caracteres inválidos")
    hosts = os.path.expanduser("~/.hermes/ddm_sftp_known_hosts")
    os.makedirs(os.path.dirname(hosts), exist_ok=True)
    cmd = ["sftp", "-F", "none", "-P", porta, "-i", chave,
           "-o", "IdentitiesOnly=yes", "-o", "PasswordAuthentication=no", "-o", "KbdInteractiveAuthentication=no",
           "-o", f"UserKnownHostsFile={hosts}", "-o", "StrictHostKeyChecking=accept-new",
           "-o", "ConnectTimeout=20", "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=4",
           "-o", "LogLevel=ERROR", "-b", "-", f"{usuario}@{host}"]

    def rodar(lote):
        try:
            r = subprocess.run(cmd, input=lote, capture_output=True, text=True, timeout=600)
        except FileNotFoundError:
            die("comando sftp não encontrado neste computador")
        except subprocess.TimeoutExpired:
            die("SFTP da DDM não respondeu em 10 minutos")
        if r.returncode != 0:
            err = r.stderr
            if "IDENTIFICATION HAS CHANGED" in err or "Host key verification failed" in err:
                die("a chave do servidor SFTP mudou desde a 1ª conexão; parado. Confirme com o Jair antes de apagar "
                    "~/.hermes/ddm_sftp_known_hosts")
            if "Permission denied" in err:
                die("o servidor SFTP recusou a chave (Jair ainda não liberou ~/.ssh/ddm_sftp.pub para esse usuário?)")
            if "Connection refused" in err or "timed out" in err or "Could not resolve" in err:
                die("servidor SFTP inacessível (endereço, porta ou bloqueio por IP)")
            if "not found" in err or "No such file" in err:
                die("arquivo não encontrado na pasta SFTP da DDM (a base de hoje ainda não chegou ou o caminho mudou)")
            linhas = [l for l in err.strip().splitlines() if l.strip() and not l.startswith("Connection closed")]
            die("SFTP da DDM falhou: " + ((linhas or ["sem detalhe"])[-1][:300]))
        return r.stdout

    if any(c in remoto for c in "*?["):
        # entre aspas o sftp não expande o *; sem aspas, espaço precisa de barra
        saida = rodar("ls -1t " + re.sub(r"([\s'])", r"\\\1", remoto) + "\n")
        nomes = [l.rstrip("\r") for l in saida.splitlines() if l.strip() and not l.startswith("sftp>")]
        if not nomes:
            die("nenhum arquivo do dia na pasta SFTP da DDM")
        remoto = nomes[0]
        if any(c in remoto for c in '"\\\n\r'):
            die("nome de arquivo inesperado na pasta SFTP")
    pasta = tempfile.mkdtemp(prefix="ddm-sftp-")
    try:
        local = os.path.join(pasta, "base")
        rodar(f'get -p "{remoto}" "{local}"\n')
        idade_h = (time.time() - os.stat(local).st_mtime) / 3600
        if idade_h > idade_max:
            die(f"o arquivo do SFTP tem {idade_h:.0f} h (limite {idade_max:.0f} h); base de hoje ainda não chegou — nada enviado")
        with open(local, "rb") as f:
            bruto = f.read()
    finally:
        shutil.rmtree(pasta, ignore_errors=True)
    lido = linhas_de_csv(decodificar(bruto), "arquivo do SFTP")
    print(f"SFTP da DDM: arquivo de {time.strftime('%Y-%m-%d %H:%M', time.localtime(time.time() - idade_h * 3600))} "
          f"({idade_h:.1f} h atrás) · {len(lido[0])} linhas")
    return lido


def pessoas(caminho=None, lido=None):
    """Lista de (email_hash|'', [fone_hash...]) por linha válida + contagens."""
    linhas, c_email, c_fone = lido or ler_csv(caminho)
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
    fonte = ap.add_mutually_exclusive_group(required=True)
    fonte.add_argument("--base", help="CSV do CRM com quem está em aberto hoje")
    fonte.add_argument("--api", action="store_true", help="puxa a base do dia do sistema da DDM (DDM_API_URL_<CLIENTE>)")
    fonte.add_argument("--sftp", action="store_true", help="baixa o arquivo do dia da pasta SFTP da DDM (DDM_SFTP_ARQUIVO_<CLIENTE>)")
    ap.add_argument("--excluir", help="CSV com quem pagou/fechou acordo desde a exportação (opcional)")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--dry-run", action="store_true")
    g.add_argument("--mock", action="store_true")
    g.add_argument("--executar", action="store_true")
    ap.add_argument("--forcar", action="store_true", help="aceita variação > 30%% (só depois do OK humano)")
    ap.add_argument("--gravar", action="store_true", help="atualiza o card do público no painel (dados/campanhas.json)")
    a = ap.parse_args()
    modo = "executar" if a.executar else ("mock" if a.mock else "dry-run")

    if a.api:
        base, invalidas, total = pessoas(lido=ler_api(a.cliente))
    elif a.sftp:
        base, invalidas, total = pessoas(lido=ler_sftp(a.cliente))
    else:
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
        "cliente": a.cliente, "modo": modo, "fonte": "api" if a.api else ("sftp" if a.sftp else "csv"), "ultima_sync": time.strftime("%Y-%m-%dT%H:%M"),
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
