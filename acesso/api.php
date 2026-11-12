<?php
/*
 * API da página Configurações do painel (JSON). Exige login; usuários e registro só para admin.
 * GET  ?acao=eu | usuarios | registro[&usuario&de&ate] | csv[&usuario&de&ate]
 * POST {"acao": "senha"|"nome"|"criar"|"redefinir"|"desativar"|"reativar", ...} com cabeçalho X-CSRF
 */
declare(strict_types=1);
require __DIR__ . '/nucleo.php';

function resp($dados, int $cod = 200): void {
    ddm_cabecalhos();
    http_response_code($cod);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function falha(string $msg, int $cod = 400): void { resp(['erro' => $msg], $cod); }

$u = ddm_exigir_login();
$eu = (string)$u['email'];
$admin = ($u['papel'] ?? '') === 'admin';
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($metodo === 'GET') {
    $acao = (string)($_GET['acao'] ?? '');
    if ($acao === 'eu') {
        $csrf = ddm_csrf();
        session_write_close();
        resp([
            'nome' => $u['nome'] ?? $eu, 'email' => $eu, 'papel' => $u['papel'] ?? 'usuario', 'admin' => $admin,
            'ultimo_acesso' => $u['ultimo_acesso'] ?? null, 'senha_trocada_em' => $u['senha_trocada_em'] ?? null,
            'ocioso_min' => intdiv(DDM_OCIOSO_SEG, 60), 'maximo_h' => intdiv(DDM_MAXIMO_SEG, 3600),
            'retencao_dias' => DDM_RETENCAO_DIAS, 'politica' => DDM_POLITICA, 'csrf' => $csrf,
        ]);
    }
    if (!$admin) falha('Só administradores.', 403);
    if ($acao === 'usuarios') {
        session_write_close();
        $lista = [];
        foreach (ddm_usuarios() as $em => $x) {
            $lista[] = ['email' => $em, 'nome' => $x['nome'] ?? '', 'papel' => $x['papel'] ?? 'usuario', 'ativo' => !empty($x['ativo']),
                'trocar_senha' => !empty($x['trocar_senha']), 'ultimo_acesso' => $x['ultimo_acesso'] ?? null, 'criado_em' => $x['criado_em'] ?? null];
        }
        usort($lista, function ($a, $b) { return strcmp($a['email'], $b['email']); });
        resp(['usuarios' => $lista, 'eu' => $eu]);
    }
    if ($acao === 'registro' || $acao === 'csv') {
        $f_u = strtolower(trim((string)($_GET['usuario'] ?? '')));
        $data = function ($k) { $v = (string)($_GET[$k] ?? ''); return preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) ? $v : ''; };
        $f_de = $data('de');
        $f_ate = $data('ate');
        $todas = ddm_registro_ler();
        $filtradas = ddm_registro_filtrar($todas, $f_u, $f_de, $f_ate);
        $filtro = ['usuario' => $f_u ?: null, 'de' => $f_de ?: null, 'ate' => $f_ate ?: null];
        if ($acao === 'csv') {
            ddm_registrar('registro_exportado', ['usuario' => $eu, 'filtro' => $filtro, 'linhas' => count($filtradas)]);
            session_write_close();
            ddm_registro_csv($filtradas);
        }
        ddm_registrar('registro_consultado', ['usuario' => $eu, 'filtro' => $filtro]);
        session_write_close();
        $campos = ['em_brasilia', 'evento', 'usuario', 'alvo', 'motivo', 'ip', 'porta', 'navegador', 'ip_anterior', 'removidas'];
        $mostrar = [];
        foreach (array_slice(array_reverse($filtradas), 0, 300) as $l) $mostrar[] = array_intersect_key($l, array_flip($campos));
        resp(['linhas' => $mostrar, 'total' => count($filtradas), 'total_geral' => count($todas),
            'integridade' => ddm_registro_conferir($todas), 'retencao_dias' => DDM_RETENCAO_DIAS]);
    }
    falha('Ação desconhecida.', 404);
}

if ($metodo !== 'POST') falha('Método não aceito.', 405);
$hdr = (string)($_SERVER['HTTP_X_CSRF'] ?? '');
if ($hdr === '' || empty($_SESSION['csrf']) || !hash_equals((string)$_SESSION['csrf'], $hdr)) falha('A página ficou aberta muito tempo. Recarregue e tente de novo.', 403);
$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) falha('Pedido inválido.');
$acao = (string)($in['acao'] ?? '');
$s = function ($k) use ($in) { return is_string($in[$k] ?? null) ? $in[$k] : ''; };

try {
    if ($acao === 'senha') {
        $erro = ddm_trocar_senha($u, $s('atual'), $s('nova'), $s('confirma'));
        if ($erro !== null) falha($erro);
        resp(['ok' => true]);
    }
    if ($acao === 'nome') {
        ddm_usuario_renomear($eu, $s('nome'));
        resp(['ok' => true]);
    }
    if (!$admin) falha('Só administradores.', 403);
    $alvo = strtolower(trim($s('email')));
    if ($acao === 'criar') {
        $temp = ddm_usuario_definir($alvo, $s('nome'), $s('papel') === 'admin' ? 'admin' : 'usuario', $eu, true);
        resp(['ok' => true, 'email' => $alvo, 'senha_temporaria' => $temp]);
    }
    if ($acao === 'redefinir') {
        resp(['ok' => true, 'email' => $alvo, 'senha_temporaria' => ddm_usuario_definir($alvo, null, null, $eu, false)]);
    }
    if ($acao === 'desativar' || $acao === 'reativar') {
        if ($alvo === $eu) falha('Você não pode desativar a própria conta.');
        ddm_usuario_ativar($alvo, $acao === 'reativar', $eu);
        resp(['ok' => true]);
    }
} catch (InvalidArgumentException $e) {
    falha(ucfirst($e->getMessage()) . '.');
}
falha('Ação desconhecida.', 404);
