# src/notfound/ — resolução de links inválidos

O zunzum é single-page: links como `?perfil=@x`, `?sala=y` e `#perfil-@x`
são resolvidos no cliente. Quando o alvo não existe, o app mostra o
cartão 404 desta pasta em vez de falhar em silêncio.

Arquivos:
- `card.html` — fonte canônica do cartão (vai dentro de
  `<template id="notfoundTpl">` no `index.html`)
- `card.css` — fonte canônica do estilo (vai no `<style>` do `index.html`)
- Lógica: `showNotFound()` / `hideNotFound()` em `src/app.js`
  (usado em `openProfile` p/ perfil inexistente e em `loadPub` p/ sala inexistente)

Esta pasta fica dentro de `src/`, então é publicada junto com o generator.
Manteve-se cópia idêntica embutida no `index.html` (template + CSS) porque
o cartão precisa estar no HTML principal; ao mudar aqui, copie p/ lá.
