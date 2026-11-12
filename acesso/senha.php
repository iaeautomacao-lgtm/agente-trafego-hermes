<?php
declare(strict_types=1);
require __DIR__ . '/nucleo.php';

$u = ddm_exigir_login(false, true);
$email = $u['email'];
$erro = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    if (!ddm_csrf_ok()) $erro = 'A página ficou aberta muito tempo. Tente de novo.';
    else {
        $erro = (string)ddm_trocar_senha($u, (string)($_POST['atual'] ?? ''), (string)($_POST['nova'] ?? ''), (string)($_POST['confirma'] ?? ''));
        if ($erro === '') ddm_ir('/');
    }
}

$temp = !empty($u['trocar_senha']);
ddm_pagina('Trocar senha', '
<div class="card">
  <h1>' . ($temp ? 'Crie sua senha' : 'Trocar senha') . '</h1>
  <p class="mute" style="margin:0 0 6px">' . ($temp ? 'Você entrou com uma senha temporária. Escolha uma senha só sua para continuar.' : h($email)) . '</p>
  ' . ($erro ? '<p class="msg erro" role="alert">' . h($erro) . '</p>' : '') . '
  <form method="post" action="/acesso/senha.php">
    <input type="hidden" name="csrf" value="' . h(ddm_csrf()) . '">
    <input type="text" name="usuario" value="' . h($email) . '" autocomplete="username" hidden>
    <label for="atual">' . ($temp ? 'Senha temporária' : 'Senha atual') . '</label>
    <input id="atual" name="atual" type="password" required autocomplete="current-password">
    <label for="nova">Senha nova (mínimo ' . DDM_SENHA_MIN . ' caracteres)</label>
    <input id="nova" name="nova" type="password" required minlength="' . DDM_SENHA_MIN . '" autocomplete="new-password">
    <label for="confirma">Repita a senha nova</label>
    <input id="confirma" name="confirma" type="password" required minlength="' . DDM_SENHA_MIN . '" autocomplete="new-password">
    <button class="btn full" type="submit">Salvar senha</button>
  </form>
  <p class="aviso"><a href="/acesso/sair.php">Sair</a>' . ($temp ? '' : ' · <a href="/">Voltar ao painel</a>') . '</p>
</div>');
