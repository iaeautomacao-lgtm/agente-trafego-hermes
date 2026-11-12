<?php
// A administração agora fica no painel: Configurações → Usuários / Registro de acessos.
declare(strict_types=1);
require __DIR__ . '/nucleo.php';

ddm_exigir_login(true);
ddm_cabecalhos();
ddm_ir('/#/config?aba=usuarios');
