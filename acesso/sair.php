<?php
declare(strict_types=1);
require __DIR__ . '/nucleo.php';

ddm_sessao();
if (!empty($_SESSION['ddm']['email'])) ddm_registrar('logout', ['usuario' => $_SESSION['ddm']['email']]);
ddm_encerrar_sessao();
ddm_cabecalhos();
ddm_ir('/acesso/entrar.php?saiu=1');
