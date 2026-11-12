<?php
/*
 * Portão do site: o .htaccess manda TODO pedido para cá (menos as páginas de acesso).
 * Sem login → página de entrar (ou 401). Com login → entrega o arquivo, se ele for do painel.
 */
declare(strict_types=1);
require __DIR__ . '/nucleo.php';

$u = ddm_exigir_login();
session_write_close();   // não segura a sessão enquanto entrega arquivos

$caminho = (string)(parse_url((string)($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/');
$rel = rawurldecode($caminho);
if (strpos($rel, "\0") !== false) { http_response_code(400); exit; }
$rel = ltrim($rel, '/');
if ($rel === '' || substr($rel, -1) === '/') $rel .= 'index.html';

function nao_achou(): void {
    ddm_cabecalhos();
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Não encontrado.';
    exit;
}

// nada de arquivo oculto (.git, .env, .htaccess) nem das pastas internas
$partes = explode('/', $rel);
foreach ($partes as $p) if ($p === '' || $p[0] === '.' || $p === '..') nao_achou();
if (in_array($partes[0], ['acesso', 'scripts', 'dashboard', 'AGENTES DE TRAFEGO PAGO'], true)) nao_achou();

$tipos = [
    'html' => 'text/html; charset=utf-8', 'json' => 'application/json; charset=utf-8', 'md' => 'text/markdown; charset=utf-8',
    'txt' => 'text/plain; charset=utf-8', 'css' => 'text/css; charset=utf-8', 'js' => 'text/javascript; charset=utf-8',
    'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'webp' => 'image/webp', 'gif' => 'image/gif',
    'svg' => 'image/svg+xml', 'ico' => 'image/x-icon', 'woff2' => 'font/woff2',
];
$ext = strtolower(pathinfo($rel, PATHINFO_EXTENSION));
if (!isset($tipos[$ext])) nao_achou();

$arquivo = realpath(DDM_RAIZ . '/' . $rel);
if ($arquivo === false || strpos($arquivo, DDM_RAIZ . '/') !== 0 || !is_file($arquivo)) nao_achou();

ddm_cabecalhos();
header('Content-Type: ' . $tipos[$ext]);
header('Content-Length: ' . filesize($arquivo));
if ($ext === 'svg') header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'");
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') readfile($arquivo);
