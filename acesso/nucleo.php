<?php
/*
 * Núcleo do acesso ao painel: sessão, usuários e registro de acessos (LGPD + Marco Civil).
 * Usuários, registro e sessões ficam FORA do site e FORA do git, em ~/.ddm-trafego-acesso/
 * (ou em DDM_ACESSO_DIR). Nada aqui guarda ou registra senha.
 * Compatível com PHP 7.4+.
 */
declare(strict_types=1);

const DDM_RETENCAO_DIAS = 183;   // ~6 meses: Marco Civil art. 15 (prazo a confirmar com o jurídico)
const DDM_OCIOSO_SEG = 1800;     // 30 min sem uso → sessão encerra
const DDM_MAXIMO_SEG = 43200;    // 12 h de sessão no máximo
const DDM_JANELA_SEG = 900;      // janela de contagem de falhas: 15 min
const DDM_FALHAS_USUARIO = 5;    // falhas por e-mail na janela → bloqueia o e-mail
const DDM_FALHAS_IP = 20;        // falhas por IP na janela → bloqueia o IP
const DDM_SENHA_MIN = 12;
const DDM_POLITICA = 'https://grupoddm.tech/politica-de-privacidade';

define('DDM_RAIZ', (string)realpath(__DIR__ . '/..'));

// ---------- pasta privada ----------

function ddm_falha_config(string $msg): void {
    if (PHP_SAPI === 'cli') { fwrite(STDERR, "ERRO: $msg\n"); exit(2); }
    error_log("ddm-acesso: $msg");
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Acesso indisponível: configuração do servidor. Avise o administrador.";
    exit;
}

function ddm_dir_privado(): string {
    static $d = null;
    if ($d !== null) return $d;
    $d = (string)(getenv('DDM_ACESSO_DIR') ?: '');
    if ($d === '') {
        $home = '';
        if (function_exists('posix_getpwuid') && function_exists('posix_geteuid')) {
            $pw = posix_getpwuid(posix_geteuid());
            $home = is_array($pw) ? (string)($pw['dir'] ?? '') : '';
        }
        if ($home === '') $home = (string)(getenv('HOME') ?: '');
        if ($home === '') ddm_falha_config('pasta do usuário do servidor não encontrada; defina DDM_ACESSO_DIR');
        $d = rtrim($home, '/') . '/.ddm-trafego-acesso';
    }
    if (!is_dir($d) && !@mkdir($d, 0700, true)) ddm_falha_config('não foi possível criar a pasta de acesso');
    $real = (string)realpath($d);
    if (strpos($real . '/', DDM_RAIZ . '/') === 0) ddm_falha_config('a pasta de acesso não pode ficar dentro do site');
    @chmod($real, 0700);
    if (!is_file("$real/.htaccess")) @file_put_contents("$real/.htaccess", "Require all denied\n");
    $d = $real;
    return $d;
}

function ddm_json_ler(string $nome): array {
    $p = ddm_dir_privado() . "/$nome";
    if (!is_file($p)) return [];
    $f = fopen($p, 'r');
    if (!$f) return [];
    flock($f, LOCK_SH);
    $t = stream_get_contents($f);
    flock($f, LOCK_UN);
    fclose($f);
    $j = json_decode($t ?: '[]', true);
    return is_array($j) ? $j : [];
}

