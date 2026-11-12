<?php
// Administração: usuários e registro de acessos. Só papel "admin". Toda consulta ao registro também é registrada.
declare(strict_types=1);
require __DIR__ . '/nucleo.php';

$eu = ddm_exigir_login(true);
$meu = $eu['email'];
$aviso = '';
$temp = null;

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    if (!ddm_csrf_ok()) {
        $aviso = '<p class="msg erro">A página ficou aberta muito tempo. Tente de novo.</p>';
    } else {
        $acao = (string)($_POST['acao'] ?? '');
        $alvo = strtolower(trim((string)($_POST['email'] ?? '')));
        try {
            if ($acao === 'criar') {
                $temp = [$alvo, ddm_usuario_definir($alvo, (string)($_POST['nome'] ?? ''), (string)($_POST['papel'] ?? 'usuario'), $meu, true)];
            } elseif ($acao === 'redefinir') {
                $temp = [$alvo, ddm_usuario_definir($alvo, null, null, $meu, false)];
            } elseif ($acao === 'desativar' || $acao === 'reativar') {
                if ($alvo === $meu) throw new InvalidArgumentException('você não pode desativar a própria conta');
                ddm_usuario_ativar($alvo, $acao === 'reativar', $meu);
                $aviso = '<p class="msg ok">' . h($alvo) . ($acao === 'reativar' ? ' reativado.' : ' desativado; sessões abertas encerradas.') . '</p>';
            }
        } catch (InvalidArgumentException $e) {
            $aviso = '<p class="msg erro">' . h(ucfirst($e->getMessage())) . '.</p>';
        }
    }
}

$usuarios = ddm_usuarios();
ksort($usuarios);

// filtros do registro
$f_usuario = strtolower(trim((string)($_GET['usuario'] ?? '')));
$f_de = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($_GET['de'] ?? '')) ? $_GET['de'] : '';
$f_ate = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($_GET['ate'] ?? '')) ? $_GET['ate'] : '';
$todas = ddm_registro_ler();
$quebra = ddm_registro_conferir($todas);
$filtradas = array_values(array_filter($todas, function ($l) use ($f_usuario, $f_de, $f_ate) {
    $dia = substr((string)($l['em_brasilia'] ?? ''), 0, 10);
    if ($f_usuario !== '' && strtolower((string)($l['usuario'] ?? '')) !== $f_usuario && strtolower((string)($l['alvo'] ?? '')) !== $f_usuario) return false;
    if ($f_de !== '' && $dia < $f_de) return false;
    if ($f_ate !== '' && $dia > $f_ate) return false;
    return true;
}));
$filtro_txt = ['usuario' => $f_usuario ?: null, 'de' => $f_de ?: null, 'ate' => $f_ate ?: null];
$campos = ['em_brasilia', 'em_utc', 'evento', 'usuario', 'alvo', 'motivo', 'ip', 'porta', 'navegador', 'sessao', 'hash'];

if (($_GET['baixar'] ?? '') === 'csv') {
    ddm_registrar('registro_exportado', ['usuario' => $meu, 'filtro' => $filtro_txt, 'linhas' => count($filtradas)]);
    session_write_close();
    ddm_cabecalhos();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="acessos-painel-' . gmdate('Ymd-His') . '.csv"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, $campos, ';');
    foreach ($filtradas as $l) {
        $row = [];
        foreach ($campos as $c) {
            $v = is_scalar($l[$c] ?? null) ? (string)$l[$c] : '';
            if ($v !== '' && strpos('=+-@', $v[0]) !== false) $v = "'" . $v;   // evita fórmula no Excel
            $row[] = $v;
        }
        fputcsv($out, $row, ';');
    }
    fclose($out);
    exit;
}

ddm_registrar('registro_consultado', ['usuario' => $meu, 'filtro' => $filtro_txt]);

// ---------- usuários ----------
$linhas_u = '';
foreach ($usuarios as $em => $u) {
    $ativo = !empty($u['ativo']);
    $acoes = '<form class="inline" method="post"><input type="hidden" name="csrf" value="' . h(ddm_csrf()) . '"><input type="hidden" name="email" value="' . h($em) . '">'
        . '<button class="btn ghost s" name="acao" value="redefinir" type="submit">Nova senha temporária</button> ';
    if ($em !== $meu) $acoes .= '<button class="btn ghost s" name="acao" value="' . ($ativo ? 'desativar' : 'reativar') . '" type="submit">' . ($ativo ? 'Desativar' : 'Reativar') . '</button>';
    $acoes .= '</form>';
    $linhas_u .= '<tr><td>' . h($u['nome'] ?? '') . '<div class="mute">' . h($em) . '</div></td>'
        . '<td>' . (($u['papel'] ?? '') === 'admin' ? 'admin' : 'usuário') . '</td>'
        . '<td>' . ($ativo ? (!empty($u['trocar_senha']) ? 'aguardando 1º acesso' : 'ativo') : '<span style="color:var(--red)">desativado</span>') . '</td>'
        . '<td class="mono">' . h(isset($u['ultimo_acesso']) ? str_replace(['T', 'Z'], [' ', ' UTC'], $u['ultimo_acesso']) : '—') . '</td>'
        . '<td>' . $acoes . '</td></tr>';
}

