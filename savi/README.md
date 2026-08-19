# SAVI — demonstração

`demonstracao.html` é o painel do SAVI em modo demonstração, autocontido: abre sozinho, sem
servidor e sem a pasta de fotos. É o que o link do e-mail abre.

**Antes de trocar este arquivo**, rode no repositório do SAVI:

    .venv\Scripts\python -m scripts.panel.build_demo --embutir

e confira os quatro portões — nomes reais remanescentes `0`, identidade da casa `nenhuma
menção`, licença das fotos `nenhuma NC/ND`, imagens `todas embutidas`. Só sobe com os quatro.

`img/` são as imagens da peça de e-mail, servidas por URL porque **imagem de e-mail não vai
embutida**. As larguras e os textos alternativos estão no `pacote/PACOTE.md` do repositório do
SAVI — servir em largura diferente da declarada quebra a grade de 590 px.

Os nomes que aparecem nas telas são **fictícios**; nenhuma pessoa real é identificada.