/** Lê, altera ($fn recebe o array por referência) e grava com trava exclusiva. Devolve o retorno de $fn. */
function ddm_json_alterar(string $nome, callable $fn) {
    $p = ddm_dir_privado() . "/$nome";
    $f = fopen($p, 'c+');
    if (!$f) ddm_falha_config("não foi possível abrir $nome");
    @chmod($p, 0600);
    flock($f, LOCK_EX);
    $j = json_decode(stream_get_contents($f) ?: '[]', true);
    $d = is_array($j) ? $j : [];
    $r = $fn($d);
    ftruncate($f, 0);
    rewind($f);
    fwrite($f, (string)json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    fflush($f);
    flock($f, LOCK_UN);
    fclose($f);
    return $r;
}

// ---------- registro de acessos (JSON por linha, encadeado por hash) ----------

function ddm_log_path(): string { return ddm_dir_privado() . '/acessos.jsonl'; }

function ddm_ultima_linha($f): string {
    $tam = fstat($f)['size'] ?? 0;
    if ($tam <= 0) return '';
    $ler = (int)min($tam, 16384);
    fseek($f, -$ler, SEEK_END);
    $linhas = preg_split("/\n/", rtrim((string)fread($f, $ler), "\n"));
    return (string)end($linhas);
}

function ddm_hash_linha(array $linha): string {
    unset($linha['hash']);
    return hash('sha256', (string)json_encode($linha, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

/**
 * Um evento por linha: quando (UTC e Brasília), quem, de onde (IP + porta de origem), navegador.
 * Nunca recebe senha. $extra pode trazer 'usuario', 'motivo', 'alvo', etc.
 */
function ddm_registrar(string $evento, array $extra = []): void {
    $agora = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $usuario = array_key_exists('usuario', $extra) ? $extra['usuario'] : ($_SESSION['ddm']['email'] ?? null);
    unset($extra['usuario']);
    $sid = session_status() === PHP_SESSION_ACTIVE ? session_id() : '';
    $linha = [
        'em_utc' => $agora->format('Y-m-d\TH:i:s.v\Z'),
        'em_brasilia' => $agora->setTimezone(new DateTimeZone('America/Sao_Paulo'))->format('Y-m-d\TH:i:sP'),
        'evento' => $evento,
        'usuario' => $usuario,
        'ip' => PHP_SAPI === 'cli' ? 'linha de comando' : ($_SERVER['REMOTE_ADDR'] ?? null),
        'porta' => isset($_SERVER['REMOTE_PORT']) ? (int)$_SERVER['REMOTE_PORT'] : null,
        'navegador' => PHP_SAPI === 'cli' ? null : mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 300),
        'sessao' => $sid !== '' ? substr(hash('sha256', $sid), 0, 16) : null,
    ] + $extra;
    $f = fopen(ddm_log_path(), 'c+');
    if (!$f) { error_log('ddm-acesso: registro de acessos indisponível'); return; }
    @chmod(ddm_log_path(), 0600);
    flock($f, LOCK_EX);
    $ult = json_decode(ddm_ultima_linha($f), true);
    $linha['anterior'] = is_array($ult) ? ($ult['hash'] ?? null) : null;
    $linha['hash'] = ddm_hash_linha($linha);
    fseek($f, 0, SEEK_END);
    fwrite($f, json_encode($linha, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
    fflush($f);
    flock($f, LOCK_UN);
    fclose($f);
}

/** Todas as linhas do registro (mais antigas primeiro). */
function ddm_registro_ler(): array {
    $p = ddm_log_path();
    if (!is_file($p)) return [];
    $f = fopen($p, 'r');
    flock($f, LOCK_SH);
    $out = [];
    while (($l = fgets($f)) !== false) {
        $j = json_decode($l, true);
        if (is_array($j)) $out[] = $j;
    }
    flock($f, LOCK_UN);
    fclose($f);
    return $out;
}

/** Confere a cadeia de hashes. Devolve null se íntegra, ou o número da 1ª linha alterada. */
function ddm_registro_conferir(array $linhas): ?int {
    $ant = null;
    foreach ($linhas as $i => $l) {
        if ($i > 0 && ($l['anterior'] ?? null) !== $ant) return $i + 1;
        if (ddm_hash_linha($l) !== ($l['hash'] ?? '')) return $i + 1;
        $ant = $l['hash'];
    }
    return null;
}

/** Uma vez por dia: apaga registros com mais de DDM_RETENCAO_DIAS e sessões velhas. */
function ddm_expurgo_diario(): void {
    $marca = ddm_dir_privado() . '/ultimo-expurgo';
    $hoje = gmdate('Y-m-d');
    if (is_file($marca) && trim((string)file_get_contents($marca)) === $hoje) return;
    @file_put_contents($marca, $hoje);
    $corte = gmdate('Y-m-d\TH:i:s', time() - DDM_RETENCAO_DIAS * 86400);
    $removidas = 0;
    $p = ddm_log_path();
    if (is_file($p)) {
        $f = fopen($p, 'c+');
        flock($f, LOCK_EX);
        $manter = [];
        while (($l = fgets($f)) !== false) {
            $j = json_decode($l, true);
            if (is_array($j) && substr((string)$j['em_utc'], 0, 19) < $corte) { $removidas++; continue; }
            $manter[] = $l;
        }
        if ($removidas) { ftruncate($f, 0); rewind($f); fwrite($f, implode('', $manter)); fflush($f); }
        flock($f, LOCK_UN);
        fclose($f);
    }
    foreach (glob(ddm_dir_privado() . '/sessoes/sess_*') ?: [] as $s) {
        if (@filemtime($s) < time() - DDM_MAXIMO_SEG) @unlink($s);
    }
    if ($removidas) ddm_registrar('expurgo', ['usuario' => null, 'removidas' => $removidas, 'anteriores_a' => $corte . 'Z']);
}

// ---------- usuários ----------

function ddm_usuarios(): array { return ddm_json_ler('usuarios.json'); }

function ddm_senha_temporaria(): string {
    $abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $s = '';
    for ($i = 0; $i < 16; $i++) {
        if ($i && $i % 4 === 0) $s .= '-';
        $s .= $abc[random_int(0, strlen($abc) - 1)];
    }
    return $s;
}

function ddm_email_valido(string $e): bool {
    return strlen($e) <= 254 && filter_var($e, FILTER_VALIDATE_EMAIL) !== false;
}

/** Cria ou redefine: devolve a senha temporária (mostrada uma vez; o usuário troca no 1º acesso). */
function ddm_usuario_definir(string $email, ?string $nome, ?string $papel, string $por, bool $novo): string {
    $email = strtolower(trim($email));
    if (!ddm_email_valido($email)) throw new InvalidArgumentException('e-mail inválido');
    $temp = ddm_senha_temporaria();
    $hash = password_hash($temp, PASSWORD_DEFAULT);
    $erro = ddm_json_alterar('usuarios.json', function (array &$us) use ($email, $nome, $papel, $por, $novo, $hash) {
        if ($novo && isset($us[$email])) return 'já existe';
        if (!$novo && !isset($us[$email])) return 'não existe';
        $u = $us[$email] ?? ['criado_em' => gmdate('Y-m-d\TH:i:s\Z'), 'criado_por' => $por, 'versao' => 0];
        if ($nome !== null) $u['nome'] = mb_substr(trim($nome), 0, 80);
        if ($papel !== null) $u['papel'] = $papel === 'admin' ? 'admin' : 'usuario';
        $u['hash'] = $hash;
        $u['trocar_senha'] = true;
        $u['ativo'] = true;
        $u['versao'] = (int)($u['versao'] ?? 0) + 1;   // derruba sessões abertas
        $us[$email] = $u;
        return null;
    });
    if ($erro) throw new InvalidArgumentException("usuário $erro");
    ddm_registrar($novo ? 'usuario_criado' : 'senha_redefinida', ['usuario' => $por, 'alvo' => $email]);
    return $temp;
}

function ddm_usuario_ativar(string $email, bool $ativo, string $por): void {
    $ok = ddm_json_alterar('usuarios.json', function (array &$us) use ($email, $ativo) {
        if (!isset($us[$email])) return false;
        $us[$email]['ativo'] = $ativo;
        $us[$email]['versao'] = (int)($us[$email]['versao'] ?? 0) + 1;
        return true;
    });
    if (!$ok) throw new InvalidArgumentException('usuário não existe');
    ddm_registrar($ativo ? 'usuario_reativado' : 'usuario_desativado', ['usuario' => $por, 'alvo' => $email]);
}

/** Troca a senha do próprio usuário. Devolve a mensagem de erro, ou null se trocou (e mantém a sessão atual válida). */
function ddm_trocar_senha(array $u, string $atual, string $nova, string $conf): ?string {
    $email = (string)$u['email'];
    if (!password_verify(substr($atual, 0, 1024), (string)$u['hash'])) {
        ddm_registrar('senha_troca_falha', ['usuario' => $email, 'motivo' => 'senha_atual_incorreta']);
        return 'A senha atual não confere.';
    }
    if (mb_strlen($nova) < DDM_SENHA_MIN) return 'A senha nova precisa ter pelo menos ' . DDM_SENHA_MIN . ' caracteres.';
    if (strlen($nova) > 1024) return 'Senha longa demais.';
    if ($nova !== $conf) return 'A confirmação não é igual à senha nova.';
    if ($nova === $atual) return 'A senha nova precisa ser diferente da atual.';
    if (stripos($nova, explode('@', $email)[0]) !== false) return 'A senha não pode conter o seu e-mail.';
    $hash = password_hash($nova, PASSWORD_DEFAULT);
    $versao = ddm_json_alterar('usuarios.json', function (array &$t) use ($email, $hash) {
        $t[$email]['hash'] = $hash;
        $t[$email]['trocar_senha'] = false;
        $t[$email]['versao'] = (int)($t[$email]['versao'] ?? 0) + 1;   // derruba as outras sessões
        $t[$email]['senha_trocada_em'] = gmdate('Y-m-d\TH:i:s\Z');
        return $t[$email]['versao'];
    });
    session_regenerate_id(true);
    $_SESSION['ddm']['versao'] = $versao;
    ddm_registrar('senha_trocada', ['usuario' => $email]);
    return null;
}

function ddm_usuario_renomear(string $email, string $nome): void {
    $nome = trim($nome);
    if ($nome === '' || mb_strlen($nome) > 80) throw new InvalidArgumentException('nome vazio ou longo demais');
    ddm_json_alterar('usuarios.json', function (array &$t) use ($email, $nome) { if (isset($t[$email])) $t[$email]['nome'] = $nome; });
    ddm_registrar('nome_alterado', ['usuario' => $email]);
}

/** Filtra o registro por pessoa (quem fez ou quem sofreu a ação) e por dia (Brasília). */
function ddm_registro_filtrar(array $linhas, string $usuario, string $de, string $ate): array {
    return array_values(array_filter($linhas, function ($l) use ($usuario, $de, $ate) {
        $dia = substr((string)($l['em_brasilia'] ?? ''), 0, 10);
        if ($usuario !== '' && strtolower((string)($l['usuario'] ?? '')) !== $usuario && strtolower((string)($l['alvo'] ?? '')) !== $usuario) return false;
        if ($de !== '' && $dia < $de) return false;
        if ($ate !== '' && $dia > $ate) return false;
        return true;
    }));
}

function ddm_registro_csv(array $linhas): void {
    $campos = ['em_brasilia', 'em_utc', 'evento', 'usuario', 'alvo', 'motivo', 'ip', 'porta', 'navegador', 'sessao', 'hash'];
    ddm_cabecalhos();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="acessos-painel-' . gmdate('Ymd-His') . '.csv"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, $campos, ';');
    foreach ($linhas as $l) {
        $row = [];
        foreach ($campos as $c) {
            $v = is_scalar($l[$c] ?? null) ? (string)$l[$c] : '';
            if ($v !== '' && strpos('=+-@', $v[0]) !== false) $v = "'" . $v;   // evita fórmula no Excel
            $row[] = $v;
        }
        fputcsv($out, $row, ';');
    }
    fclose($out);
    exit;
}

// ---------- tentativas (bloqueio) ----------

function ddm_chaves_tentativa(string $email): array {
    return ['e:' . hash('sha256', $email), 'i:' . ($_SERVER['REMOTE_ADDR'] ?? '?')];
}

function ddm_bloqueado(string $email): bool {
    $t = ddm_json_ler('tentativas.json');
    [$ke, $ki] = ddm_chaves_tentativa($email);
    $desde = time() - DDM_JANELA_SEG;
    $n = function ($k) use ($t, $desde) { return count(array_filter($t[$k] ?? [], function ($x) use ($desde) { return $x > $desde; })); };
    return $n($ke) >= DDM_FALHAS_USUARIO || $n($ki) >= DDM_FALHAS_IP;
}

function ddm_tentativa(string $email, bool $ok): void {
    [$ke, $ki] = ddm_chaves_tentativa($email);
    ddm_json_alterar('tentativas.json', function (array &$t) use ($ke, $ki, $ok) {
        $desde = time() - DDM_JANELA_SEG;
        foreach ($t as $k => $v) {
            $t[$k] = array_values(array_filter((array)$v, function ($x) use ($desde) { return $x > $desde; }));
            if (!$t[$k]) unset($t[$k]);
        }
        if ($ok) { unset($t[$ke]); return; }
        $t[$ke][] = time();
        $t[$ki][] = time();
    });
}

// ---------- sessão ----------

function ddm_https(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (string)($_SERVER['SERVER_PORT'] ?? '') === '443';
}

function ddm_sessao(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $dir = ddm_dir_privado() . '/sessoes';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    session_save_path($dir);
    session_name('DDMSESS');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_trans_sid', '0');
    ini_set('session.gc_maxlifetime', (string)DDM_MAXIMO_SEG);
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => ddm_https(), 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

function ddm_encerrar_sessao(): void {
    $_SESSION = [];
    session_regenerate_id(true);
}

/** Usuário logado (com 'email') ou null. Encerra sessão ociosa, longa demais, de usuário desativado ou com senha trocada. */
function ddm_usuario_atual(): ?array {
    ddm_sessao();
    $s = $_SESSION['ddm'] ?? null;
    if (!is_array($s)) return null;
    $agora = time();
    $motivo = null;
    if ($agora - (int)$s['ultimo'] > DDM_OCIOSO_SEG) $motivo = 'ociosa';
    elseif ($agora - (int)$s['inicio'] > DDM_MAXIMO_SEG) $motivo = 'tempo_maximo';
    $u = ddm_usuarios()[$s['email']] ?? null;
    if (!$motivo && (!$u || empty($u['ativo']))) $motivo = 'usuario_desativado';
    if (!$motivo && (int)($u['versao'] ?? 0) !== (int)$s['versao']) $motivo = 'senha_ou_acesso_alterado';
    if ($motivo) {
        ddm_registrar('sessao_encerrada', ['usuario' => $s['email'], 'motivo' => $motivo]);
        ddm_encerrar_sessao();
        return null;
    }
    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
    if ($ip !== ($s['ip'] ?? null)) {
        ddm_registrar('ip_alterado', ['usuario' => $s['email'], 'ip_anterior' => $s['ip'] ?? null]);
        $_SESSION['ddm']['ip'] = $ip;
    }
    $_SESSION['ddm']['ultimo'] = $agora;
    return $u + ['email' => $s['email']];
}

function ddm_entrar(string $email, array $u): void {
    session_regenerate_id(true);
    $_SESSION['ddm'] = [
        'email' => $email, 'inicio' => time(), 'ultimo' => time(), 'versao' => (int)($u['versao'] ?? 0),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
    ];
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

function ddm_csrf(): string {
    ddm_sessao();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return (string)$_SESSION['csrf'];
}

function ddm_csrf_ok(): bool {
    return is_string($_POST['csrf'] ?? null) && !empty($_SESSION['csrf']) && hash_equals((string)$_SESSION['csrf'], $_POST['csrf']);
}

// ---------- respostas ----------

function ddm_cabecalhos(): void {
    header('X-Frame-Options: DENY');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    header('Cache-Control: no-store, private');
}

function ddm_pede_html(): bool {
    return ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' && strpos((string)($_SERVER['HTTP_ACCEPT'] ?? ''), 'text/html') !== false;
}

/** Só aceita caminho do próprio site (evita redirecionar para fora). */
function ddm_voltar_seguro(?string $v): string {
    $v = (string)$v;
    if ($v === '' || $v[0] !== '/' || (isset($v[1]) && ($v[1] === '/' || $v[1] === '\\')) || preg_match('/[\x00-\x1f]/', $v)
        || strpos($v, '/acesso/') === 0) return '/';
    return $v;
}

function ddm_ir(string $url): void {
    header('Location: ' . $url, true, 303);
    exit;
}

/** Exige login. Páginas HTML vão para o login; o resto recebe 401. */
function ddm_exigir_login(bool $admin = false, bool $permitir_troca_pendente = false): array {
    $u = ddm_usuario_atual();
    if (!$u) {
        ddm_cabecalhos();
        if (ddm_pede_html()) ddm_ir('/acesso/entrar.php?voltar=' . rawurlencode((string)($_SERVER['REQUEST_URI'] ?? '/')));
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo '{"erro":"login necessário"}';
        exit;
    }
    if (!empty($u['trocar_senha']) && !$permitir_troca_pendente) {
        ddm_cabecalhos();
        if (ddm_pede_html()) ddm_ir('/acesso/senha.php');
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo '{"erro":"troque a senha temporária"}';
        exit;
    }
    if ($admin && ($u['papel'] ?? '') !== 'admin') {
        ddm_cabecalhos();
        http_response_code(403);
        echo 'Só administradores.';
        exit;
    }
    return $u;
}

function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

/** Página simples no visual do painel (claro/escuro pelo sistema). */
function ddm_pagina(string $titulo, string $corpo, bool $larga = false): void {
    ddm_cabecalhos();
    header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    header('Content-Type: text/html; charset=utf-8');
    $w = $larga ? '1100px' : '420px';
    echo '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<title>' . h($titulo) . ' · Tráfego DDM</title>'
        . '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">'
        . '<style>
:root{--bg:#F5F5F7;--panel:#FFFFFF;--panel-2:#F6F6F8;--line:rgba(17,17,20,.08);--line-2:rgba(17,17,20,.16);--ink:#111114;--ink-2:#45464D;--mute:#8A8B93;--orange:#E8470A;--ok:#1E8E3E;--red:#D93025;--orange-soft:rgba(255,83,4,.10);--red-soft:rgba(217,48,37,.09);--ok-soft:rgba(30,142,62,.10);color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0D0D0F;--panel:#17171B;--panel-2:#1E1E23;--line:rgba(255,255,255,.08);--line-2:rgba(255,255,255,.16);--ink:#F5F5F7;--ink-2:#B5B6BD;--mute:#7C7D85;--orange:#FF6A1F;--ok:#5CC27A;--red:#F0604D;--orange-soft:rgba(255,90,10,.15);--red-soft:rgba(240,96,77,.13);--ok-soft:rgba(92,194,122,.13);color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 Inter,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:' . $w . ';margin:0 auto;padding:48px 16px}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:24px}.brand img{height:26px}.brand span{font:700 12px Montserrat,Inter,sans-serif;letter-spacing:.12em;color:var(--mute)}
h1{font:700 22px Montserrat,Inter,sans-serif;margin:0 0 6px}h2{font:600 16px Montserrat,Inter,sans-serif;margin:28px 0 10px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:22px}
label{display:block;font-weight:500;margin:14px 0 6px;color:var(--ink-2)}
input,select{width:100%;padding:10px 12px;border:1px solid var(--line-2);border-radius:8px;background:var(--panel);color:var(--ink);font:14px Inter,sans-serif}
input:focus,select:focus{outline:2px solid var(--orange);outline-offset:1px;border-color:var(--orange)}
.btn{display:inline-block;margin-top:18px;padding:10px 16px;border:0;border-radius:8px;background:var(--orange);color:#fff;font:600 14px Inter,sans-serif;cursor:pointer;text-decoration:none}
.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line-2)}.btn.s{margin:0;padding:6px 10px;font-size:12.5px}
.full{width:100%}.msg{padding:10px 12px;border-radius:8px;margin:0 0 14px}.erro{background:var(--red-soft);color:var(--red)}.ok{background:var(--ok-soft);color:var(--ok)}
.aviso{margin-top:18px;font-size:12.5px;color:var(--mute)}.aviso a,a{color:var(--orange)}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--mute);font-weight:500}
.scroll{overflow-x:auto}.mono{font-family:ui-monospace,Menlo,monospace;font-size:12.5px}.mute{color:var(--mute)}
.linha{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}.linha>div{flex:1;min-width:160px}
.temp{font:600 18px ui-monospace,Menlo,monospace;letter-spacing:.04em;background:var(--panel-2);padding:10px 12px;border-radius:8px;user-select:all}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
form.inline{display:inline}
</style></head><body><div class="wrap"><div class="brand"><img src="/assets/ddm-marca.png" alt="DDM"><span>TRÁFEGO PAGO · INTERNO</span></div>'
        . $corpo . '</div></body></html>';
    exit;
}