$caixa_temp = '';
if ($temp) {
    $caixa_temp = '<div class="card" style="margin:0 0 18px;border-color:var(--orange)"><strong>Senha temporária de ' . h($temp[0]) . '</strong>'
        . '<p class="mute" style="margin:4px 0 10px">Aparece só agora. Passe para a pessoa por um canal privado; no primeiro acesso ela cria a própria senha.</p>'
        . '<div class="temp">' . h($temp[1]) . '</div></div>';
}

// ---------- registro ----------
$opts = '<option value="">Todos</option>';
foreach (array_keys($usuarios) as $em) $opts .= '<option value="' . h($em) . '"' . ($em === $f_usuario ? ' selected' : '') . '>' . h($em) . '</option>';
$mostrar = array_slice(array_reverse($filtradas), 0, 300);
$linhas_r = '';
foreach ($mostrar as $l) {
    $det = [];
    foreach (['alvo', 'motivo', 'ip_anterior', 'removidas'] as $k) if (isset($l[$k])) $det[] = $k . ': ' . h(is_scalar($l[$k]) ? $l[$k] : json_encode($l[$k]));
    $linhas_r .= '<tr><td class="mono">' . h(str_replace('T', ' ', substr((string)$l['em_brasilia'], 0, 19))) . '</td>'
        . '<td>' . h($l['evento'] ?? '') . ($det ? '<div class="mute">' . implode(' · ', $det) . '</div>' : '') . '</td>'
        . '<td>' . h($l['usuario'] ?? '—') . '</td>'
        . '<td class="mono">' . h(($l['ip'] ?? '') . (isset($l['porta']) ? ' :' . $l['porta'] : '')) . '</td>'
        . '<td class="mute" style="max-width:280px">' . h(mb_substr((string)($l['navegador'] ?? ''), 0, 120)) . '</td></tr>';
}
$integridade = $quebra === null
    ? '<span style="color:var(--ok)">íntegro</span> (cadeia de hashes conferida, ' . count($todas) . ' registros)'
    : '<span style="color:var(--red)">ALTERADO a partir do registro ' . $quebra . '</span>: avise o responsável pela segurança';
$qs = http_build_query(array_filter(['usuario' => $f_usuario, 'de' => $f_de, 'ate' => $f_ate]));

ddm_pagina('Acessos', '
<div class="top"><h1>Acessos ao painel</h1><div><a class="btn ghost s" href="/">Voltar ao painel</a> <a class="btn ghost s" href="/acesso/senha.php">Trocar minha senha</a> <a class="btn ghost s" href="/acesso/sair.php">Sair</a></div></div>
<p class="mute">Conectado como ' . h($meu) . '. Registros guardados por ' . DDM_RETENCAO_DIAS . ' dias e apagados depois. Esta consulta também fica registrada.</p>
' . $aviso . $caixa_temp . '
<h2>Usuários</h2>
<div class="card scroll"><table><tr><th>Pessoa</th><th>Papel</th><th>Situação</th><th>Último acesso</th><th></th></tr>' . ($linhas_u ?: '<tr><td colspan="5" class="mute">Nenhum usuário.</td></tr>') . '</table>
<form method="post" class="linha" style="margin-top:16px">
  <input type="hidden" name="csrf" value="' . h(ddm_csrf()) . '"><input type="hidden" name="acao" value="criar">
  <div><label for="n">Nome</label><input id="n" name="nome" required maxlength="80"></div>
  <div><label for="e">E-mail</label><input id="e" name="email" type="email" required maxlength="254"></div>
  <div style="max-width:160px"><label for="p">Papel</label><select id="p" name="papel"><option value="usuario">usuário</option><option value="admin">admin</option></select></div>
  <div style="flex:0"><button class="btn" type="submit">Adicionar</button></div>
</form></div>

<h2>Registro de acessos</h2>
<p class="mute" style="margin-top:-4px">Integridade: ' . $integridade . '</p>
<form method="get" class="linha" style="margin-bottom:12px">
  <div><label for="fu">Pessoa</label><select id="fu" name="usuario">' . $opts . '</select></div>
  <div style="max-width:180px"><label for="fd">De</label><input id="fd" name="de" type="date" value="' . h($f_de) . '"></div>
  <div style="max-width:180px"><label for="fa">Até</label><input id="fa" name="ate" type="date" value="' . h($f_ate) . '"></div>
  <div style="flex:0;white-space:nowrap"><button class="btn" type="submit">Filtrar</button> <a class="btn ghost" href="/acesso/admin.php?' . h($qs . ($qs ? '&' : '') . 'baixar=csv') . '">Baixar CSV</a></div>
</form>
<div class="card scroll"><table><tr><th>Quando (Brasília)</th><th>Evento</th><th>Usuário</th><th>IP : porta</th><th>Navegador</th></tr>'
. ($linhas_r ?: '<tr><td colspan="5" class="mute">Nada no período.</td></tr>') . '</table>
<p class="mute" style="margin:10px 0 0">' . count($filtradas) . ' registros no filtro' . (count($filtradas) > 300 ? '; mostrando os 300 mais recentes (o CSV traz todos)' : '') . '.</p></div>
', true);
