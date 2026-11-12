<?php
// Quem está logado (usado pelo painel para mostrar o nome e o botão Sair).
declare(strict_types=1);
require __DIR__ . '/nucleo.php';

$u = ddm_exigir_login();
session_write_close();
ddm_cabecalhos();
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'nome' => $u['nome'] ?? $u['email'],
    'email' => $u['email'],
    'admin' => ($u['papel'] ?? '') === 'admin',
], JSON_UNESCAPED_UNICODE);
