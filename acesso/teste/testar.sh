#!/usr/bin/env bash
# Teste ponta a ponta do login do painel contra um Apache com o .htaccess (roda no GitHub Actions).
# Uso: BASE=http://127.0.0.1 USUARIOS="sudo -u www-data php /var/www/painel/acesso/usuarios.php" \
#      LOG=/var/www/.ddm-trafego-acesso/acessos.jsonl acesso/teste/testar.sh
set -u
BASE=${BASE:-http://127.0.0.1}
J=$(mktemp -d)
falhas=0
ok()   { echo "OK    $1"; }
erro() { echo "FALHA $1"; falhas=$((falhas+1)); }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
confere() { [ "$2" = "$3" ] && ok "$1 ($2)" || erro "$1: veio $2, esperado $3"; }
csrf() { grep -o 'name="csrf" value="[^"]*"' "$1" | head -1 | sed 's/.*value="//;s/"$//'; }

echo "== sem login, nada do site sai"
confere "/ (navegador) vai para o login" "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -H 'Accept: text/html' $BASE/)" "303 $BASE/acesso/entrar.php?voltar=%2F"
for p in /dados/campanhas.json /HANDOFF.md /WORKLOG.md /index.html /skills/trafego-pago/ddm-audiencia-crm/SKILL.md; do
  confere "$p" "$(code $BASE$p)" 401
done
for p in /.git/config /.htaccess /acesso/nucleo.php /acesso/usuarios.php /acesso/portao.php /scripts/testar_chaves.py /acesso/teste/testar.sh; do
  c=$(code $BASE$p); [ "$c" != 200 ] && ok "$p bloqueado ($c)" || erro "$p devolveu 200"
done
confere "marca da tela de login" "$(code $BASE/assets/ddm-marca.png)" 200

echo "== tela de login"
curl -s -c $J/c -b $J/c -D $J/h $BASE/acesso/entrar.php -o $J/entrar.html
grep -q 'Marco Civil' $J/entrar.html && ok "aviso de privacidade" || erro "sem aviso de privacidade"
grep -qi 'set-cookie: DDMSESS=.*HttpOnly' $J/h && ok "cookie HttpOnly" || erro "cookie sem HttpOnly"
grep -qi 'set-cookie: DDMSESS=.*SameSite=Lax' $J/h && ok "cookie SameSite=Lax" || erro "cookie sem SameSite"
grep -qi '^x-frame-options: DENY' $J/h && ok "X-Frame-Options" || erro "sem X-Frame-Options"

echo "== usuário de teste pela linha de comando"
SAIDA=$($USUARIOS criar teste@exemplo.com.br "Pessoa Teste" admin)
TEMP=$(echo "$SAIDA" | grep -o '[A-Za-z0-9]\{4\}-[A-Za-z0-9]\{4\}-[A-Za-z0-9]\{4\}-[A-Za-z0-9]\{4\}')
[ -n "$TEMP" ] && ok "senha temporária gerada" || { erro "criar usuário: $SAIDA"; exit 1; }
$USUARIOS criar teste@exemplo.com.br "De novo" >/dev/null 2>&1 && erro "criou usuário repetido" || ok "não cria repetido"

login() { # email senha voltar → grava cabeçalhos em $J/lh
  curl -s -c $J/c -b $J/c $BASE/acesso/entrar.php -o $J/f.html
  curl -s -c $J/c -b $J/c -D $J/lh -o $J/lb.html --data-urlencode "csrf=$(csrf $J/f.html)" \
    --data-urlencode "email=$1" --data-urlencode "senha=$2" --data-urlencode "voltar=${3:-/}" $BASE/acesso/entrar.php
}
loc() { grep -i '^location:' $J/lh | tr -d '\r' | sed 's/^[Ll]ocation: //'; }

echo "== login"
login teste@exemplo.com.br senha-errada-123
grep -q 'E-mail ou senha incorretos' $J/lb.html && ok "senha errada recusada" || erro "senha errada não recusada"
login ninguem@exemplo.com.br qualquercoisa
grep -q 'E-mail ou senha incorretos' $J/lb.html && ok "e-mail desconhecido: mesma mensagem" || erro "e-mail desconhecido com outra mensagem"
curl -s -c $J/c -b $J/c -o $J/lb.html --data "csrf=errado&email=teste@exemplo.com.br&senha=$TEMP" $BASE/acesso/entrar.php
grep -q 'ficou aberta' $J/lb.html && ok "CSRF errado recusado" || erro "CSRF errado aceito"
login teste@exemplo.com.br "$TEMP" "//malicioso.example.com"
confere "senha temporária leva à troca de senha" "$(loc)" "/acesso/senha.php"
confere "com troca pendente, dados bloqueados" "$(code -b $J/c $BASE/dados/campanhas.json)" 403

echo "== troca de senha"
NOVA='Nova-senha-de-teste-2026!'
curl -s -c $J/c -b $J/c $BASE/acesso/senha.php -o $J/s.html
curl -s -c $J/c -b $J/c -o $J/sb.html --data-urlencode "csrf=$(csrf $J/s.html)" --data-urlencode "atual=$TEMP" \
  --data-urlencode "nova=curta" --data-urlencode "confirma=curta" $BASE/acesso/senha.php
grep -q 'pelo menos 12' $J/sb.html && ok "senha curta recusada" || erro "senha curta aceita"
curl -s -c $J/c -b $J/c -D $J/lh -o /dev/null --data-urlencode "csrf=$(csrf $J/sb.html)" --data-urlencode "atual=$TEMP" \
  --data-urlencode "nova=$NOVA" --data-urlencode "confirma=$NOVA" $BASE/acesso/senha.php
confere "senha trocada volta ao painel" "$(loc)" "/"

echo "== logado"
confere "/ com login" "$(code -b $J/c $BASE/)" 200
confere "/dados/campanhas.json com login" "$(code -b $J/c $BASE/dados/campanhas.json)" 200
curl -s -b $J/c $BASE/dados/campanhas.json | python3 -c 'import json,sys; json.load(sys.stdin)' && ok "JSON íntegro" || erro "JSON corrompido"
curl -s -b $J/c -D $J/th -o /dev/null $BASE/dados/campanhas.json
grep -qi '^content-type: application/json' $J/th && ok "content-type JSON" || erro "content-type errado"
curl -s -b $J/c $BASE/acesso/eu.php | grep -q '"admin":true' && ok "eu.php" || erro "eu.php"
for p in "/..%2f..%2f..%2fetc%2fpasswd" "/dados/..%2facesso%2fnucleo.php" "/%2e%2e/%2e%2e/etc/passwd" "/.git/HEAD" "/acesso/nucleo.php" "/scripts/_env.py" "/dashboard/server/index.js"; do
  c=$(code -b $J/c "$BASE$p"); [ "$c" != 200 ] && ok "logado, $p bloqueado ($c)" || erro "logado, $p devolveu 200"
done
curl -s -b $J/c $BASE/acesso/admin.php -o $J/a.html
grep -q 'íntegro' $J/a.html && ok "admin: registro íntegro" || erro "admin: integridade"
grep -q 'login_falha' $J/a.html && ok "admin: falhas aparecem" || erro "admin: falhas não aparecem"
confere "admin: CSV" "$(curl -s -b $J/c -o /dev/null -w '%{content_type}' "$BASE/acesso/admin.php?baixar=csv")" "text/csv; charset=utf-8"

echo "== sair"
curl -s -b $J/c -c $J/c -o /dev/null $BASE/acesso/sair.php
confere "depois de sair, dados bloqueados" "$(code -b $J/c $BASE/dados/campanhas.json)" 401
login teste@exemplo.com.br "$NOVA" "//malicioso.example.com/x"
confere "voltar para outro site é ignorado" "$(loc)" "/"
login teste@exemplo.com.br "$NOVA" "/#/ok"
confere "voltar para página do painel funciona" "$(loc)" "/#/ok"
curl -s -b $J/c -c $J/c -o /dev/null $BASE/acesso/sair.php
login teste@exemplo.com.br "$TEMP"
grep -q 'incorretos' $J/lb.html && ok "senha temporária antiga não vale mais" || erro "senha temporária antiga ainda entra"

echo "== bloqueio por tentativas"
for i in 1 2 3 4 5; do login teste@exemplo.com.br "errada-$i"; done
login teste@exemplo.com.br "$NOVA"
grep -q 'Muitas tentativas' $J/lb.html && ok "bloqueia depois de 5 falhas (mesmo com a senha certa)" || erro "não bloqueou"

echo "== registro de acessos"
REG=$(sudo cat "$LOG")
for ev in login_ok login_falha senha_trocada logout usuario_criado registro_consultado registro_exportado; do
  echo "$REG" | grep -q "\"evento\":\"$ev\"" && ok "evento $ev" || erro "sem evento $ev"
done
echo "$REG" | grep -q '"ip":"127.0.0.1","porta":[0-9]' && ok "IP e porta de origem" || erro "sem IP/porta"
echo "$REG" | grep -q '"navegador":"curl' && ok "navegador" || erro "sem navegador"
echo "$REG" | grep -q '"em_brasilia":"20[0-9-]*T[0-9:]*-03:00"' && ok "hora de Brasília com fuso" || erro "sem fuso"
echo "$REG" | grep -q -e "$NOVA" -e "$TEMP" -e 'errada-' -e 'senha-errada' && erro "SENHA NO REGISTRO" || ok "nenhuma senha no registro"
sudo stat -c '%a' "$LOG" | grep -q '^600$' && ok "registro com permissão 600" || erro "permissão do registro: $(sudo stat -c '%a' "$LOG")"
$USUARIOS conferir | grep -q 'íntegro' && ok "cadeia de hashes íntegra" || erro "cadeia quebrada"
sudo sed -i '2s/login_falha/login_ok/' "$LOG"
$USUARIOS conferir >/dev/null && erro "alteração no registro não detectada" || ok "alteração no registro detectada"

rm -rf $J
echo
[ $falhas -eq 0 ] && echo "TUDO OK" || echo "$falhas FALHA(S)"
exit $falhas
