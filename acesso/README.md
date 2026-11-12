# Login do painel

Todo pedido ao site passa pelo `acesso/portao.php` (regras no `.htaccess` da raiz). Sem login, nada do painel sai: nem a página, nem `dados/`, nem os `.md`. As pastas `acesso/`, `scripts/`, `dashboard/` e qualquer arquivo oculto (`.git`, `.env`) nunca são entregues, mesmo com login.

## Onde ficam os dados (fora do site e do git)
`~/.ddm-trafego-acesso/` no servidor (no cPanel: `/home/<usuário>/.ddm-trafego-acesso/`), criada sozinha no primeiro acesso, permissão 700:
- `usuarios.json`: nome, e-mail, papel, hash da senha (bcrypt), situação, último acesso. Nunca a senha.
- `acessos.jsonl`: registro de acessos, uma linha por evento, permissão 600.
- `tentativas.json`: contagem de falhas para o bloqueio (e-mail guardado só em hash).
- `sessoes/`: sessões abertas.

## Registro de acessos (LGPD e Marco Civil)
Cada linha: data e hora em UTC e em Brasília (com fuso), evento, usuário, IP, porta de origem, navegador e um identificador da sessão (hash, não o cookie). Eventos: `login_ok`, `login_falha` (motivo: senha incorreta, usuário desconhecido, desativado, bloqueado por tentativas, formulário expirado), `logout`, `sessao_encerrada` (ociosa 30 min, 12 h no máximo, usuário desativado, senha trocada), `ip_alterado`, `senha_trocada`, `usuario_criado`, `senha_redefinida`, `usuario_desativado`/`reativado`, `registro_consultado`, `registro_exportado`, `expurgo`.

| Exigência | Como está |
|---|---|
| Marco Civil (Lei 12.965/2014) art. 15: guardar registros de acesso a aplicações (data, hora, IP) por 6 meses, em sigilo e ambiente controlado | guarda 183 dias; arquivo fora do site, permissão 600; só admin vê |
| Porta de origem (necessária para identificar quem usa IP compartilhado, entendimento do STJ) | registrada |
| Decreto 8.771/2016 art. 13: controle de acesso aos registros, autenticação, inventário de quem consultou | só papel admin; cada consulta e cada CSV ficam registrados; cadeia de hashes mostra se alguém alterou o arquivo |
| LGPD art. 6 (necessidade, transparência), art. 9 (informação ao titular) | só o necessário; aviso na tela de login com finalidade, prazo e link da política |
| LGPD art. 16 (eliminação ao fim do prazo) | expurgo automático diário do que passa de 183 dias |
| LGPD art. 18 (acesso do titular) | admin filtra pela pessoa e baixa o CSV |
| LGPD art. 46 (segurança) | bcrypt, sessão com cookie HttpOnly/Secure/SameSite, troca de ID no login, CSRF, bloqueio após 5 falhas por e-mail ou 20 por IP em 15 min, sessão encerra em 30 min parada ou 12 h, senha mínima 12 caracteres, senha temporária obrigatoriamente trocada |

**A confirmar com o jurídico da DDM:** bases legais (sugestão: art. 7º, II, cumprimento de obrigação legal do Marco Civil, e IX, legítimo interesse para segurança), o prazo de 6 meses e o texto do aviso na tela de login.

## Usuários
No cPanel → Terminal, na pasta do site (`cd ~/apps/agente-trafego`):
```
php acesso/usuarios.php criar email@grupoddm.com.br "Nome Sobrenome" admin   # ou sem "admin" para usuário comum
php acesso/usuarios.php senha email@...       # nova senha temporária
php acesso/usuarios.php desativar email@...   # ou reativar
php acesso/usuarios.php listar
php acesso/usuarios.php conferir              # integridade do registro
```
Depois do primeiro admin, o resto se faz no painel: botão com o seu nome no canto inferior esquerdo → **Configurações** (abas Conta, Usuários, Registro de acessos, Sistema). A página fala com `acesso/api.php`. A senha temporária aparece uma vez; a pessoa cria a própria no primeiro acesso.

## Desfazer
Apagar o `.htaccess` da raiz do site no cPanel (Gerenciador de Arquivos, com "mostrar ocultos") volta o site ao que era antes (aberto). Os dados em `~/.ddm-trafego-acesso/` continuam lá.

## Teste
`.github/workflows/acesso.yml` sobe um Apache com PHP, aplica o `.htaccess` e roda `acesso/teste/testar.sh` a cada mudança em `acesso/`. Para testar no computador sem Apache: `DDM_ACESSO_DIR=/tmp/ddm-acesso php -S 127.0.0.1:8099 acesso/roteador-local.php`.

## Atenção
O repositório no GitHub é público: o login protege o site, não o que está no repositório. Dado que não pode ser público não entra no git (regra do HANDOFF, seção 7).
