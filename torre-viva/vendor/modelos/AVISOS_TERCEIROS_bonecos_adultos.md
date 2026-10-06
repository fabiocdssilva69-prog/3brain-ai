# Bonecos adultos da Torre 3BRAIN — origem e licença (03/10/2026)

**Pasta:** `sala/vendor/modelos/bonecos_adultos/` (18 ficheiros `character-a.glb` … `character-r.glb`, 2,0 MB no total).

**Origem:** Kenney — *Blocky Characters* 2.0 (criado 10-06-2025), <https://kenney.nl/assets/blocky-characters>,
ficheiro `kenney_blocky-characters_20.zip`, pasta `Models/GLB format/`. A licença original vai ao lado:
`LICENSE_Kenney_CC0.txt`.

**Licença:** Creative Commons Zero (CC0) — <http://creativecommons.org/publicdomain/zero/1.0/>. Uso pessoal,
educativo e comercial sem obrigação de crédito (Kenney pede, sem exigir, uma menção a www.kenney.nl ou um donativo).

**Porquê estes (resposta q05 do dono, 02/10: "mais adultos e esbeltos — corpo de pessoa, cabeça normal"):** são
adultos de proporção normal (cabeça ≈ 1/5 da altura), com o MESMO conjunto de animações e os MESMOS nomes de nós dos
cabeçudos *Mini Characters* que o Agentshire usa (`idle`, `walk`, `sprint`, `sit`, `pick-up`, `emote-yes`, `emote-no`,
`interact-right/left`, `holding-*`, `die`; nós `root`, `torso`, `head`, `arm-left/right`, `leg-left/right`) — o código
de animação da torre serve os dois sem alterações. São animados por nó (sem esqueleto/skin), o que os torna mais
baratos de clonar e de "assar" em pose para a multidão instanciada. A página aplica uma escala x/z de 0,84 para os
deixar mais esbeltos (`t3b_andar.js`, `ESBELTO`).

**Sem dependência externa em tempo de execução:** os GLB são servidos pelo próprio `servidor_sala.py` a partir desta
pasta; a textura (`colormap`) vem embutida em cada GLB.

Os cabeçudos anteriores (`bonecos/`, Kenney Mini Characters via Agentshire, também CC0) ficam na pasta por referência;
a torre 3BRAIN deixou de os usar a 03/10/2026.
