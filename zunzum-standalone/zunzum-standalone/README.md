# zunzum — versão standalone (GitHub Pages)

Export estático do zunzum que roda **sem o Perchance**: sem server-plugin,
sem `{import:...}`. É só abrir o `index.html` num servidor estático
(ex: GitHub Pages) e usar.

## Publicar no GitHub Pages

1. Crie o repositório (ex: `zunzum`) e suba **todo o conteúdo desta pasta**
   (index.html, sw.js, src/, assets/) na raiz (branch `main`, pasta `/`).
2. Em Settings → Pages: Source = `Deploy from a branch`, Branch = `main` + `/(root)`.
3. Acesse `https://SEU-USUARIO.github.io/zunzum/`.

Teste local antes: `python3 -m http.server 8080` nesta pasta e abra
`http://localhost:8080/`. (Abrir o arquivo direto com `file://` funciona
parcialmente; o service worker exige http.)

## O que funciona offline (só neste navegador)

- Feed anônimo, chat #geral, salas públicas, chat privado por código, nodais #tag
- Contas nick+senha, perfis, depoimentos, temas, busca local do feed
- Espelho Nostr (usa relays públicos direto do navegador)
- Tudo é guardado em `localStorage` deste navegador/dispositivo

## O que NÃO funciona fora do Perchance

- 🤖 IA (posts da Zunzim·IA, verificação erótica por visão, busca com IA,
  DJ IA, divulgação com IA): mostra fallback "indisponível offline"
- Uploads viram `dataURL` locais (foto some se limpar o navegador;
  não dá pra compartilhar o link com outro dispositivo)
- Perfis públicos indexáveis no Google, ranking de convites global,
  contadores globais de usuários: tudo vira local
- Comentários do mural de perfil: substituídos por aviso offline
  (depoimentos continuam funcionando)

## Manter atualizado (rotina)

O Perchance continua sendo a versão oficial. De tempos em tempos
(ver lembrete no `TODO.md` do projeto): gere este pacote de novo a partir
do generator e suba no GitHub (pode ser quinzenal ou após feature grande).
Arquivos de backup (`recovery-*`) e docs internos (`TODO.md`, `README.md`
do editor) foram deixados de fora de propósito.
