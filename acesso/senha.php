<?php
declare(strict_types=1);
require __DIR__ . '/nucleo.php';

$u = ddm_exigir_login(false, true);
$email = $u['email'];
$erro = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $atual = substr((string)($_POST['atual'] ?? ''), 0, 1024);
    $nova = substr((string)($_POST['nova'] ?? ''), 0, 1024);
    $conf = substr((string)($_POST['confirma'] ?? ''), 0, 1024);
    if (!ddm_csrf_ok()) $erro = 'A página ficou aberta muito tempo. Tente de novo.';
    elseif (!password_verify($atual, (string)$u['hash'])) {
        ddm_registrar('senha_troca_falha', ['usuario' => $email, 'motivo' => 'senha_atual_incorreta']);
        $erro = 'A senha atual não confere.';
    } elseif (mb_strlen($nova) < DDM_SENHA_MIN) $erro = 'A senha nova precisa ter pelo menos ' . DDM_SENHA_MIN . ' caracteres.';
    elseif ($nova !== $conf) $erro = 'A confirmação não é igual à senha nova.';
    elseif ($nova === $atual) $erro = 'A senha nova precisa ser diferente da atual.';
    elseif (stripos($nova, explode('@', $email)[0]) !== false) $erro = 'A senha não pode conter o seu e-mail.';
    else {
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
        ddm_ir('/');
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
