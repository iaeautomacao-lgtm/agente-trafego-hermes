<?php
/*
 * Usuários do painel pela linha de comando (cPanel → Terminal), na pasta do site:
 *   php acesso/usuarios.php criar <email> "<Nome>" [admin]   → mostra a senha temporária uma vez
 *   php acesso/usuarios.php senha <email>                     → nova senha temporária
 *   php acesso/usuarios.php desativar <email> | reativar <email>
 *   php acesso/usuarios.php listar
 *   php acesso/usuarios.php conferir                          → confere a integridade do registro de acessos
 */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/nucleo.php';

$a = $argv;
$cmd = $a[1] ?? '';
$por = 'linha de comando (' . (get_current_user() ?: '?') . ')';
try {
    switch ($cmd) {
        case 'criar':
            if (empty($a[2]) || empty($a[3])) throw new InvalidArgumentException('uso: criar <email> "<Nome>" [admin]');
            $t = ddm_usuario_definir($a[2], $a[3], ($a[4] ?? '') === 'admin' ? 'admin' : 'usuario', $por, true);
            echo "Criado: {$a[2]}\nSenha temporária (anote agora; no 1º acesso a pessoa cria a própria): $t\n";
            break;
        case 'senha':
            if (empty($a[2])) throw new InvalidArgumentException('uso: senha <email>');
            $t = ddm_usuario_definir($a[2], null, null, $por, false);
            echo "Nova senha temporária de {$a[2]}: $t\n";
            break;
        case 'desativar':
        case 'reativar':
            if (empty($a[2])) throw new InvalidArgumentException("uso: $cmd <email>");
            ddm_usuario_ativar(strtolower($a[2]), $cmd === 'reativar', $por);
            echo "OK: {$a[2]} " . ($cmd === 'reativar' ? 'reativado' : 'desativado') . "\n";
            break;
        case 'listar':
            foreach (ddm_usuarios() as $em => $u) {
                printf("%-36s %-7s %-10s último acesso: %s\n", $em, $u['papel'] ?? '', !empty($u['ativo']) ? 'ativo' : 'desativado', $u['ultimo_acesso'] ?? '—');
            }
            echo 'Pasta privada: ' . ddm_dir_privado() . "\n";
            break;
        case 'conferir':
            $l = ddm_registro_ler();
            $q = ddm_registro_conferir($l);
            echo $q === null ? 'Registro íntegro: ' . count($l) . " linhas\n" : "ALTERADO a partir da linha $q\n";
            exit($q === null ? 0 : 1);
        default:
            fwrite(STDERR, "comandos: criar, senha, desativar, reativar, listar, conferir\n");
            exit(2);
    }
} catch (InvalidArgumentException $e) {
    fwrite(STDERR, 'ERRO: ' . $e->getMessage() . "\n");
    exit(2);
}
