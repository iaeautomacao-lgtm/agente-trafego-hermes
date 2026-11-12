<?php
declare(strict_types=1);
require __DIR__ . '/nucleo.php';

ddm_expurgo_diario();
$voltar = ddm_voltar_seguro($_GET['voltar'] ?? $_POST['voltar'] ?? '/');
if (ddm_usuario_atual()) ddm_ir($voltar);

$erro = '';
$email = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $email = strtolower(trim(substr((string)($_POST['email'] ?? ''), 0, 254)));
    $senha = substr((string)($_POST['senha'] ?? ''), 0, 1024);
    if (!ddm_csrf_ok()) {
        ddm_registrar('login_falha', ['usuario' => null, 'motivo' => 'formulario_expirado']);
        $erro = 'A página ficou aberta muito tempo. Tente de novo.';
    } elseif (ddm_bloqueado($email)) {
        $us = ddm_usuarios();
        ddm_registrar('login_falha', ['usuario' => isset($us[$email]) ? $email : null, 'motivo' => 'bloqueado_por_tentativas']);
        $erro = 'Muitas tentativas. Espere 15 minutos e tente de novo.';
    } else {
        $us = ddm_usuarios();
        $u = $us[$email] ?? null;
        // mesmo custo de tempo com ou sem usuário (não revela quais e-mails existem)
        $ok = password_verify($senha, $u['hash'] ?? '$2y$10$LE0Ou3w4mrYjZT2gbUkhKuFRrL6HpusZfymMi9RHZcik0n/tpTQQO');
        if ($ok && $u && !empty($u['ativo'])) {
            ddm_tentativa($email, true);
            ddm_entrar($email, $u);
            if (password_needs_rehash($u['hash'], PASSWORD_DEFAULT)) {
                $novo = password_hash($senha, PASSWORD_DEFAULT);
                ddm_json_alterar('usuarios.json', function (array &$t) use ($email, $novo) { $t[$email]['hash'] = $novo; });
            }
            ddm_json_alterar('usuarios.json', function (array &$t) use ($email) { $t[$email]['ultimo_acesso'] = gmdate('Y-m-d\TH:i:s\Z'); });
            ddm_registrar('login_ok', ['usuario' => $email]);
            ddm_ir(!empty($u['trocar_senha']) ? '/acesso/senha.php' : $voltar);
        }
        ddm_tentativa($email, false);
        ddm_registrar('login_falha', ['usuario' => $u ? $email : null,
            'motivo' => !$u ? 'usuario_desconhecido' : (empty($u['ativo']) ? 'usuario_desativado' : 'senha_incorreta')]);
        $erro = 'E-mail ou senha incorretos.';
    }
}

$msg = '';
if ($erro) $msg = '<p class="msg erro" role="alert">' . h($erro) . '</p>';
elseif (isset($_GET['saiu'])) $msg = '<p class="msg ok">Você saiu do painel.</p>';
elseif (isset($_GET['expirou'])) $msg = '<p class="msg erro">Sua sessão terminou. Entre de novo.</p>';

ddm_pagina('Entrar', '
<div class="card">
  <h1>Entrar</h1>
  <p class="mute" style="margin:0 0 6px">Painel do tráfego pago do Grupo DDM. Acesso só para pessoas autorizadas.</p>
  ' . $msg . '
  <form method="post" action="/acesso/entrar.php" autocomplete="on">
    <input type="hidden" name="csrf" value="' . h(ddm_csrf()) . '">
    <input type="hidden" name="voltar" value="' . h($voltar) . '">
    <label for="email">E-mail</label>
    <input id="email" name="email" type="email" required autofocus autocomplete="username" value="' . h($email) . '">
    <label for="senha">Senha</label>
    <input id="senha" name="senha" type="password" required autocomplete="current-password">
    <button class="btn full" type="submit">Entrar</button>
  </form>
  <p class="aviso"><strong>Privacidade.</strong> Em cada acesso registramos o e-mail usado, a data e a hora, o endereço IP, a porta de origem e o navegador.
  Usamos esses dados só para a segurança do painel e para cumprir o Marco Civil da Internet (Lei 12.965/2014, art. 15).
  Eles ficam guardados por 6 meses e depois são apagados, e só os administradores do Grupo DDM podem vê-los.
  Veja a <a href="' . h(DDM_POLITICA) . '" target="_blank" rel="noopener">política de privacidade</a>.</p>
</div>');
