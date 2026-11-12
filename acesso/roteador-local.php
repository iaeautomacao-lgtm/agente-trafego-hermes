<?php
// Só para testar no computador (o servidor usa o .htaccess):
//   DDM_ACESSO_DIR=/tmp/ddm-acesso php -S 127.0.0.1:8099 acesso/roteador-local.php
// Faz o mesmo papel das regras do .htaccess.
$p = (string)parse_url((string)$_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/acesso/(entrar|sair|senha|admin|api)\.php$#', $p, $m)) { require __DIR__ . '/' . $m[1] . '.php'; return true; }
if ($p === '/assets/ddm-marca.png') return false;   // servidor embutido entrega o arquivo
require __DIR__ . '/portao.php';
return true;
