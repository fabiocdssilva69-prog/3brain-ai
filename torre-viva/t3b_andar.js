// t3b_andar.js — O ESCRITORIO DE PERTO da Torre 3BRAIN (03/10/2026, as 31 respostas dele ao questionario de 02/10).
//
// O QUE ELE ESCOLHEU (RESPOSTAS_QUESTIONARIO_02out.md) e onde cada coisa vive aqui:
//  q02 o escritorio NOVO, "muito mais organizado e sofisticado, sem bugs" -> planta() com ilhas em grelha, corredores
//      largos, salas de vidro ao fundo (gabinete do gerente, reunioes, copa, arquivo) e a copa e as janelas na frente.
//  q04/q05 bonecos 3D animados com PROPORCAO ADULTA -> Kenney "Blocky Characters 2.0" (CC0; sala/vendor/modelos/
//      bonecos_adultos; licenca ao lado), 18 variantes com as MESMAS animacoes dos cabecudos (idle, walk, sprint, sit,
//      pick-up, emote-yes/no, interact-*). Os bonecos sao por partes (sem esqueleto): clonam-se e animam-se por no.
//  q06 cor pela ESPECIE (tinta no corpo + crachá no peito), um OBJECTO pela funcao (tablet, lupa, pasta), NOME a flutuar.
//  q07 hierarquia: estrela (supervisor/lider) ou coroa (gerente/director) por cima, secretaria maior com 2 ecras no
//      gabinete de vidro, roupa diferente (variantes de fato para gerentes, uniforme para supervisores).
//  q08 todos sao pessoas: algoritmos, regras, agentes, postos e scripts sentam-se todos (a multidao instanciada).
//  q10 modo C: CADA accao do feed vira uma ida (ao chefe, ao arquivo, ao sector, a janela, a copa, ao elevador).
//  q11-q17 destinos, trabalho sentado (dados a voar, grafico no monitor, monitor aceso, barra de progresso, balao so
//      com icone, maos no teclado), reaccoes (erro, visita, perda, demissao, ganho, contratacao, reuniao), ritmo CALMO,
//      elevador com porta, corredores a desviarem-se uns dos outros, encontros (conversam, ronda, Stark desce, reuniao,
//      entrega de documento).
//  ALERTA 3D (ordem de 03/10): sala/alertas.json -> um farol discreto por cima da secretaria de quem a escada inteira
//      nao conseguiu consertar (anel a girar, feixe, etiqueta com nome, o que falhou, ha quanto tempo, tentativas).
// A TRAVA DE SEMPRE: nenhum movimento e inventado. Quem anda, anda por um evento do /vivo.json ou por um alerta real.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const DIR_MOD = 'vendor/modelos/';
const VARIANTES = 'abcefjkq'.split('');   // so as que vestem gente de escritorio (ver ROUPA); as outras 10 ficam no vendor, por carregar
// a roupa pelo nivel (q07): quem manda veste fato; os supervisores uniforme; o resto o guarda-roupa inteiro.
// (as letras foram escolhidas a olho na prova de ecra da sonda - ver RESPOSTAS/q07 na resposta da sessao)
// 03/10 tarde, vistos os 18 lado a lado (vitrine na sonda): d (boneco de testes), g/h (robots), i (silhueta preta),
// l (zombie), n (quimono), o (orc), p (pirata), r (ninja) e m (soldado) NAO sao gente de escritorio - q08 "todos pessoas".
// Ficam: q (fato e gravata) e k (casaco) para quem manda; j (farda) para supervisores e agentes da S.H.I.E.L.D.;
// a, b, c, e, f, k, j para o resto (homens e mulheres, varias cores de pele).
const ROUPA = { gerente: ['q', 'k'], supervisor: ['j', 'q'], agente: ['a', 'b', 'c', 'e', 'f', 'k', 'j'] };
const COR_ESPECIE = { algoritmo: 0x2dd4e8, regra: 0xb265f5, agente: 0xf2c230, posto: 0x3fd69a, script: 0x60a5fa, fonte: 0x60a5fa };
const ALT_PESSOA = 1.72, ESBELTO = 0.84;                      // metros; q05: corpo de pessoa, mais esbelto
const VEL_CALMA = 1.25;                                        // q15: ritmo calmo (m/s)
const MAX_A_ANDAR = 14;                                        // leve: nunca mais do que isto a andar ao mesmo tempo
const ICONES = { trabalho: '⚙️', grafico: '📈', lupa: '🔎', ok: '✅', aviso: '⚠️', fala: '💬', cafe: '☕', caixa: '📦', doc: '📄', festa: '🎉', erro: '⛔' };

let modelos = null, carregando = null, texIcone = {}, texNome = {};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color(), _c2 = new THREE.Color();

// ================================================================ os modelos (uma vez)
export function carregarModelos() {
  if (modelos) return Promise.resolve(modelos);
  if (carregando) return carregando;
  const ld = new GLTFLoader();
  const mob = ['table_medium_long', 'chair_A', 'cactus_medium_A', 'lamp_standing', 'couch', 'table_low', 'cabinet_medium', 'shelf_B_small_decorated', 'chair_stool', 'armchair'];
  carregando = (async () => {
    const variantes = [];
    for (let i = 0; i < VARIANTES.length; i += 6) {
      const lote = await Promise.all(VARIANTES.slice(i, i + 6).map(l => ld.loadAsync(DIR_MOD + 'bonecos_adultos/character-' + l + '.glb')));
      lote.forEach((g, k) => {
        const cena = g.scene, cx = new THREE.Box3().setFromObject(cena), alt = Math.max(0.01, cx.max.y - cx.min.y);
        variantes.push({ letra: VARIANTES[i + k], cena, clips: g.animations, escala: ALT_PESSOA / alt, base: -cx.min.y });
      });
    }
    const mobilia = {};
    const lm = await Promise.all(mob.map(nm => ld.loadAsync(DIR_MOD + 'mobilia/' + nm + '.gltf').catch(() => null)));
    lm.forEach((g, k) => { if (!g) return; let geo = null, mat = null; g.scene.traverse(x => { if (x.isMesh && !geo) { x.updateWorldMatrix(true, false); geo = x.geometry.clone().applyMatrix4(x.matrixWorld); mat = x.material; } }); mobilia[mob[k]] = { geo, mat }; });
    // ponto 6 ("bonecos quadrados"): os Kenney vem com normais PLANAS (cada face do cubo e um bloco de cor chapada). A
    // sombra passa a ser SUAVE: a normal de cada vertice e a media das faces que se tocam nesse ponto (pela posicao, para
    // nao ficar presa as costuras da textura) - os bonecos ficam arredondados pela luz sem mudar a forma.
    variantes.forEach(v => v.cena.traverse(x => { if (x.isMesh) normaisSuaves(x.geometry); }));
    variantes.forEach(v => { v.sentado = assarPose(v, 'sit'); });
    modelos = { variantes, mobilia };
    return modelos;
  })();
  return carregando;
}
export function normaisSuaves(g) {
  if (!g || !g.attributes.position || g.userData.suave) return g;
  const p = g.attributes.position, n = p.count, idx = g.index ? g.index.array : null, acum = new Map(), chave = i => Math.round(p.getX(i) * 400) + ',' + Math.round(p.getY(i) * 400) + ',' + Math.round(p.getZ(i) * 400);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
  const tri = idx ? idx.length / 3 : n / 3;
  for (let t = 0; t < tri; t++) {
    const i0 = idx ? idx[t * 3] : t * 3, i1 = idx ? idx[t * 3 + 1] : t * 3 + 1, i2 = idx ? idx[t * 3 + 2] : t * 3 + 2;
    a.fromBufferAttribute(p, i0); b.fromBufferAttribute(p, i1); c.fromBufferAttribute(p, i2);
    ab.subVectors(b, a); ac.subVectors(c, a); const f = ab.cross(ac);          // pesa pela area
    [i0, i1, i2].forEach(i => { const k = chave(i); const v = acum.get(k); if (v) v.add(f); else acum.set(k, f.clone()); });
  }
  const nor = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = acum.get(chave(i)); if (v) { v.normalize(); nor[i * 3] = v.x; nor[i * 3 + 1] = v.y; nor[i * 3 + 2] = v.z; } }
  // mistura 60% suave + 40% da original: o boneco arredonda mas as arestas da roupa nao desaparecem
  const orig = g.attributes.normal;
  if (orig) for (let i = 0; i < n; i++) { const x = nor[i * 3] * 0.6 + orig.getX(i) * 0.4, y = nor[i * 3 + 1] * 0.6 + orig.getY(i) * 0.4, z = nor[i * 3 + 2] * 0.6 + orig.getZ(i) * 0.4, L = Math.hypot(x, y, z) || 1; nor[i * 3] = x / L; nor[i * 3 + 1] = y / L; nor[i * 3 + 2] = z / L; }
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.userData.suave = true;
  return g;
}
// a multidao sentada: a pose "sit" gravada nos vertices UMA vez e desenhada instanciada (18 chamadas para 300 pessoas)
function assarPose(v, nome) {
  const c = v.cena.clone(true), mixer = new THREE.AnimationMixer(c), clip = THREE.AnimationClip.findByName(v.clips, nome);
  if (clip) { const ac = mixer.clipAction(clip); ac.play(); mixer.update(0.4); }
  c.updateMatrixWorld(true);
  const geos = []; let mat = null;
  c.traverse(x => { if (!x.isMesh) return; const g = x.geometry.clone().applyMatrix4(x.matrixWorld); ['tangent', 'color'].forEach(a => g.deleteAttribute(a)); geos.push(g); mat = x.material; });
  const geo = geos.length ? mergeGeometries(geos) : null;
  if (geo) { geo.scale(v.escala * ESBELTO, v.escala, v.escala * ESBELTO); geo.userData.suave = false; normaisSuaves(geo); }
  return { geo, mat };
}
function variantePara(nivel, sem) {
  const lista = ROUPA[nivel] || ROUPA.agente, letra = lista[sem % lista.length];
  return modelos.variantes.find(v => v.letra === letra) || modelos.variantes[sem % modelos.variantes.length];
}
function nivelDe(nome, cargo, lider) {
  const s = String(nome || '') + ' ' + String(cargo || '');
  if (/^Sr\.|Director|Directora|Gerente|CEO/.test(s)) return 'gerente';
  if (/Supervisor|Supervisora|Lider|Líder/.test(s) || lider) return 'supervisor';
  return 'agente';
}
function objectoDe(nome, cargo, sector) {
  const s = (String(nome || '') + ' ' + String(cargo || '') + ' ' + String(sector || '')).toLowerCase();
  if (/audit|vigia|conformidade|inspec/.test(s)) return 'lupa';
  if (/gerente|director|sr\./.test(s)) return 'pasta';
  if (/analista|associado|leitor|dados|mesa/.test(s)) return 'tablet';
  return null;
}

// ================================================================ texturas pequenas (icones, nomes, placas)
export function texturaIcone(ic) {
  if (texIcone[ic]) return texIcone[ic];
  // ponto 6: todas as texturas de texto/icone a 2x (eram borradas de perto no ecra a 1,25)
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.scale(256 / 96, 256 / 96);   // 04/10: 256 px (de perto ficavam moles)
  g.fillStyle = 'rgba(10,10,14,.9)'; g.beginPath(); g.arc(48, 44, 40, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#f2c230'; g.lineWidth = 3; g.stroke();
  g.beginPath(); g.moveTo(36, 80); g.lineTo(48, 94); g.lineTo(60, 80); g.fillStyle = 'rgba(10,10,14,.9)'; g.fill();
  g.font = '44px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(ic, 48, 46);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texIcone[ic] = t; return t;
}
function texturaNome(nome, cor, marca) {
  const k = nome + '|' + cor + '|' + (marca || '');
  if (texNome[k]) return texNome[k];
  const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d'); g.scale(2, 2);
  g.font = '600 22px Inter, system-ui, "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif'; nome = cortarTexto(window.T3BTexto ? window.T3BTexto.limpar(nome) : nome, 28); const w = Math.min(236, g.measureText(nome).width + 24);
  g.fillStyle = 'rgba(8,8,10,.78)'; g.beginPath(); g.roundRect ? g.roundRect(128 - w / 2, 8, w, 32, 8) : g.rect(128 - w / 2, 8, w, 32); g.fill();
  g.fillStyle = '#' + cor.getHexString(); g.fillRect(128 - w / 2, 8, 4, 32);
  g.fillStyle = '#efede8'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText((marca ? marca + ' ' : '') + nome, 128 + 2, 25, w - 16);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; texNome[k] = t; return t;
}
export function placaDeTexto(nome, sub, cor, larg, plana) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 224; const g = c.getContext('2d'); g.scale(2, 2);
  g.fillStyle = 'rgba(8,8,10,.88)'; g.beginPath(); g.roundRect ? g.roundRect(0, 0, 512, 112, 14) : g.rect(0, 0, 512, 112); g.fill();
  g.fillStyle = '#' + cor.getHexString(); g.fillRect(0, 0, 10, 112);
  g.font = '600 40px Inter, system-ui, sans-serif'; g.fillStyle = '#efede8'; g.textBaseline = 'middle'; g.fillText(nome, 28, 40, 470);
  g.font = '500 24px "JetBrains Mono", monospace'; g.fillStyle = '#f2c230'; g.fillText(sub, 28, 82, 470);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  // plana = uma placa de verdade, presa a parede/vidro (03/10: os sprites viravam-se todos para a camara e, com 24
  // sectores num andar, as placas tapavam-se umas as outras e aos bonecos)
  if (plana) { const L = larg || 2.4, m = new THREE.Mesh(new THREE.PlaneGeometry(L, L * 112 / 512), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); m.renderOrder = 4; m.userData.proprio = true; return m; }
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  m.scale.set(larg || 3.6, (larg || 3.6) * 112 / 512, 1); m.renderOrder = 6; m.userData.proprio = true;
  return m;
}

// ================================================================ a planta (q02, q23): ilhas em grelha + salas ao fundo
// Eixos do andar: x da esquerda para a direita, z de tras (-D/2, as salas) para a frente (+D/2, as janelas e a copa).
// 04/10 (obra 4, c02 "boneco a atravessar paredes", "texto por cima de texto"): (1) nos andares cheios (os Labs, ~290 pessoas)
// as celulas nao chegavam - 50 ilhas para 42 celulas - e as que sobravam iam TODAS para a ultima celula: 8 ilhas umas em cima
// das outras (mesas, bonecos e placas sobrepostos). Agora a grelha encolhe ate caber e, no limite, as ilhas passam a 8 lugares
// (4+4). (2) O tapete, a borda e a parede de vidro de cada sector eram a CAIXA de todas as suas ilhas - sectores que
// atravessavam linhas ficavam com caixas por cima das ilhas dos outros (tapetes a piscar, vidro no meio de outro sector). Agora
// o tapete e por ilha, a borda so nas arestas que dao para outro sector, e o vidro so ENTRE sectores diferentes (q23), com
// passagem nas pontas - e entra na grelha do caminho (antes os bonecos atravessavam-no).
export function planta(gente, W, D) {
  const porSector = new Map();
  gente.forEach(p => { const s = p[3] || '?'; if (!porSector.has(s)) porSector.set(s, []); porSector.get(s).push(p); });
  const SALAS_D = 7.0, FRENTE = 3.2, NUC = 3.4, MARG = 1.6;      // as salas ao fundo; a faixa das janelas e da copa a frente
  const z0 = -D / 2 + SALAS_D + 0.8, z1 = D / 2 - FRENTE, x0 = -W / 2 + MARG, x1 = W / 2 - MARG;
  const grelha = (cw, cd) => {
    const cols = Math.max(1, Math.floor((x1 - x0) / cw)), lins = Math.max(1, Math.floor((z1 - z0) / cd)), cel = [];
    // as celulas livres, por ordem de leitura; o nucleo do elevador fica vazio (e um corredor a volta dele)
    for (let l = 0; l < lins; l++) for (let c = 0; c < cols; c++) {
      const x = x0 + c * cw + cw / 2, z = z0 + l * cd + cd / 2;
      if (Math.abs(x) < NUC + cw * 0.5 && Math.abs(z) < NUC + cd * 0.5) continue;
      cel.push({ x, z, c, l });
    }
    return cel;
  };
  let porIlha = 6, cw = 4.6, cd = 3.9, celulas = null, nIlhas = 0;
  for (let t = 0; t < 40; t++) {
    nIlhas = [...porSector.values()].reduce((s, ps) => s + Math.ceil(ps.length / porIlha), 0);
    celulas = grelha(cw, cd);
    if (celulas.length >= nIlhas) break;
    if (cw > 3.5 || cd > 3.0) { cw = Math.max(3.5, cw * 0.95); cd = Math.max(3.0, cd * 0.95); continue; }
    if (porIlha === 6) { porIlha = 8; cw = 4.6; cd = 3.3; continue; }
    break;
  }
  const meiaIlha = porIlha === 8 ? 2.05 : 1.6;                  // metade da largura da ilha (para a grelha do caminho)
  const sectores = [...porSector.entries()].map(([id, ps]) => ({ id, ps, ilhas: Math.ceil(ps.length / porIlha) })).sort((a, b) => b.ps.length - a.ps.length);
  const lugares = [], dono = new Map(); let ci = 0;
  sectores.forEach(s => {
    s.ilhasPos = [];
    for (let i = 0; i < s.ilhas; i++) {
      const cel = celulas[ci++]; if (!cel) break;                // (sem celula nao ha ilha: nunca uma em cima da outra)
      s.ilhasPos.push({ x: cel.x, z: cel.z, c: cel.c, l: cel.l });
      dono.set(cel.c + ',' + cel.l, s);
      const porLado = porIlha / 2;
      for (let k = 0; k < porIlha; k++) {
        const lado = k < porLado ? -1 : 1, px = cel.x + ((k % porLado) - (porLado - 1) / 2) * 0.95, pz = cel.z + lado * 1.05;
        lugares.push({ x: px, z: pz, ry: lado < 0 ? 0 : Math.PI, sector: s, ilha: i, ocupado: null, cel });
      }
    }
    const xs = s.ilhasPos.map(p => p.x), zs = s.ilhasPos.map(p => p.z);
    s.minX = xs.length ? Math.min(...xs) - cw / 2 : 0; s.maxX = xs.length ? Math.max(...xs) + cw / 2 : 0;
    s.minZ = zs.length ? Math.min(...zs) - cd / 2 : 0; s.maxZ = zs.length ? Math.max(...zs) + cd / 2 : 0;
  });
  // as arestas entre celulas: borda (onde o vizinho nao e do mesmo sector) e vidro (onde o vizinho e de OUTRO sector)
  const bordas = [], paredes = [];
  sectores.forEach(s => s.ilhasPos.forEach(ip => {
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dl]) => {
      const viz = dono.get((ip.c + dc) + ',' + (ip.l + dl));
      if (viz === s) return;
      const hx = dc ? ip.x + dc * cw / 2 : ip.x, hz = dl ? ip.z + dl * cd / 2 : ip.z, larg = dc ? cd : cw;
      bordas.push({ s, x: hx - dc * 0.08, z: hz - dl * 0.08, larg: larg - 0.2, vert: !!dc });
      if (viz && (dc > 0 || dl > 0)) paredes.push({ x: hx, z: hz, larg: Math.max(0.6, larg - 1.8), vert: !!dc });   // uma vez por aresta, com 0,9 m de passagem em cada ponta
    });
  }));
  // as salas ao fundo (z negativo), da esquerda para a direita: gabinete do gerente, sala de reunioes, arquivo, copa
  const zs = -D / 2 + 0.6, hs = SALAS_D - 1.2;
  const salas = {
    gerente: { x: -W / 2 + 0.6, z: zs, w: 9.5, d: hs, nome: 'Gabinete' },
    reuniao: { x: -W / 2 + 10.8, z: zs, w: 11, d: hs, nome: 'Sala de reuniões' },
    arquivo: { x: W / 2 - 15.6, z: zs, w: 6.2, d: hs, nome: 'Arquivo · servidor' },
    copa: { x: W / 2 - 8.8, z: zs, w: 8.2, d: hs, nome: 'Copa' }
  };
  Object.values(salas).forEach(s => { s.cx = s.x + s.w / 2; s.cz = s.z + s.d / 2; s.porta = { x: s.cx, z: s.z + s.d + 0.9 }; });
  const janelas = []; for (let i = 0; i < 6; i++) janelas.push({ x: -W / 2 + 4 + i * (W - 8) / 5, z: D / 2 - 1.4 });
  const cabem = lugares.length;
  return { sectores, lugares, salas, janelas, cw, cd, NUC, porIlha, meiaIlha, bordas, paredes, transborda: gente.length > cabem, elevador: { x: 0, z: NUC + 0.9 } };
}

// ---------------------------------------------------------------- geometria junta (uma chamada de desenho por familia)
// 04/10 (obra 4, v04 "a gaveta ta lenta e bugada", v05 "mais otimizacao"): o escritorio de um Lab cheio fazia ~680 chamadas
// de desenho por quadro - cada tapete, borda, vidro, placa, cadeira da sala de reunioes e LED do arquivo era um objecto. Agora
// o que nao mexe junta-se numa so geometria (tapetes e chao das salas: 1; bordas: 1; vidros: 1; caixilhos: 1; placas: 1 com
// um atlas de texto) e o que se repete e instanciado.
function planoXZ(x, z, w, d, y) { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate(x, y, z); return g; }
function comCor(g, cor, alfa) {
  const n = g.attributes.position.count, k = alfa == null ? 3 : 4, a = new Float32Array(n * k);
  for (let i = 0; i < n; i++) { a[i * k] = cor.r; a[i * k + 1] = cor.g; a[i * k + 2] = cor.b; if (k === 4) a[i * k + 3] = alfa; }
  g.setAttribute('color', new THREE.BufferAttribute(a, k)); return g;
}
function soPosicaoNormalUv(g) { Object.keys(g.attributes).forEach(k => { if (!/^(position|normal|uv|color)$/.test(k)) g.deleteAttribute(k); }); return g.index ? g.toNonIndexed() : g; }
function juntar(gs) { const v = gs.filter(Boolean).map(soPosicaoNormalUv); return v.length ? mergeGeometries(v) : null; }
// o atlas das placas: cada placa uma celula de 1024x224 (2x) numa textura de 2048 de largura - todas numa chamada de desenho
function atlasDePlacas(lista) {
  const n = Math.max(1, lista.length), escala = n > 36 ? 1 : 2, cw = 512 * escala, ch = 112 * escala, porLinha = 2, linhas = Math.ceil(n / porLinha);
  const c = document.createElement('canvas'); c.width = cw * porLinha; c.height = ch * linhas; const g = c.getContext('2d');
  lista.forEach((p, i) => {
    const x = (i % porLinha) * cw, y = Math.floor(i / porLinha) * ch;
    g.setTransform(escala, 0, 0, escala, x, y);
    g.fillStyle = 'rgba(8,8,10,.88)'; g.beginPath(); g.roundRect ? g.roundRect(0, 0, 512, 112, 14) : g.rect(0, 0, 512, 112); g.fill();
    g.fillStyle = '#' + p.cor.getHexString(); g.fillRect(0, 0, 10, 112);
    g.font = '600 40px Inter, system-ui, sans-serif'; g.fillStyle = '#efede8'; g.textBaseline = 'middle'; g.fillText(cortarTexto(p.nome, 34), 28, 40, 470);
    g.font = '500 24px "JetBrains Mono", monospace'; g.fillStyle = '#f2c230'; g.fillText(cortarTexto(p.sub, 40), 28, 82, 470);
    p.uv = { u0: x / c.width, v0: 1 - (y + ch) / c.height, u1: (x + cw) / c.width, v1: 1 - y / c.height };
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function cortarTexto(s, n) { const a = Array.from(String(s == null ? '' : s)); return a.length > n ? a.slice(0, n - 1).join('') + '…' : a.join(''); }
// a geometria das placas: um plano por placa (no chao ou de pe), com os UV da sua celula e o alfa num atributo (esbater)
function malhaDePlacas(lista, tex) {
  const gs = lista.map(p => {
    const g = new THREE.PlaneGeometry(p.larg, p.larg * 112 / 512), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.uv.u0 + uv.getX(i) * (p.uv.u1 - p.uv.u0), p.uv.v0 + uv.getY(i) * (p.uv.v1 - p.uv.v0));
    if (p.chao) g.rotateX(-Math.PI / 2); else if (p.ry) g.rotateY(p.ry);
    g.translate(p.x, p.y, p.z);
    comCor(g, _c.set(0xffffff), 1);
    p.v0 = 0; p.nv = g.attributes.position.count;
    return g;
  });
  let off = 0; lista.forEach((p, i) => { p.v0 = off; off += gs[i].attributes.position.count; });
  const geo = mergeGeometries(gs);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, vertexColors: true }));
  m.renderOrder = 4; m.userData.proprio = true;
  return m;
}

// ================================================================ construir o escritorio dentro do grupo da gaveta
export function construirEscritorio(ab, dados, ctx) {
  const { W, D, H, LAJE, COR, noite, T3B, U } = ctx, M = modelos, gente = (dados && dados.gente) || [];
  const P = planta(gente, W, D); ab.planta = P; ab.andarPessoas = gente.length;
  const g = ab.grupo;
  const vidroMat = new THREE.MeshPhysicalMaterial({ color: 0xbfe6f0, metalness: 0.1, roughness: 0.05, transmission: 0.0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
  const proprio = m => { m.userData.proprio = true; return m; };
  // --- o chao: a cor do sector em cada ILHA (q23) e o chao das salas - UMA geometria com cor por vertice
  const geoChao = [], geoBorda = [], geoVidro = [], geoCaix = [], placas = [];
  P.sectores.forEach(s => {
    const esp = (s.ps[0] && s.ps[0][2]) || 'algoritmo', cor = new THREE.Color(COR_ESPECIE[esp] || 0x888888);
    s.cor = cor; s.esp = esp;
    s.ilhasPos.forEach(ip => geoChao.push(comCor(planoXZ(ip.x, ip.z, P.cw - 0.12, P.cd - 0.12, 0.015), cor.clone().multiplyScalar(0.16))));
    // a placa do sector (q23) PINTADA NO CHAO, a frente da 1.a ilha (como a sinaletica de um escritorio aberto)
    const ip0 = s.ilhasPos[0];
    if (ip0) placas.push({ nome: ctx.nomeDoSector(s.id), sub: s.ps.length + ' funcionário' + (s.ps.length === 1 ? '' : 's') + ' · ' + esp, cor, larg: Math.min(2.6, P.cw * 0.6), chao: true, x: ip0.x, y: 0.035, z: ip0.z + P.cd / 2 - 0.42 });
  });
  // as bordas dos sectores (so nas arestas que dao para fora do sector) - a cor acende quando o sector mexe (acenderSector)
  ab.bordaFaixas = new Map(); let vb = 0;
  P.bordas.forEach(b => {
    const gb = new THREE.BoxGeometry(b.vert ? 0.05 : b.larg, 0.03, b.vert ? b.larg : 0.05); gb.translate(b.x, 0.03, b.z);
    const n = (gb.index ? gb.toNonIndexed() : gb).attributes.position.count;
    geoBorda.push(comCor(gb, b.s.cor));
    const f = ab.bordaFaixas.get(b.s) || []; f.push([vb, n]); ab.bordaFaixas.set(b.s, f); vb += n;
  });
  // as paredes de vidro ENTRE sectores (q23), com passagem nas pontas
  P.paredes.forEach(p => { const gv = new THREE.PlaneGeometry(p.larg, 1.1); if (p.vert) gv.rotateY(Math.PI / 2); gv.translate(p.x, 0.55, p.z); geoVidro.push(gv); });
  // --- as salas de vidro ao fundo (q23): gabinete do gerente, reunioes, arquivo, copa
  const paredeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.4, roughness: 0.6 });
  Object.entries(P.salas).forEach(([k, s]) => {
    geoChao.push(comCor(planoXZ(s.cx, s.cz, s.w, s.d, 0.012), _c.set(k === 'gerente' ? 0x2a2214 : k === 'copa' ? 0x14211c : 0x15151c)));
    // vidro a frente (com porta: dois paineis) e dos lados
    const alt = H - LAJE - 0.3;
    [[s.w / 2 - 0.9, s.cx - s.w / 4 - 0.45, s.z + s.d, 0], [s.w / 2 - 0.9, s.cx + s.w / 4 + 0.45, s.z + s.d, 0], [s.d, s.x, s.cz, Math.PI / 2], [s.d, s.x + s.w, s.cz, Math.PI / 2]].forEach(([l, x, z, ry]) => {
      const gv = new THREE.PlaneGeometry(l, alt); gv.rotateY(ry); gv.translate(x, alt / 2, z); geoVidro.push(gv);
      const tr = new THREE.BoxGeometry(l, 0.08, 0.08); tr.rotateY(ry); tr.translate(x, alt, z); geoCaix.push(tr);
    });
    // a placa da sala no alto do vidro (por cima da porta), mais pequena: nunca a frente de quem esta la dentro
    placas.push({ nome: s.nome, sub: k === 'gerente' ? ('gerente: ' + (ab.a.gerente || '—')) : k === 'reuniao' ? 'reuniões do andar' : k === 'arquivo' ? 'o que o andar guarda' : 'café e conversa', cor: new THREE.Color(k === 'gerente' ? COR.ouro : COR.cy), larg: 2.0, chao: false, x: s.cx, y: alt - 0.32, z: s.z + s.d + 0.04 });
  });
  const chao = proprio(new THREE.Mesh(juntar(geoChao), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }))); g.add(chao);
  ab.bordas = proprio(new THREE.Mesh(juntar(geoBorda), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0.85 }))); g.add(ab.bordas);
  ab.bordaBase = ab.bordas.geometry.attributes.color.array.slice();
  if (geoVidro.length) g.add(proprio(new THREE.Mesh(juntar(geoVidro), vidroMat)));
  if (geoCaix.length) g.add(proprio(new THREE.Mesh(juntar(geoCaix), paredeMat)));
  const texPlacas = atlasDePlacas(placas);
  ab.placasMalha = malhaDePlacas(placas, texPlacas); ab.placasLista = placas; g.add(ab.placasMalha);
  // o gabinete: secretaria maior com DOIS ecras (q07) e cadeira; a sala de reunioes: mesa comprida e cadeiras; a copa:
  // balcao, maquina de cafe e bancos; o arquivo: estantes-servidor com LEDs
  const sg = P.salas.gerente, mesaG = M.mobilia.table_medium_long, cad = M.mobilia.chair_A;
  const mg = new THREE.Mesh(mesaG.geo, mesaG.mat); mg.position.set(sg.cx, 0, sg.cz - 0.6); mg.scale.set(1.15, 0.85, 0.85); g.add(mg);
  // o gerente senta-se ATRAS da secretaria e de frente para a sala (ry 0 = de frente para +z, como as filas de tras das ilhas)
  ab.lugarGerente = { x: sg.cx, z: sg.cz - 1.5, ry: 0, sector: null, gerente: true, ocupado: null };
  const geoMon = new THREE.BoxGeometry(0.62, 0.42, 0.05); geoMon.translate(0, 0.21, 0);
  const matMon = new THREE.MeshStandardMaterial({ color: 0x15151a, metalness: 0.6, roughness: 0.4 });
  const sr = P.salas.reuniao, mr = new THREE.Mesh(M.mobilia.table_low ? M.mobilia.table_low.geo : mesaG.geo, (M.mobilia.table_low || mesaG).mat); mr.position.set(sr.cx, 0, sr.cz); mr.scale.set(2.6, 1.3, 1.6); g.add(mr);
  // as cadeiras soltas (a do gerente + as 8 da sala de reunioes): uma instancia
  ab.lugaresReuniao = [];
  const cadSoltas = new THREE.InstancedMesh(cad.geo, cad.mat, 9);
  _m.compose(_p.set(sg.cx, 0, sg.cz - 1.75), _q.identity(), _s.setScalar(0.72)); cadSoltas.setMatrixAt(0, _m);
  for (let i = 0; i < 8; i++) { const lado = i < 4 ? -1 : 1, x = sr.cx + ((i % 4) - 1.5) * 1.3, z = sr.cz + lado * 1.6; _m.compose(_p.set(x, 0, z), _q.setFromEuler(_e.set(0, lado < 0 ? 0 : Math.PI, 0)), _s.setScalar(0.72)); cadSoltas.setMatrixAt(i + 1, _m); ab.lugaresReuniao.push({ x, z: z + lado * 0.1, ry: lado < 0 ? 0 : Math.PI }); }
  cadSoltas.instanceMatrix.needsUpdate = true; g.add(cadSoltas);
  const monG = new THREE.InstancedMesh(geoMon, matMon, 2);
  [-0.4, 0.4].forEach((dx, i) => { _m.compose(_p.set(sg.cx + dx, 0.78, sg.cz - 0.2), _q.setFromEuler(_e.set(0, Math.PI + dx * 0.5, 0)), _s.setScalar(1)); monG.setMatrixAt(i, _m); });
  monG.instanceMatrix.needsUpdate = true; g.add(monG);
  const sc = P.salas.copa, balcao = new THREE.Mesh(new THREE.BoxGeometry(sc.w - 1.6, 0.95, 0.9), new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.6, metalness: 0.2 })); balcao.position.set(sc.cx, 0.475, sc.z + 0.9); g.add(balcao);
  const maq = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.45), new THREE.MeshStandardMaterial({ color: 0x8a8a92, metalness: 0.8, roughness: 0.3 })); maq.position.set(sc.cx + 1.2, 1.25, sc.z + 0.9); g.add(maq);
  const ledMaq = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: COR.ok, toneMapped: false })); ledMaq.position.set(sc.cx + 1.2, 1.4, sc.z + 1.14); g.add(ledMaq);
  ab.cafe = { x: sc.cx + 1.2, z: sc.z + 2.0, ry: Math.PI };
  if (M.mobilia.chair_stool) { const bi = new THREE.InstancedMesh(M.mobilia.chair_stool.geo, M.mobilia.chair_stool.mat, 3); for (let i = 0; i < 3; i++) { _m.compose(_p.set(sc.cx - 2.2 + i * 1.1, 0, sc.z + 2.2), _q.identity(), _s.setScalar(0.75)); bi.setMatrixAt(i, _m); } bi.instanceMatrix.needsUpdate = true; g.add(bi); }
  if (M.mobilia.couch) { const so = new THREE.Mesh(M.mobilia.couch.geo, M.mobilia.couch.mat); so.position.set(sc.cx - 1.4, 0, sc.z + 4.6); so.rotation.y = Math.PI; so.scale.setScalar(0.8); g.add(so); }
  const sa = P.salas.arquivo, matRack = new THREE.MeshStandardMaterial({ color: 0x101016, metalness: 0.8, roughness: 0.35 });
  const racks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 2.4, 1.1), matRack, 3);
  // os LEDs do arquivo: uma instancia com cor por LED (piscam com os eventos do andar)
  ab.ledsArquivo = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 18);
  for (let i = 0; i < 3; i++) {
    const rx = sa.x + 0.9 + i * 1.6, rz = sa.cz - 1.2; _m.compose(_p.set(rx, 1.2, rz), _q.identity(), _s.setScalar(1)); racks.setMatrixAt(i, _m);
    for (let k = 0; k < 6; k++) { const j = i * 6 + k; _m.compose(_p.set(rx - 0.2 + (k % 3) * 0.2, 0.4 + Math.floor(k / 3) * 1.4, rz + 0.58), _q.identity(), _s.setScalar(1)); ab.ledsArquivo.setMatrixAt(j, _m); ab.ledsArquivo.setColorAt(j, _c.set(k % 2 ? COR.cy : COR.ok)); }
  }
  racks.instanceMatrix.needsUpdate = true; ab.ledsArquivo.instanceMatrix.needsUpdate = true; ab.ledsArquivo.instanceColor.needsUpdate = true; g.add(racks); g.add(ab.ledsArquivo);
  ab.arquivo = { x: sa.cx, z: sa.cz + 0.9, ry: 0 };
  // --- o nucleo do elevador com PORTA (q16): dois paineis que abrem
  const nuc = new THREE.Mesh(new THREE.CylinderGeometry(P.NUC - 0.4, P.NUC - 0.4, H - LAJE, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0x0e1418, metalness: 0.9, roughness: 0.12, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  nuc.userData.proprio = true; nuc.position.y = (H - LAJE) / 2; g.add(nuc);
  const moldura = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.7, 0.12), new THREE.MeshStandardMaterial({ color: 0x3a2e10, metalness: 0.9, roughness: 0.2 })); moldura.position.set(0, 1.35, P.NUC - 0.35); g.add(moldura);
  const matPorta = new THREE.MeshStandardMaterial({ color: 0x8a7a50, metalness: 0.95, roughness: 0.2, envMapIntensity: 1.2 });
  const pe = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.5, 0.06), matPorta), pd = pe.clone(); pe.position.set(-0.47, 1.25, P.NUC - 0.26); pd.position.set(0.47, 1.25, P.NUC - 0.26); g.add(pe); g.add(pd);
  ab.porta = { e: pe, d: pd, abertura: 0, alvo: 0, usoAte: 0 };
  ab.elevador = P.elevador;
  // --- as ilhas: mesas, cadeiras, monitores com GRAFICO (q12), ecras instanciados; crachás e objectos da multidao
  const nIlhas = P.sectores.reduce((t, s) => t + s.ilhasPos.length, 0), nLug = P.lugares.length;
  const mm = M.mobilia.table_medium_long, largMesa = P.porIlha === 8 ? 1.4 : 1.05;
  const mesas = new THREE.InstancedMesh(mm.geo, mm.mat, Math.max(1, nIlhas * 2)), cadeiras = new THREE.InstancedMesh(cad.geo, cad.mat, Math.max(1, nLug));
  const monitores = new THREE.InstancedMesh(geoMon, matMon, Math.max(1, nLug));
  ab.texEcra = texturaEcra(ctx);
  const ecras = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.56, 0.36), new THREE.MeshBasicMaterial({ map: ab.texEcra, toneMapped: false }), Math.max(1, nLug));
  let iM = 0;
  P.sectores.forEach(s => s.ilhasPos.forEach(ip => { [-0.45, 0.45].forEach(dz => { _m.compose(_p.set(ip.x, 0, ip.z + dz), _q.identity(), _s.set(largMesa, 0.8, 0.8)); mesas.setMatrixAt(iM++, _m); }); }));
  P.lugares.forEach((l, i) => {
    const dz = l.ry === 0 ? -0.25 : 0.25;
    _m.compose(_p.set(l.x, 0, l.z + dz), _q.setFromEuler(_e.set(0, l.ry, 0)), _s.setScalar(0.72)); cadeiras.setMatrixAt(i, _m);
    const dm = l.ry === 0 ? 0.95 : -0.95, topo = 0.78;
    _m.compose(_p.set(l.x, topo, l.z + dm), _q.setFromEuler(_e.set(0, l.ry, 0)), _s.setScalar(1)); monitores.setMatrixAt(i, _m);
    _m.compose(_p.set(l.x, topo + 0.21, l.z + dm - (l.ry === 0 ? 0.035 : -0.035)), _q.setFromEuler(_e.set(0, l.ry + Math.PI, 0)), _s.setScalar(1)); ecras.setMatrixAt(i, _m);
    l.iEcra = i; l.monitor = { x: l.x, y: topo + 0.2, z: l.z + dm };
  });
  [mesas, cadeiras, monitores, ecras].forEach(x => { x.instanceMatrix.needsUpdate = true; x.userData.proprio = false; g.add(x); });
  ab.ecras = ecras; ab.ecrasQuentes = new Map();
  // --- plantas e candeeiros nos cantos e ao longo da frente (q23)
  const pl = M.mobilia.cactus_medium_A, la = M.mobilia.lamp_standing;
  const plantas = new THREE.InstancedMesh(pl.geo, pl.mat, 8), cand = new THREE.InstancedMesh(la.geo, la.mat, 4);
  for (let i = 0; i < 8; i++) { _m.compose(_p.set(-W / 2 + 2 + i * (W - 4) / 7, 0, D / 2 - 0.9), _q.identity(), _s.setScalar(1.1)); plantas.setMatrixAt(i, _m); }
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], i) => { _m.compose(_p.set(sx * (W / 2 - 1.1), 0, sz * (D / 2 - 1.1)), _q.identity(), _s.setScalar(0.9)); cand.setMatrixAt(i, _m); });
  plantas.instanceMatrix.needsUpdate = true; cand.instanceMatrix.needsUpdate = true;
  g.add(plantas); g.add(cand);
  // --- os ecras de parede com os graficos (q23): tres paineis por cima das salas ao fundo
  ab.paredes = [];
  [['trilho', -W / 2 + 6.5], ['veloc', 0], ['numeros', W / 2 - 7.5]].forEach(([tipo, x]) => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.2), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, transparent: true }));
    mesh.position.set(x, 2.1 + 1.6 + 0.2, -D / 2 + 0.25); g.add(mesh); mesh.userData.proprio = true;
    ab.paredes.push({ tipo, c, t, mesh, ass: '' });
  });
  pintarParedes(ab, ctx);
  // --- a luz de dentro
  const luz = new THREE.PointLight(0xffe2a8, noite ? 240 : 110, 46, 2); luz.position.set(0, H - 0.9, 0); g.add(luz); ab.luz = luz;
  // --- A GENTE (q08: todos pessoas). Actores = os programas do andar (agem ao segundo) + o gerente + os lideres;
  // a multidao = o resto, sentada e instanciada. Lugar: o do seu sector, senao o livre mais perto.
  const progs = (T3B.estado.EST && T3B.estado.EST.programas || []).filter(p => p.andar === ab.n);
  const porId = {}; gente.forEach((p, i) => { porId[p[0]] = i; });
  const lugarDe = new Array(gente.length).fill(null);
  const livres = s => P.lugares.filter(l => !l.ocupado && (!s || l.sector.id === s));
  ab.actores = []; ab.porProg = {};
  progs.forEach(p => {
    let idx = porId['fonte:' + p.id]; if (idx == null && p.sec) idx = gente.findIndex(x => x[3] === p.sec && x[2] === 'posto');
    const s = p.sec || (idx != null && idx >= 0 ? gente[idx][3] : null);
    const nome = p.curto || p.id, eGerente = ab.a.gerente && (nome.indexOf(ab.a.gerente) >= 0 || /^Gerente/.test(nome)) && !ab.lugarGerente.ocupado;
    const l = eGerente ? ab.lugarGerente : (livres(s)[0] || livres()[0]); if (!l) return;
    l.ocupado = 'prog:' + p.id; if (idx != null && idx >= 0) lugarDe[idx] = l;
    const ac = novoActor(ab, ctx, { id: p.id, nome, lugar: l, sem: U.semente(p.id), especie: p.esp || 'posto', cargo: p.cargo, prog: p, lider: eGerente, nivel: eGerente ? 'gerente' : nivelDe(nome, '', false) });
    ab.actores.push(ac); ab.porProg[p.id] = ac;
  });
  // q07 "sala de vidro propria": o gabinete nunca fica vazio - sem programa com o nome do gerente, senta-se la o GERENTE do
  // andar (o nome vem do organograma: gerente_nome), de fato e com a coroa
  if (!ab.lugarGerente.ocupado && ab.a.gerente) {
    const nomeG = 'Gerente ' + ab.a.gerente, idG = 'gerente:' + ab.n;
    ab.lugarGerente.ocupado = idG;
    const acG = novoActor(ab, ctx, { id: idG, nome: nomeG, lugar: ab.lugarGerente, sem: U.semente(idG), especie: 'agente', cargo: 'gerente do andar', prog: null, lider: true, nivel: 'gerente' });
    ab.actores.push(acG);
  }
  // os lideres de sector tambem sao actores (fazem a ronda, q17); limite para o andar ficar leve
  let nLid = 0;
  gente.forEach((p, i) => {
    if (lugarDe[i] || !p[6] || nLid >= 10) return;
    const l = livres(p[3])[0] || livres()[0]; if (!l) return;
    l.ocupado = p[0]; lugarDe[i] = l; l.pessoa = p; nLid++;
    const ac = novoActor(ab, ctx, { id: p[0], nome: p[1], lugar: l, sem: U.semente(p[0]), especie: p[2], cargo: p[4], prog: null, lider: true, nivel: 'supervisor' });
    ab.actores.push(ac);
  });
  const porVar = new Map(); ab.multidao = []; ab.multidaoLugares = [];
  gente.forEach((p, i) => {
    if (lugarDe[i]) return;
    const l = livres(p[3])[0] || livres()[0]; if (!l) return;
    l.ocupado = p[0]; lugarDe[i] = l; l.pessoa = p;
    const v = variantePara('agente', U.semente(p[0])); if (!porVar.has(v)) porVar.set(v, []); porVar.get(v).push({ l, esp: p[2] });
  });
  // LOD (obra 4): cada actor sentado tem TAMBEM um lugar na multidao instanciada. Sentado e quieto (ou longe da camara) mostra-se
  // a instancia (custa 0 chamadas a mais) e esconde-se o boneco inteiro (8 a 12 chamadas); quando se levanta, troca.
  ab.actores.forEach(ac => { if (!ac.lugar || !ac.variante || !ac.variante.sentado.geo) return; if (!porVar.has(ac.variante)) porVar.set(ac.variante, []); porVar.get(ac.variante).push({ l: ac.lugar, esp: ac.especie, ac }); });
  const geoCracha = new THREE.BoxGeometry(0.16, 0.1, 0.03), matCracha = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const todasMult = []; porVar.forEach(ls => ls.forEach(x => todasMult.push(x)));
  const crachas = new THREE.InstancedMesh(geoCracha, matCracha, Math.max(1, todasMult.length)); let iC = 0;
  porVar.forEach((ls, v) => {
    if (!v.sentado.geo) return;
    const im = new THREE.InstancedMesh(v.sentado.geo, v.sentado.mat, ls.length);
    ls.forEach((x, i) => {
      const l = x.l, dz = l.ry === 0 ? -0.15 : 0.15;
      _m.compose(_p.set(l.x, v.base * v.escala + 0.06, l.z + dz), _q.setFromEuler(_e.set(0, l.ry, 0)), _s.setScalar(1)); im.setMatrixAt(i, _m);
      im.setColorAt(i, tintaDaEspecie(x.esp));
      _m.compose(_p.set(l.x, 1.12, l.z + dz + (l.ry === 0 ? 0.2 : -0.2)), _q.setFromEuler(_e.set(0, l.ry, 0)), _s.setScalar(1)); crachas.setMatrixAt(iC, _m); crachas.setColorAt(iC, _c.set(COR_ESPECIE[x.esp] || 0x888888));
      if (x.ac) { x.ac.inst = { im, i, iC, m: im.instanceMatrix.array.slice(i * 16, i * 16 + 16), mc: crachas.instanceMatrix.array.slice(iC * 16, iC * 16 + 16) }; x.ac.instVisivel = true; x.ac.obj.visible = false; }
      else l.inst = { im, i };
      iC++;
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; g.add(im); ab.multidao.push(im);
  });
  crachas.instanceMatrix.needsUpdate = true; if (crachas.instanceColor) crachas.instanceColor.needsUpdate = true; g.add(crachas); ab.crachas = crachas;
  ab.multidaoLugares = todasMult.filter(x => !x.ac).map(x => x.l);
  ab.grelha = grelhaDoAndar(P, W, D);
  ab.nomes = []; ab.pronto = true; ab.encontros = 0; ab.reunioes = []; ab.alertasFarol = new Map();
  ab.lodNivel = -1;
  actualizarFita(ab, ctx);                                       // obra 4: a fita do P&L em 3D (G32)
}
function tintaDaEspecie(esp) { return _c.set(COR_ESPECIE[esp] || 0x9a9aa6).lerp(_c2.set(0xffffff), 0.68); }   // a cor da especie na roupa, sem pintar a cara de roxo

// o grafico que corre em TODOS os monitores (q12): o trilho do dia, desenhado uma vez por leitura do torre.json
function texturaEcra(ctx) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.userData.c = c; t.userData.ass = ''; pintarEcra(t, ctx); return t;
}
export function pintarEcra(t, ctx) {
  const T = ctx.T3B.estado.T, md = (T && T.reactor && T.reactor.medidor) || {}, serie = Array.isArray(md.serie) ? md.serie : [];
  const ass = serie.length + ':' + (serie.length ? serie[serie.length - 1][1] : '') + ':' + (ctx.noite ? 1 : 0);
  if (t.userData.ass === ass) return; t.userData.ass = ass;
  const c = t.userData.c, g = c.getContext('2d'), w = 256, h = 160;
  g.setTransform(2, 0, 0, 2, 0, 0);
  g.fillStyle = '#0b1218'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(45,212,232,.18)'; g.lineWidth = 1; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(0, i * h / 5); g.lineTo(w, i * h / 5); g.stroke(); }
  const vals = serie.map(p => Number(p[1])).filter(isFinite);
  if (vals.length > 1) {
    const mn = Math.min(0, ...vals), mx = Math.max(0, ...vals), sp = (mx - mn) || 1;
    g.beginPath(); vals.forEach((v, i) => { const x = i / (vals.length - 1) * w, y = h - 10 - (v - mn) / sp * (h - 30); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.strokeStyle = vals[vals.length - 1] >= 0 ? '#3fd69a' : '#ff5a5f'; g.lineWidth = 3; g.stroke();
    g.font = '600 22px "JetBrains Mono", monospace'; g.fillStyle = g.strokeStyle; g.fillText((vals[vals.length - 1] >= 0 ? '+' : '') + vals[vals.length - 1].toFixed(2), 8, 24);
  } else { g.font = '500 18px "JetBrains Mono", monospace'; g.fillStyle = '#6a6a76'; g.fillText('à espera do dia…', 10, h / 2); }
  g.font = '500 12px "JetBrains Mono", monospace'; g.fillStyle = '#f2c230'; g.fillText('3BRAIN · resultado do dia', 8, h - 8);
  t.needsUpdate = true;
}
// os tres ecras de parede: trilho, velocimetro, numeros do andar (so se repintam quando o dado muda)
export function pintarParedes(ab, ctx) {
  const T = ctx.T3B.estado.T; if (!ab.paredes) return;
  const r = (T && T.reactor) || {}, md = r.medidor || {}, je = r.ja_entrou || {}, serie = Array.isArray(md.serie) ? md.serie : [];
  ab.paredes.forEach(p => {
    const ass = p.tipo + ':' + serie.length + ':' + md.agora + ':' + je.operacoes + ':' + (ctx.T3B.estado.ritmo ? ctx.T3B.estado.ritmo.n : 0) + ':' + ab.andarPessoas;
    if (p.ass === ass) return; p.ass = ass;
    const g = p.c.getContext('2d'), w = 512, h = 256;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, p.c.width, p.c.height); g.setTransform(2, 0, 0, 2, 0, 0); g.fillStyle = 'rgba(8,10,14,.92)'; g.beginPath(); g.roundRect ? g.roundRect(0, 0, w, h, 18) : g.rect(0, 0, w, h); g.fill();
    g.strokeStyle = 'rgba(242,194,48,.5)'; g.lineWidth = 3; g.stroke();
    g.font = '600 20px "JetBrains Mono", monospace'; g.fillStyle = '#f2c230';
    if (p.tipo === 'trilho') {
      g.fillText('TRILHO DO DIA', 20, 34);
      const vals = serie.map(x => Number(x[1])).filter(isFinite);
      if (vals.length > 1) { const mn = Math.min(0, ...vals), mx = Math.max(0, ...vals), sp = (mx - mn) || 1; g.beginPath(); vals.forEach((v, i) => { const x = 20 + i / (vals.length - 1) * (w - 40), y = h - 30 - (v - mn) / sp * (h - 90); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.strokeStyle = vals[vals.length - 1] >= 0 ? '#3fd69a' : '#ff5a5f'; g.lineWidth = 4; g.stroke(); g.fillStyle = g.strokeStyle; g.font = '600 34px "JetBrains Mono", monospace'; g.fillText((vals[vals.length - 1] >= 0 ? '+' : '') + vals[vals.length - 1].toFixed(2) + ' US$', 20, 80); }
      else { g.fillStyle = '#6a6a76'; g.fillText('sem trilho ainda', 20, h / 2); }
    } else if (p.tipo === 'veloc') {
      g.fillText('RESULTADO DO DIA', 20, 34);
      const v = Number(md.agora), lim = Number((r.limites || {}).perda_dia_usd), mx = Math.max(10, Math.abs(v) * 1.3, Math.abs(lim) || 0);
      const cx = w / 2, cy = h * 0.78, R = 90, a0 = Math.PI * 5 / 6, a1 = Math.PI * 13 / 6, ang = x => a0 + (a1 - a0) * Math.max(0, Math.min(1, (x + mx) / (2 * mx)));
      g.lineCap = 'round'; g.lineWidth = 12; g.strokeStyle = '#22222b'; g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke();
      if (isFinite(v)) { g.strokeStyle = v >= 0 ? '#3fd69a' : '#ff5a5f'; g.beginPath(); g.arc(cx, cy, R, Math.min(ang(0), ang(v)), Math.max(ang(0), ang(v))); g.stroke(); g.strokeStyle = '#ffdc6a'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang(v)) * (R - 6), cy + Math.sin(ang(v)) * (R - 6)); g.stroke(); g.fillStyle = v >= 0 ? '#3fd69a' : '#ff5a5f'; g.font = '600 30px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText((v >= 0 ? '+' : '') + v.toFixed(2), cx, cy + 36); g.textAlign = 'left'; }
    } else {
      g.fillText('ANDAR ' + ab.n + ' · ' + cortarTexto(String(ab.a.nome || ''), 22).toUpperCase(), 20, 34);
      const rit = ctx.T3B.estado.ritmo || {}, ev = (rit.porAndar || {})[String(ab.n)] || 0;
      const linhas = [['funcionários', ab.andarPessoas], ['eventos · 60 s', ev], ['operações', je.operacoes != null ? je.operacoes : '—'], ['acerto', je.acerto_pct != null ? Number(je.acerto_pct).toFixed(1) + '%' : '—']];
      g.font = '500 20px "JetBrains Mono", monospace';
      linhas.forEach((l, i) => { g.fillStyle = '#9797a3'; g.fillText(l[0], 20, 80 + i * 40); g.fillStyle = '#ffdc6a'; g.font = '600 26px "JetBrains Mono", monospace'; g.textAlign = 'right'; g.fillText(String(l[1]), w - 24, 82 + i * 40); g.textAlign = 'left'; g.font = '500 20px "JetBrains Mono", monospace'; });
    }
    p.t.needsUpdate = true;
  });
}

// ================================================================ A FITA DO P&L EM 3D (G32, obra 4) — dentro do escritorio
// Ele (questionario 3): "Fita do P&L 3D -> dentro do escritorio". Uma fita que flutua por cima do corredor das salas, com o
// resultado em papel ACUMULADO dia a dia (torre.json -> reactor.ja_entrou.por_dia): sobe a verde, desce a vermelho, e a
// ponta de HOJE brilha. Nao roda em ciclo (sem dados nao mexe): cada evento do P&L (t3b_ligacoes.js: 'fita') faz uma luz
// correr a fita ate a ponta de hoje, e a ponta pulsar.
export function actualizarFita(ab, ctx) {
  if (!ab || !ab.pronto) return;
  const T = ctx.T3B.estado.T, je = T && T.reactor && T.reactor.ja_entrou, pd = je && je.por_dia;
  if (!pd || typeof pd !== 'object') return;
  const dias = Object.keys(pd).sort(); if (dias.length < 2) return;
  const ass = dias.length + ':' + dias.map(d => pd[d]).join(',');
  if (ab.fita && ab.fita.ass === ass) return;
  if (ab.fita) { ab.grupo.remove(ab.fita.g); ab.fita.g.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material) { if (x.material.map) x.material.map.dispose(); x.material.dispose(); } }); }
  let acc = 0; const vals = dias.map(d => (acc += Number(pd[d]) || 0));
  const { D } = ctx, g = new THREE.Group(); g.userData.proprio = true;
  const N = vals.length, L = 26, z = -D / 2 + 7.0, base = 2.5, alt = 1.15, prof = 0.34;
  const mn = Math.min(0, ...vals), mx = Math.max(0, ...vals), sp = (mx - mn) || 1;
  const X = i => -L / 2 + L * i / (N - 1), Y = v => base + (v - mn) / sp * alt;
  const pos = [], cor = [], idx = [], c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const sobe = i === 0 ? vals[0] >= 0 : vals[i] >= vals[i - 1];
    c.set(sobe ? 0x3fd69a : 0xff5a5f);
    pos.push(X(i), Y(vals[i]), z - prof / 2, X(i), Y(vals[i]), z + prof / 2);
    cor.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3)); geo.setIndex(idx);
  const fita = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  g.add(fita);
  const borda = new THREE.Line(new THREE.BufferGeometry().setFromPoints(vals.map((v, i) => new THREE.Vector3(X(i), Y(v), z + prof / 2))), new THREE.LineBasicMaterial({ color: 0xffdc6a, transparent: true, opacity: 0.85, toneMapped: false }));
  g.add(borda);
  // 05/10 (Q4 B9 "mais nitido"): a aresta de tras tambem desenhada - a fita ganha espessura e contorno
  const borda2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(vals.map((v, i) => new THREE.Vector3(X(i), Y(v), z - prof / 2))), new THREE.LineBasicMaterial({ color: 0xffdc6a, transparent: true, opacity: 0.45, toneMapped: false }));
  g.add(borda2);
  const zero = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-L / 2, Y(0), z), new THREE.Vector3(L / 2, Y(0), z)]), new THREE.LineDashedMaterial({ color: 0x8b8a93, dashSize: 0.3, gapSize: 0.25, transparent: true, opacity: 0.6 }));
  zero.computeLineDistances(); g.add(zero);
  const ponta = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshBasicMaterial({ color: 0xf2c230, toneMapped: false }));
  ponta.position.set(X(N - 1), Y(vals[N - 1]), z + prof / 2); g.add(ponta);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctx.texturaHalo(), color: 0xf2c230, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(1.1, 1.1, 1); ponta.add(halo);
  const luz = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctx.texturaHalo(), color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); luz.scale.set(0.9, 0.9, 1); g.add(luz);
  const tot = vals[N - 1], txt = 'P&L em papel acumulado · ' + (tot >= 0 ? '+' : '−') + Math.abs(tot).toFixed(2).replace('.', ',') + ' US$ · ' + N + ' dias';
  const etq = placaDeTexto(txt.split(' · ')[0], txt.split(' · ').slice(1).join(' · '), new THREE.Color(tot >= 0 ? 0x3fd69a : 0xff5a5f), 3.6, true);
  etq.position.set(-L / 2 + 1.9, base + alt + 0.55, z); g.add(etq);
  ab.grupo.add(g);
  ab.fita = { g, ass, ponta, halo, luz, pts: vals.map((v, i) => new THREE.Vector3(X(i), Y(v), z + prof / 2)), pulso: 0, corre: -1, n: 0 };
}
export function pulsoFita(ab) { if (!ab || !ab.fita) return; ab.fita.pulso = 1; ab.fita.corre = 0; ab.fita.lenta = false; ab.fita.n++; }
export function passoFita(ab, dt) {
  const f = ab && ab.fita; if (!f) return false;
  // 05/10 (Q4 B9, ele: "fica - so otimizar, deixar mais fluido e mais nitido"): a fita so mexia com um evento do P&L. Agora a
  // ponta de hoje respira sempre e uma luz percorre a fita devagar a cada ~4 s (depressa a cada evento real do P&L).
  f.tt = (f.tt || 0) + dt;
  const resp = 0.5 + 0.5 * Math.sin(f.tt * 2.2);
  if (f.pulso > 0.01) f.pulso *= Math.pow(0.25, dt); else f.pulso = 0;
  f.ponta.scale.setScalar(1 + 0.08 * resp + f.pulso * 0.8); f.halo.material.opacity = 0.55 + 0.25 * resp + f.pulso * 0.3;
  if (f.corre < 0 && f.tt - (f.fimCorre || 0) > 3.8) { f.corre = 0; f.lenta = true; }
  if (f.corre >= 0) {
    f.corre += dt / (f.lenta ? 2.8 : 1.2); const u = Math.min(1, f.corre), k = u * (f.pts.length - 1), i = Math.min(f.pts.length - 2, Math.floor(k));
    f.luz.position.copy(f.pts[i]).lerp(f.pts[i + 1], k - i); f.luz.material.opacity = u < 1 ? (f.lenta ? 0.55 : 0.9) * Math.sqrt(Math.sin(u * Math.PI)) : 0;
    if (f.corre >= 1) { f.corre = -1; f.fimCorre = f.tt; f.lenta = false; }
  }
  return true;
}

// ================================================================ a grelha e o caminho (BFS 4-vizinhos, pixel-agents)
const CEL = 0.6;
function grelhaDoAndar(P, W, D) {
  const cols = Math.ceil(W / CEL), lins = Math.ceil(D / CEL), bloq = new Uint8Array(cols * lins);
  const marca = (x0, z0, x1, z1) => { for (let x = Math.floor((x0 + W / 2) / CEL); x <= Math.floor((x1 + W / 2) / CEL); x++) for (let z = Math.floor((z0 + D / 2) / CEL); z <= Math.floor((z1 + D / 2) / CEL); z++) if (x >= 0 && z >= 0 && x < cols && z < lins) bloq[z * cols + x] = 1; };
  const mi = P.meiaIlha || 1.6;
  P.sectores.forEach(s => s.ilhasPos.forEach(ip => marca(ip.x - mi, ip.z - 0.9, ip.x + mi, ip.z + 0.9)));
  // 04/10 (c02 "boneco a atravessar paredes"): as paredes de vidro entre sectores e o sofa da copa entram na grelha
  (P.paredes || []).forEach(w => { if (w.vert) marca(w.x - 0.12, w.z - w.larg / 2, w.x + 0.12, w.z + w.larg / 2); else marca(w.x - w.larg / 2, w.z - 0.12, w.x + w.larg / 2, w.z + 0.12); });
  { const sc = P.salas.copa; marca(sc.cx - 2.3, sc.z + 4.2, sc.cx - 0.5, sc.z + 5.0); }
  const n = P.NUC - 0.4; marca(-n, -n, n, n);
  Object.entries(P.salas).forEach(([k, s]) => { marca(s.x, s.z, s.x + 0.2, s.z + s.d); marca(s.x + s.w - 0.2, s.z, s.x + s.w, s.z + s.d); marca(s.x, s.z + s.d - 0.2, s.cx - 1.0, s.z + s.d); marca(s.cx + 1.0, s.z + s.d - 0.2, s.x + s.w, s.z + s.d); if (k === 'reuniao') marca(s.cx - 3.2, s.cz - 1.0, s.cx + 3.2, s.cz + 1.0); if (k === 'gerente') marca(s.cx - 1.6, s.cz - 1.1, s.cx + 1.6, s.cz - 0.2); if (k === 'copa') marca(s.x + 0.8, s.z + 0.5, s.x + s.w - 0.8, s.z + 1.4); if (k === 'arquivo') marca(s.x + 0.4, s.cz - 1.8, s.x + 5.2, s.cz - 0.6); });
  // os candeeiros dos cantos e as plantas da frente tambem sao obstaculos (atravessavam-nos)
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => { const x = sx * (W / 2 - 1.1), z = sz * (D / 2 - 1.1); marca(x - 0.35, z - 0.35, x + 0.35, z + 0.35); });
  for (let i = 0; i < 8; i++) { const x = -W / 2 + 2 + i * (W - 4) / 7; marca(x - 0.4, D / 2 - 1.3, x + 0.4, D / 2 - 0.5); }
  for (let x = 0; x < cols; x++) { bloq[x] = 1; bloq[(lins - 1) * cols + x] = 1; }
  for (let z = 0; z < lins; z++) { bloq[z * cols] = 1; bloq[z * cols + cols - 1] = 1; }
  return { cols, lins, bloq, W, D };
}
function celula(gr, x, z) { return { c: Math.max(0, Math.min(gr.cols - 1, Math.floor((x + gr.W / 2) / CEL))), l: Math.max(0, Math.min(gr.lins - 1, Math.floor((z + gr.D / 2) / CEL))) }; }
function livreMaisPerto(gr, c) {
  if (!gr.bloq[c.l * gr.cols + c.c]) return c;
  for (let r = 1; r < 10; r++) for (let dc = -r; dc <= r; dc++) for (let dl = -r; dl <= r; dl++) { const cc = c.c + dc, ll = c.l + dl; if (cc > 0 && ll > 0 && cc < gr.cols - 1 && ll < gr.lins - 1 && !gr.bloq[ll * gr.cols + cc]) return { c: cc, l: ll }; }
  return c;
}
export function caminho(gr, x0, z0, x1, z1) {
  const a = livreMaisPerto(gr, celula(gr, x0, z0)), b = livreMaisPerto(gr, celula(gr, x1, z1));
  const k = (c, l) => l * gr.cols + c, fim = k(b.c, b.l), pai = new Int32Array(gr.cols * gr.lins).fill(-1);
  const fila = [k(a.c, a.l)]; pai[fila[0]] = fila[0]; let cabeca = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (cabeca < fila.length) {
    const cur = fila[cabeca++]; if (cur === fim) break;
    const cc = cur % gr.cols, ll = (cur / gr.cols) | 0;
    for (const [dc, dl] of dirs) { const nc = cc + dc, nl = ll + dl, nk = k(nc, nl); if (nc < 0 || nl < 0 || nc >= gr.cols || nl >= gr.lins || gr.bloq[nk] || pai[nk] >= 0) continue; pai[nk] = cur; fila.push(nk); }
  }
  if (pai[fim] < 0) return [{ x: x1, z: z1 }];
  const pts = []; let cur = fim;
  while (cur !== pai[cur]) { pts.push({ x: (cur % gr.cols) * CEL - gr.W / 2 + CEL / 2, z: ((cur / gr.cols) | 0) * CEL - gr.D / 2 + CEL / 2 }); cur = pai[cur]; }
  pts.reverse();
  // q16 "simulando caminhada normal": a escada de quadrados da BFS vira linhas rectas (puxar o fio: de cada ponto, salta
  // para o MAIS LONGE que se ve sem atravessar mesa nem parede, com a largura de um corpo). Andam na diagonal pelos
  // corredores e so viram nas esquinas, como gente.
  pts.unshift({ x: x0, z: z0 }); pts.push({ x: x1, z: z1 });
  const out = []; let i = 0;
  while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !seVe(gr, pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
  return out;
}
const _corpo = [[0, 0], [0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22]];
function seVe(gr, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, n = Math.ceil(Math.hypot(dx, dz) / (CEL * 0.4));
  for (let i = 1; i < n; i++) { const x = a.x + dx * i / n, z = a.z + dz * i / n; for (const [ox, oz] of _corpo) { const c = celula(gr, x + ox, z + oz); if (gr.bloq[c.l * gr.cols + c.c]) return false; } }
  return true;
}

// ================================================================ OS ACTORES
function novoActor(ab, ctx, o) {
  const v = variantePara(o.nivel, o.sem), obj = v.cena.clone(true);   // (v fica no actor: o LOD poe-no na multidao da sua variante)
  const raiz = new THREE.Group(); raiz.add(obj);
  obj.position.y = v.base * v.escala; obj.scale.set(v.escala * ESBELTO, v.escala, v.escala * ESBELTO);
  const tinta = tintaDaEspecie(o.especie).clone();
  obj.traverse(x => { if (x.isMesh) { x.material = x.material.clone(); x.material.color.copy(tinta); if (o.ouro) { if (x.material.emissive) { x.material.emissive.set(0xf2c230); x.material.emissiveIntensity = 0.3; } else x.material.color.lerp(_c2.set(0xffd25a), 0.55); } x.frustumCulled = true; } });
  const mixer = new THREE.AnimationMixer(obj), acoes = {};
  ['sit', 'idle', 'walk', 'sprint', 'interact-right', 'emote-yes', 'emote-no', 'pick-up', 'holding-right', 'holding-both'].forEach(n => { const c = THREE.AnimationClip.findByName(v.clips, n); if (c) acoes[n] = mixer.clipAction(c); });
  ['interact-right', 'emote-yes', 'emote-no', 'pick-up'].forEach(n => { if (acoes[n]) { acoes[n].setLoop(THREE.LoopOnce, 1); acoes[n].clampWhenFinished = true; } });
  const bracos = []; obj.traverse(x => { if (/^arm-(left|right)$/.test(x.name)) bracos.push({ osso: x, off: 0 }); });
  const maoD = obj.getObjectByName('arm-right'), cabeca = obj.getObjectByName('head');
  const cor = new THREE.Color(COR_ESPECIE[o.especie] || 0x9a9aa6);
  // crachá da especie no peito (q06), objecto da funcao na mao (q06), sinal do nivel por cima (q07), nome a flutuar (q06)
  const cracha = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.03), new THREE.MeshBasicMaterial({ color: cor, toneMapped: false })); cracha.position.set(0.1, 1.12, 0.22); raiz.add(cracha);
  const obj2 = objectoDe(o.nome, o.cargo, o.lugar && o.lugar.sector ? o.lugar.sector.id : '');
  if (obj2 && maoD) { const m = objectoNaMao(obj2); m.position.set(0, -0.55 / v.escala, 0.25 / v.escala); m.scale.setScalar(1 / (v.escala * ESBELTO)); maoD.add(m); }
  let sinal = null;
  if (o.nivel === 'gerente' || o.nivel === 'supervisor') {
    // (tamanho FIXO no ecra, como o nome: de perto a coroa/estrela virava um disco enorme por cima de tudo - v05 "de perto bugado")
    sinal = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaIcone(o.nivel === 'gerente' ? '👑' : '⭐'), transparent: true, depthWrite: false, sizeAttenuation: false }));
    sinal.scale.set(0.045, 0.045, 1); sinal.position.set(0, ALT_PESSOA + 0.55, 0); sinal.renderOrder = 9; raiz.add(sinal);
  }
  const nomeSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaNome(o.nome, cor, o.nivel === 'gerente' ? '👑' : o.nivel === 'supervisor' ? '⭐' : ''), transparent: true, depthWrite: false, depthTest: true, sizeAttenuation: false }));
  nomeSp.scale.set(0.2, 0.2 * 48 / 256, 1); /* tamanho fixo no ecra: de perto o nome nao vira um cartaz, de longe nao some */ nomeSp.position.set(0, ALT_PESSOA + (sinal ? 0.95 : 0.4), 0); nomeSp.renderOrder = 11; nomeSp.visible = false; raiz.add(nomeSp);
  // a barra de progresso por cima (q12): trilho + enchimento escalado em x
  const barra = new THREE.Group(); barra.position.set(0, ALT_PESSOA + 0.22, 0); barra.visible = false;
  const trilho = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.07), new THREE.MeshBasicMaterial({ color: 0x22222b, toneMapped: false, side: THREE.DoubleSide })); barra.add(trilho);
  const ench = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.07), new THREE.MeshBasicMaterial({ color: 0xf2c230, toneMapped: false, side: THREE.DoubleSide })); ench.position.z = 0.002; barra.add(ench); raiz.add(barra);
  const ac = { id: o.id, nome: o.nome, obj: raiz, corpo: obj, mixer, acoes, actual: null, estado: 'sentado', lugar: o.lugar, rota: [], vel: VEL_CALMA, trabalhar: 0, prog: o.prog, visitante: !!o.visitante,
    bracos, sem: o.sem, fila: [], especie: o.especie, nivel: o.nivel, lider: !!o.lider, cor, nomeSp, barra, ench, cabeca, idas: 0, erro: 0, cafeAte: 0, conversa: 0, ouro: !!o.ouro, variante: v, mixerAte: 0 };
  if (o.lugar) { sentar(ac, 0); }
  else { raiz.position.set(ab.elevador.x, 0.02, ab.elevador.z); tocar(ac, 'idle', 0); ac.estado = 'de_pe'; }
  raiz.userData.actor = ac; raiz.userData.proprio = true;
  ab.grupo.add(raiz);
  return ac;
}
function objectoNaMao(tipo) {
  if (tipo === 'tablet') return new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.02), new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.6, roughness: 0.3, emissive: 0x2dd4e8, emissiveIntensity: 0.35 }));
  if (tipo === 'pasta') return new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.05), new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.7 }));
  const g = new THREE.Group(); const aro = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 8, 20), new THREE.MeshStandardMaterial({ color: 0xf2c230, metalness: 0.9, roughness: 0.2 })); g.add(aro);
  const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), aro.material); cabo.position.set(0.1, -0.16, 0); cabo.rotation.z = Math.PI / 4; g.add(cabo); return g;
}
function tocar(ac, nome, fade) {
  ac.mixerAte = performance.now() + 700;                     // (o mixer corre durante o cruzamento, mesmo que fique quieto)
  const nova = ac.acoes[nome] || ac.acoes.idle; if (!nova || ac.actual === nova) return;
  nova.reset(); nova.play();
  if (ac.actual) ac.actual.crossFadeTo(nova, fade == null ? 0.25 : fade, false);
  ac.actual = nova;
}
function sentar(ac, fade) {
  const l = ac.lugar; if (!l) return;
  const dz = l.ry === 0 ? -0.15 : 0.15;
  ac.obj.position.set(l.x, 0.06, l.z + dz); ac.obj.rotation.y = l.ry; ac.alvoRy = null;
  ac.estado = 'sentado'; tocar(ac, 'sit', fade == null ? 0.2 : fade); ac.rota = [];
  if (ac.fila.length) { const f = ac.fila.shift(); setTimeout(() => ida(ac, f[0], f[1], f[2], f[3], f[4]), 500); }
}
export function balaoIcone(ac, icone, dur) {
  if (ac.balao) { ac.obj.remove(ac.balao); ac.balao.material.dispose(); }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaIcone(icone), transparent: true, depthTest: false, depthWrite: false }));
  sp.scale.set(0.55, 0.55, 1); sp.position.set(0.25, ALT_PESSOA + 0.62, 0); sp.renderOrder = 12;
  ac.obj.add(sp); ac.balao = sp; ac.balaoT = dur || 3;
}
// uma IDA (q10): levanta-se, vai por corredores a (x,z), faz `fim` la (entregar / sim / nao / apanhar / olhar / cafe /
// sentar-se), espera, e volta ao lugar (ou ao elevador e some, se e visitante). Nunca mais do que MAX_A_ANDAR a andar.
function aAndar(ab) { return ab.actores.concat(ab.mensageiros).filter(a => a.estado === 'a_andar').length; }
export function ida(ac, x, z, fim, depois, icone) {
  const ab = ac.ab; if (!ab || !ab.grelha) return;
  if (ac.estado !== 'sentado' && ac.estado !== 'a_trabalhar' && ac.estado !== 'de_pe') { if (ac.fila.length < 2) ac.fila.push([x, z, fim, depois, icone]); return; }
  if (aAndar(ab) >= MAX_A_ANDAR) { if (ac.fila.length < 2) ac.fila.push([x, z, fim, depois, icone]); return; }
  ac.obj.position.y = 0.02; ac.estado = 'a_andar'; ac.idas++;
  const l = ac.lugar; if (l && ac.obj.position.distanceTo(_p.set(l.x, 0.02, l.z)) < 0.6) ac.obj.position.z = l.z + (l.ry === 0 ? -0.9 : 0.9);
  ac.rota = caminho(ab.grelha, ac.obj.position.x, ac.obj.position.z, x, z);
  if (icone) balaoIcone(ac, icone, 2.5);
  pedirPorta(ab, ac.obj.position, { x, z });
  ac.aoChegar = () => {
    ac.estado = fim === 'sentar' ? 'reuniao' : 'parado';
    const anim = { entregar: 'interact-right', sim: 'emote-yes', nao: 'emote-no', apanhar: 'pick-up', olhar: 'idle', cafe: 'interact-right', sentar: 'sit', inspeccionar: 'interact-right' }[fim] || 'idle';
    tocar(ac, anim, 0.2);
    if (fim === 'olhar') ac.alvoRy = Math.atan2(0, 1) ; // vira-se para a janela (+z)
    if (fim === 'sim') { ac.salto = 0.6; }
    ac.espera = fim === 'olhar' ? 3.2 : fim === 'cafe' ? 2.6 : fim === 'sentar' ? (ac.reuniaoDur || 14) : 1.7;
    ac.depoisDeEsperar = () => {
      ac.estado = 'a_andar';
      if (depois === 'sumir') { ac.rota = caminho(ab.grelha, ac.obj.position.x, ac.obj.position.z, ab.elevador.x, ab.elevador.z); pedirPorta(ab, ac.obj.position, ab.elevador); ac.aoChegar = () => sumir(ac); }
      else if (ac.lugar) { const l = ac.lugar; ac.rota = caminho(ab.grelha, ac.obj.position.x, ac.obj.position.z, l.x, l.z + (l.ry === 0 ? -0.9 : 0.9)); ac.aoChegar = () => sentar(ac); }
      else { ac.rota = caminho(ab.grelha, ac.obj.position.x, ac.obj.position.z, ab.elevador.x, ab.elevador.z); ac.aoChegar = () => sumir(ac); }
      tocar(ac, 'walk');
    };
  };
  tocar(ac, 'walk');
}
function pedirPorta(ab, de, para) {
  const perto = p => Math.hypot(p.x - ab.elevador.x, p.z - ab.elevador.z) < 1.6;
  if (ab.porta && (perto(de) || perto(para))) ab.porta.usoAte = performance.now() + 2600;
}
function sumir(ac) {
  const ab = ac.ab; if (!ab) return;
  ab.grupo.remove(ac.obj); ac.mixer.stopAllAction();
  const i = ab.mensageiros.indexOf(ac); if (i >= 0) ab.mensageiros.splice(i, 1);
  const j = ab.actores.indexOf(ac); if (j >= 0 && ac.visitante) ab.actores.splice(j, 1);
}
// um actor que nasce no elevador (mensageiro, agente da S.H.I.E.L.D., o Sr. Stark, um contratado)
export function nascerNoElevador(ab, ctx, o) {
  if (!modelos || ab.mensageiros.length >= 8) return null;
  const ac = novoActor(ab, ctx, Object.assign({ lugar: null, visitante: true, especie: 'agente', nivel: 'agente' }, o));
  ac.ab = ab; ab.mensageiros.push(ac); ab.porta.usoAte = performance.now() + 2600;
  return ac;
}

// ================================================================ o passo de cada quadro
export function passoAndar(ab, dt, agora, ctx) {
  let mexe = false; const todos = ab.actores.concat(ab.mensageiros), andando = [];
  todos.forEach(ac => { ac.ab = ab; if (passoActor(ab, ac, dt, agora, ctx)) mexe = true; if (ac.estado === 'a_andar') andando.push(ac); });
  // q16: desviam-se uns dos outros; q17: param e conversam quando se cruzam (so quem ja vai a andar; nada inventado)
  for (let i = 0; i < andando.length; i++) for (let j = i + 1; j < andando.length; j++) {
    const a = andando[i], b = andando[j], dx = b.obj.position.x - a.obj.position.x, dz = b.obj.position.z - a.obj.position.z, d = Math.hypot(dx, dz);
    if (d < 0.75 && d > 0.001) { const k = (0.75 - d) / 0.75 * dt * 1.6; empurrar(ab, a, -dx / d * k * 0.5, dz / d * k * 0.35); empurrar(ab, b, dx / d * k * 0.5, -dz / d * k * 0.35); }
    if (d < 1.1 && !a.conversou && !b.conversou && (ab.forcarEncontro || (a.sem + b.sem + ab.encontros) % 3 === 0)) {
      ab.forcarEncontro = false;
      ab.encontros++; a.conversou = b.conversou = agora + 20000;
      [a, b].forEach((p, k) => { p.espera = 1.8 + k * 0.1; p.estadoAntes = p.estado; p.estado = 'parado'; tocar(p, 'idle', 0.2); balaoIcone(p, ICONES.fala, 1.8); p.alvoRy = Math.atan2((k ? -dx : dx), (k ? -dz : dz)); const f = p.depoisDeEsperar; p.depoisDeEsperar = () => { p.estado = 'a_andar'; tocar(p, 'walk'); if (f) p.depoisDeEsperar = f; }; });
    }
  }
  todos.forEach(ac => { if (ac.conversou && ac.conversou < agora) ac.conversou = 0; });
  // a porta do elevador (q16)
  if (ab.porta) { const p = ab.porta; p.alvo = agora < p.usoAte ? 1 : 0; if (Math.abs(p.abertura - p.alvo) > 0.002) { p.abertura += (p.alvo - p.abertura) * Math.min(1, dt * 4); p.e.position.x = -0.47 - p.abertura * 0.8; p.d.position.x = 0.47 + p.abertura * 0.8; mexe = true; } }
  // os monitores de um sector que acabou de mexer arrefecem
  if (ab.ecrasQuentes && ab.ecrasQuentes.size) { ab.ecrasQuentes.forEach((h, i) => { h.calor -= dt / 1.6; if (h.calor <= 0) { ab.ecrasQuentes.delete(i); h.calor = 0; } ab.ecras.setColorAt(i, corEcra(ctx, h.l, Math.max(0, h.calor))); }); ab.ecras.instanceColor.needsUpdate = true; mexe = true; }
  // os dados a voar para o chefe (q12)
  if (ab.voos && ab.voos.length) { for (let i = ab.voos.length - 1; i >= 0; i--) { const v = ab.voos[i]; v.t += dt / 1.6; if (v.t >= 1.5) { ab.grupo.remove(v.m); v.m.material.dispose(); if (v.linha) { ab.grupo.remove(v.linha); v.linha.geometry.dispose(); v.linha.material.dispose(); } ab.voos.splice(i, 1); continue; } const u = 1 - Math.pow(1 - Math.min(1, v.t), 2); v.m.position.set(v.de.x + (v.para.x - v.de.x) * u, v.de.y + Math.sin(u * Math.PI) * 1.4 + (v.para.y - v.de.y) * u, v.de.z + (v.para.z - v.de.z) * u); v.m.material.opacity = v.t < 1 ? 1 - v.t * 0.5 : Math.max(0, (1.5 - v.t) * 1.0); if (v.linha) { v.linha.geometry.setDrawRange(0, Math.ceil(25 * Math.min(1, u * 1.05))); v.linha.material.opacity = v.t < 1 ? 0.9 : Math.max(0, (1.5 - v.t) * 1.8); } } mexe = true; }
  // os farois dos alertas (anel a girar, feixe a respirar)
  if (ab.alertasFarol && ab.alertasFarol.size) { ab.alertasFarol.forEach(f => { f.anel.rotation.y += dt * 0.9; f.anel2.rotation.y -= dt * 0.6; const b = 0.55 + 0.45 * Math.sin(agora / 700); f.feixe.material.opacity = 0.10 + 0.12 * b; f.halo.material.opacity = 0.35 + 0.4 * b; f.etq.position.y = f.y0 + Math.sin(agora / 1100) * 0.05; }); mexe = true; }
  // os LEDs do arquivo piscam com os eventos do andar (so quando ha evento)
  if (passoFita(ab, dt)) mexe = true;
  if (ab.arquivoQuente > 0) { ab.arquivoQuente -= dt; for (let i = 0; i < 18; i++) ab.ledsArquivo.setColorAt(i, _c.set(((agora / 120 + i) | 0) % 2 ? 0x3fd69a : 0x2dd4e8)); ab.ledsArquivo.instanceColor.needsUpdate = true; mexe = true; }
  return mexe;
}
// 04/10 (obra 4): quieto = sentado sem trabalho, sem balao, sem salto, sem espera, sem rota. Um quieto nao corre o mixer (a pose
// sentada nao muda) e, de longe, e desenhado pela multidao instanciada (lodDoAndar).
export function estaQuieto(ac) { return ac.estado === 'sentado' && !(ac.trabalhar > 0) && !ac.balao && ac.salto == null && !(ac.espera > 0) && !(ac.rota && ac.rota.length) && ac.alvoRy == null && !ac.luzErro; }
function passoActor(ab, ac, dt, agora, ctx) {
  const quieto = estaQuieto(ac);
  if (ac.instVisivel) { if (quieto) return false; trocarLod(ab, ac, false); }
  ac.bracos.forEach(b => { if (b.off) { b.osso.rotation.x -= b.off; b.off = 0; } });
  if (!quieto || agora < ac.mixerAte) ac.mixer.update(dt);
  let mexe = ac.estado !== 'sentado' || agora < ac.mixerAte;
  if (ac.balao) { ac.balaoT -= dt; mexe = true; if (ac.balaoT <= 0) { ac.obj.remove(ac.balao); ac.balao.material.dispose(); ac.balao = null; } }
  if (ac.salto != null) { ac.salto -= dt; const h = Math.max(0, Math.sin(Math.max(0, ac.salto) / 0.6 * Math.PI)) * 0.35; ac.obj.position.y = (ac.estado === 'sentado' ? 0.06 : 0.02) + h; if (ac.salto <= 0) { ac.salto = null; ac.obj.position.y = ac.estado === 'sentado' ? 0.06 : 0.02; } mexe = true; }
  if (ac.espera > 0) { ac.espera -= dt; if (ac.espera <= 0 && ac.depoisDeEsperar) { const f = ac.depoisDeEsperar; ac.depoisDeEsperar = null; f(); } }
  else if (ac.rota && ac.rota.length) {
    const p = ac.obj.position, alvo = ac.rota[0], dx = alvo.x - p.x, dz = alvo.z - p.z, d = Math.hypot(dx, dz);
    if (d < 0.12) { ac.rota.shift(); if (!ac.rota.length && ac.aoChegar) { const f = ac.aoChegar; ac.aoChegar = null; f(); } }
    else { const passo = Math.min(ac.vel * dt, d); p.x += dx / d * passo; p.z += dz / d * passo; ac.alvoRy = Math.atan2(dx, dz); }
    mexe = true;
  }
  if (ac.alvoRy != null) { let dr = ac.alvoRy - ac.obj.rotation.y; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI; ac.obj.rotation.y += dr * Math.min(1, 8 * dt); if (Math.abs(dr) < 0.01) ac.alvoRy = null; mexe = true; }
  // a trabalhar sentado (q12): maos no teclado, monitor aceso, barra de progresso
  if ((ac.estado === 'sentado' || ac.estado === 'a_trabalhar') && ac.trabalhar > 0) {
    ac.trabalhar -= dt; ac.estado = 'a_trabalhar';
    const t = agora / 1000;
    ac.bracos.forEach((b, i) => { b.off = Math.sin(t * 13 + i * 2.1) * 0.16; b.osso.rotation.x += b.off; });
    const quente = Math.max(0, Math.min(1, ac.trabalhar / 2));
    if (ac.lugar && ac.lugar.iEcra != null && ab.ecras) { ab.ecras.setColorAt(ac.lugar.iEcra, corEcra(ctx, ac.lugar, quente)); ab.ecras.instanceColor.needsUpdate = true; }
    ac.barra.visible = true; const p = 1 - Math.min(1, ac.trabalhar / (ac.trabalharTot || 3)); ac.ench.scale.x = Math.max(0.02, p); ac.ench.position.x = -0.35 + 0.35 * p;
    if (ac.trabalhar <= 0) { ac.estado = 'sentado'; ac.barra.visible = false; if (ac.lugar && ac.lugar.iEcra != null) { ab.ecras.setColorAt(ac.lugar.iEcra, corEcra(ctx, ac.lugar, 0)); ab.ecras.instanceColor.needsUpdate = true; } }
    mexe = true;
  }
  return mexe;
}
export function corEcra(ctx, l, calor) {
  const esp = l.pessoa ? l.pessoa[2] : 'posto', base = _c.set(COR_ESPECIE[esp] || 0x2dd4e8).lerp(_c2.set(0xffffff), 0.6).multiplyScalar(ctx.noite ? 0.75 : 0.6);
  return base.lerp(_c2.set(0xffdc6a), Math.min(1, calor)).multiplyScalar(1 + calor * 0.9);
}

// ================================================================ os eventos dentro do andar (q10 modo C + q13 reaccoes)
export function eventoNoAndar(ab, e, ctx) {
  if (!ab || !ab.pronto) return;
  const n = ab.n, agora = performance.now(), T3B = ctx.T3B;
  const actorDe = id => ab.porProg[id] || ab.actores.find(a => a.id === id);
  // 03/10 noite: a contratacao e a demissao vinham DEPOIS do ramo geral das falas deste andar, que retornava antes - nunca
  // corriam (um dos "nao foram activadas" do r05). Agora sao vistas primeiro.
  if (e.k === 'falou' && e.tipo === 'contratacao' && e.andar === n) { contratar(ab, ctx, e); return; }
  if (e.k === 'falou' && e.tipo === 'demissao' && e.andar === n) { const ac = actorDe(e.id) || ab.actores.filter(a => !a.lider && !a.visitante).slice(-1)[0]; if (ac && !ac.lider) { balaoIcone(ac, ICONES.caixa, 4); if (ac.lugar) ac.lugar.ocupado = null; ac.lugar = null; ac.visitante = true; ida(ac, ab.elevador.x, ab.elevador.z, 'entregar', 'sumir', ICONES.caixa); } return; }
  if ((e.k === 'escreveu' || e.k === 'mudou' || e.k === 'falou') && e.andar === n) {
    const ac = actorDe(e.id); const p = T3B.estado.programas[e.id]; if (p && p.sec) acenderSector(ab, p.sec, ctx);
    if (!ac) return;
    ac.trabalharTot = e.k === 'mudou' ? 4.5 : 3; ac.trabalhar = Math.max(ac.trabalhar, ac.trabalharTot);
    const txt = String(e.txt || '');
    // CADA accao vira uma ida (q10/q11), pela natureza do dado:
    if (e.k === 'mudou') {
      balaoIcone(ac, ICONES.grafico, 2.5);
      voarDados(ab, ac, ctx);                                            // os dados voam para o chefe (q12)
      if (/-\d|perd|stop|vermelho/i.test(txt) && /realizado|pnl|liquido|perda/i.test(txt)) { tocar(ac, 'emote-no', 0.2); ac.estado = 'parado'; ac.espera = 1.4; ac.depoisDeEsperar = () => sentar(ac); balaoIcone(ac, ICONES.aviso, 2); }
      else if (/\+\d/.test(txt) && /realizado|pnl|liquido|ganho/i.test(txt)) { ac.salto = 0.6; tocar(ac, 'emote-yes', 0.2); ac.estado = 'parado'; ac.espera = 1.2; ac.depoisDeEsperar = () => sentar(ac); balaoIcone(ac, ICONES.festa, 2); }
      else if (ac.idas % 3 === 0 && ab.lugarGerente) ida(ac, ab.lugarGerente.x, ab.lugarGerente.z + 1.6, 'entregar', null, ICONES.doc);   // ao chefe
      else if (ac.idas % 3 === 1) { const j = ab.planta.janelas[ac.sem % ab.planta.janelas.length]; ida(ac, j.x, j.z, 'olhar', null, ICONES.grafico); }   // a janela, olhar o mercado
      else ida(ac, ab.arquivo.x, ab.arquivo.z, 'apanhar', null, ICONES.doc);                                                      // ao arquivo
    } else if (e.k === 'escreveu') {
      balaoIcone(ac, ICONES.trabalho, 1.8);
      if (ac.idas % 2 === 0) voarDados(ab, ac, ctx);                     // q12: o que escreveu vai em linha de luz ao chefe
      if (ac.idas % 4 === 3) { ida(ac, ab.arquivo.x, ab.arquivo.z, 'apanhar', null, ICONES.doc); ab.arquivoQuente = 2; }   // de 4 em 4 escritas guarda no arquivo
      else ac.idas++;
    } else if (e.k === 'falou') {
      balaoIcone(ac, ICONES.fala, 3);
      if (/lucro|ganho/.test(e.tipo || '') ) { festejar(ab, ac); }
      else if (/perda|risco/.test(e.tipo || '')) { tocar(ac, 'emote-no', 0.2); ac.estado = 'parado'; ac.espera = 1.4; ac.depoisDeEsperar = () => sentar(ac); }
      else if (/director/.test(e.tipo || '') || /Director|Stark/.test(e.quem || '')) reuniao(ab, ac, ctx);
      else if (agora > ac.cafeAte) { ac.cafeAte = agora + 90000; ida(ac, ab.cafe.x, ab.cafe.z, 'cafe', null, ICONES.cafe); }
    }
    return;
  }
  if (e.k === 'falou' && e.andar !== n && /Stark/.test(e.quem || '') && agora > (ab.starkAte || 0)) { ab.starkAte = agora + 120000; starkDesce(ab, ctx); return; }
  if (e.k === 'falou' && e.tipo === 'contratacao' && e.andar === n) { contratar(ab, ctx, e); return; }
  if (e.k === 'falou' && e.tipo === 'demissao' && e.andar === n) { const ac = actorDe(e.id) || ab.actores[ab.actores.length - 1]; if (ac && !ac.lider) { balaoIcone(ac, ICONES.caixa, 4); ac.lugar = null; ida(ac, ab.elevador.x, ab.elevador.z, 'entregar', 'sumir'); ac.visitante = true; } return; }
  if (e.k === 'recado') {
    const sPara = sectorNoAndar(ab, e.para_sector), sDe = sectorNoAndar(ab, e.de_sector);
    if (e.de === n && e.para === n) { const ac = quemRepresenta(ab, sDe); const alvo = mesaDoSector(ab, sPara); if (ac && alvo) ida(ac, alvo.x, alvo.z, 'entregar', null, ICONES.doc); }
    else if (e.de === n) { const ac = quemRepresenta(ab, sDe); if (ac) ida(ac, ab.elevador.x, ab.elevador.z + 0.5, 'entregar', null, ICONES.doc); }
    else if (e.para === n) { const alvo = mesaDoSector(ab, sPara); const ac = nascerNoElevador(ab, ctx, { id: 'msg:' + e.s, nome: 'recado de ' + String(e.de_sector || '').replace(/_/g, ' '), sem: ctx.U.semente(String(e.de_sector || e.s)) }); if (ac && alvo) { ac.estado = 'de_pe'; ida(ac, alvo.x, alvo.z, 'entregar', 'sumir', ICONES.doc); } }
    return;
  }
  if (e.k === 'visita' && e.para === n) {
    const alvoProg = actorDe(e.id) || actorDe(e.funcionario), vermelho = /vermelho|falha|erro/i.test(e.txt || '');
    const alvo = alvoProg ? { x: alvoProg.obj.position.x, z: alvoProg.obj.position.z + (alvoProg.lugar && alvoProg.lugar.ry === 0 ? -1.2 : 1.2) } : mesaDoSector(ab, null);
    const ac = nascerNoElevador(ab, ctx, { id: 'shield:' + e.s, nome: String(e.cargo || 'S.H.I.E.L.D.').replace(/_/g, ' '), sem: ctx.U.semente(String(e.cargo || e.s)) + 3, ouro: true, nivel: 'supervisor' });
    if (ac && alvo) { ac.estado = 'de_pe'; ida(ac, alvo.x, alvo.z, vermelho ? 'nao' : 'sim', 'sumir', ICONES.lupa); if (alvoProg && vermelho) { alvoProg.erro = 1; luzVermelha(ab, alvoProg); } }
    return;
  }
  if (e.k === 'batimento') { ronda(ab, ctx); return; }
}
function sectorNoAndar(ab, esp) { return String(esp || ''); }
function mesaDoSector(ab, esp) {
  const P = ab.planta; if (!P || !P.sectores.length) return null;
  const s = P.sectores.find(x => esp && x.id.indexOf(String(esp)) >= 0) || P.sectores[0], ip = s.ilhasPos[0]; if (!ip) return null;
  return { x: ip.x, z: ip.z + 1.9 };
}
function quemRepresenta(ab, esp) {
  const livres = ab.actores.filter(a => (a.estado === 'sentado' || a.estado === 'a_trabalhar') && !a.visitante);
  if (!livres.length) return null;
  const doSector = livres.filter(a => a.lugar && a.lugar.sector && esp && a.lugar.sector.id.indexOf(String(esp)) >= 0);
  const lista = doSector.length ? doSector : livres;
  return lista[ab.encontros % lista.length];
}
function acenderSector(ab, secId, ctx) {
  const P = ab.planta; if (!P) return;
  const s = P.sectores.find(x => x.id === secId); if (!s) return;
  P.lugares.forEach(l => { if (l.sector === s && l.iEcra != null && !(l.ocupado || '').startsWith('prog:')) ab.ecrasQuentes.set(l.iEcra, { l, calor: 1 }); });
  const faixas = ab.bordaFaixas && ab.bordaFaixas.get(s); if (!faixas || !ab.bordas) return;
  const col = ab.bordas.geometry.attributes.color, base = ab.bordaBase, R = 1, G = 0.86, B = 0.42;   // o ouro claro (0xffdc6a)
  if (s._anim) { s._anim.t = 0; return; }
  s._anim = { t: 0, passo(dt) { this.t += dt; const k = Math.max(0, 1 - this.t);
    faixas.forEach(([v0, n]) => { for (let v = v0; v < v0 + n; v++) col.setXYZ(v, base[v * 3] + (R - base[v * 3]) * k, base[v * 3 + 1] + (G - base[v * 3 + 1]) * k, base[v * 3 + 2] + (B - base[v * 3 + 2]) * k); });
    col.needsUpdate = true; if (this.t >= 1) { s._anim = null; return false; } return true; } };
  ctx.animados.push(s._anim);
}
// q12 "dados a voar para o chefe - uma LINHA DE LUZ do monitor ate ao chefe": o feixe (uma linha que se desenha do monitor
// ate a secretaria do gerente e se apaga) + o ponto de luz que corre por ela
function voarDados(ab, ac, ctx) {
  if (!ab.lugarGerente || !ac.lugar || !ac.lugar.monitor) return;
  ab.voos = ab.voos || []; if (ab.voos.length > 8) return;
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctx.texturaHalo(), color: ac.cor, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.scale.set(0.9, 0.9, 1); ab.grupo.add(m);
  const de = { x: ac.lugar.monitor.x, y: ac.lugar.monitor.y, z: ac.lugar.monitor.z }, para = { x: ab.lugarGerente.x, y: 1.0, z: ab.lugarGerente.z + 0.9 };
  const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(new THREE.Vector3(de.x + (para.x - de.x) * u, de.y + Math.sin(u * Math.PI) * 1.4 + (para.y - de.y) * u, de.z + (para.z - de.z) * u)); }
  const geo = new THREE.BufferGeometry().setFromPoints(pts); geo.setDrawRange(0, 0);
  const linha = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: ac.cor, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  linha.userData.proprio = true; ab.grupo.add(linha);
  ab.voos.push({ m, linha, t: 0, de, para });
}
function festejar(ab, ac) {
  const perto = ab.actores.filter(a => !a.visitante && a.lugar && ac.lugar && a.lugar.sector === ac.lugar.sector && (a.estado === 'sentado' || a.estado === 'a_trabalhar')).slice(0, 5);
  perto.concat([ac]).forEach((a, i) => { setTimeout(() => { if (a.estado !== 'sentado' && a.estado !== 'a_trabalhar') return; a.salto = 0.6; tocar(a, 'emote-yes', 0.15); a.estado = 'parado'; a.espera = 1.3; a.depoisDeEsperar = () => sentar(a); balaoIcone(a, ICONES.festa, 1.5); }, i * 120); });
}
function reuniao(ab, ac, ctx) {
  const agora = performance.now(); if (agora < (ab.reuniaoAte || 0)) return; ab.reuniaoAte = agora + 60000;
  const grupo = [ac].concat(ab.actores.filter(a => a !== ac && !a.visitante && (a.estado === 'sentado' || a.estado === 'a_trabalhar')).slice(0, 5));
  grupo.forEach((a, i) => { const l = ab.lugaresReuniao[i % ab.lugaresReuniao.length]; a.reuniaoDur = 14; setTimeout(() => ida(a, l.x, l.z + (l.ry === 0 ? -0.3 : 0.3), 'sentar', null, i === 0 ? ICONES.fala : null), i * 350); });
}
function ronda(ab, ctx) {
  const lideres = ab.actores.filter(a => a.lider && !a.visitante && (a.estado === 'sentado' || a.estado === 'a_trabalhar')); if (!lideres.length) return;
  const l = lideres[(ab.rondas = (ab.rondas || 0) + 1) % lideres.length], s = l.lugar && l.lugar.sector; if (!s || !s.ilhasPos.length) return;
  const ip = s.ilhasPos[(ab.rondas) % s.ilhasPos.length];
  ida(l, ip.x + 1.9, ip.z, 'inspeccionar', null, ICONES.lupa);
}
function starkDesce(ab, ctx) {
  const ac = nascerNoElevador(ab, ctx, { id: 'stark:' + Date.now(), nome: 'Sr. Stark', sem: 7, ouro: true, nivel: 'gerente', especie: 'agente' });
  if (!ac || !ab.lugarGerente) return;
  ac.estado = 'de_pe'; ida(ac, ab.lugarGerente.x, ab.lugarGerente.z + 1.8, 'entregar', 'sumir', ICONES.fala);
}
function contratar(ab, ctx, e) {
  const livre = ab.planta.lugares.find(l => !l.ocupado); if (!livre) return;
  const ac = nascerNoElevador(ab, ctx, { id: 'novo:' + e.s, nome: String(e.quem || 'contratado'), sem: ctx.U.semente(String(e.s)), nivel: 'agente', especie: 'agente' });
  if (!ac) return;
  livre.ocupado = ac.id; ac.lugar = livre; ac.visitante = false; ab.actores.push(ac); ab.mensageiros.splice(ab.mensageiros.indexOf(ac), 1);
  ac.estado = 'de_pe'; ac.rota = caminho(ab.grelha, ac.obj.position.x, ac.obj.position.z, livre.x, livre.z + (livre.ry === 0 ? -0.9 : 0.9)); ac.aoChegar = () => sentar(ac); ac.estado = 'a_andar'; tocar(ac, 'walk'); balaoIcone(ac, ICONES.ok, 3);
}
// q13: erro -> luz vermelha por cima de quem falhou
export function luzVermelha(ab, ac) {
  if (ac.luzErro) return;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ac.ab ? null : null, color: 0xff5a5f, transparent: true, opacity: 0.9, depthWrite: false }));
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff5a5f, toneMapped: false })); m.position.set(0, ALT_PESSOA + 1.25, 0);
  ac.obj.add(m); ac.luzErro = m; sp.material.dispose();
  ab.animados.push({ t: 0, passo(dt) { this.t += dt; m.material.color.setScalar(0.4 + 0.6 * Math.abs(Math.sin(this.t * 4))).multiply(_c.set(0xff5a5f).multiplyScalar(2)); if (this.t > 60) { ac.obj.remove(m); ac.luzErro = null; return false; } return true; } });
}

// ================================================================ os nomes a flutuar (q06): so os ~40 mais perto do foco
// 03/10: as placas (das salas de vidro e dos sectores no chao) ESBATEM-SE quando a camara chega perto - de muito perto a
// placa do Gabinete (2,6 de largura) enchia o ecra. Somem abaixo de PLACA_PERTO, inteiras a partir de PLACA_LONGE. So
// corre quando a camara se mexe (t3b_torre.js), por isso nao custa nada parado.
const PLACA_PERTO = 3.2, PLACA_LONGE = 6.5, _wp = new THREE.Vector3();
export function esbaterPlacas(ab, posCamara) {
  const L = ab.placasLista, malha = ab.placasMalha; if (!L || !malha) return false;
  _wp.copy(posCamara); ab.grupo.worldToLocal(_wp);
  const col = malha.geometry.attributes.color; let mudou = false;
  L.forEach(p => {
    const o = Math.max(0, Math.min(1, (Math.hypot(p.x - _wp.x, p.y - _wp.y, p.z - _wp.z) - PLACA_PERTO) / (PLACA_LONGE - PLACA_PERTO)));
    if (p.alfa == null || Math.abs(p.alfa - o) > 0.01) { p.alfa = o; for (let v = p.v0; v < p.v0 + p.nv; v++) col.setW(v, o); mudou = true; }
  });
  if (mudou) col.needsUpdate = true;
  return mudou;
}
// empurrar um boneco (desvio) so se o sitio novo for livre na grelha - nunca para dentro de uma mesa ou de um vidro
function empurrar(ab, ac, dx, dz) {
  const gr = ab.grelha, p = ac.obj.position; if (!gr) { p.x += dx; p.z += dz; return; }
  const c = celula(gr, p.x + dx, p.z + dz); if (!gr.bloq[c.l * gr.cols + c.c]) { p.x += dx; p.z += dz; }
}
// troca entre o boneco inteiro e a sua instancia na multidao (o LOD)
function trocarLod(ab, ac, inst) {
  if (!ac.inst || ac.instVisivel === inst) return false;
  ac.instVisivel = inst; ac.obj.visible = !inst;
  const im = ac.inst.im, a = im.instanceMatrix.array, i = ac.inst.i, cr = ab.crachas;
  if (inst) a.set(ac.inst.m, i * 16); else a.fill(0, i * 16, i * 16 + 16);
  im.instanceMatrix.needsUpdate = true;
  if (cr) { const b = cr.instanceMatrix.array, j = ac.inst.iC; if (inst) b.set(ac.inst.mc, j * 16); else b.fill(0, j * 16, j * 16 + 16); cr.instanceMatrix.needsUpdate = true; }
  return true;
}
// o LOD (obra 4): sentado e quieto E (na gaveta, de fora - nivel 2 - ou a mais de 15 m da camara) = instancia; o resto = boneco
const _camL = new THREE.Vector3();
export function lodDoAndar(ab, camara, nivel, ctx) {
  if (!ab || !ab.pronto) return false;
  _camL.copy(camara.position); ab.grupo.worldToLocal(_camL);
  let mudou = false;
  ab.actores.forEach(ac => {
    if (!ac.inst) return;
    const inst = estaQuieto(ac) && (nivel <= 2 || ac.obj.position.distanceToSquared(_camL) > 225);
    if (trocarLod(ab, ac, inst)) mudou = true;
  });
  return mudou;
}
// 04/10 (c02 "texto por cima de texto"): a regra dos 1,3 m no chao nao chegava - vistos de lado, dois nomes de mesas diferentes
// colavam-se no ecra ("Analista Kelly Analista Lawfers"). Agora tambem no ECRA: cada nome ocupa o seu retangulo (projectado pela
// camara) e quem bate num ja posto fica escondido nesta volta.
const _pn = new THREE.Vector3();
export function nomesVisiveis(ab, foco, max, projectar) {
  const todos = ab.actores.concat(ab.mensageiros);
  // q06 "o nome a flutuar": quem esta a fazer alguma coisa primeiro (a andar, com balao), depois os mais perto do foco;
  // no maximo `max`, e nunca dois nomes a menos de 1,3 m um do outro (vizinhos de mesa alternam: nada em cima de nada)
  todos.forEach(a => { a._d = (foco ? a.obj.position.distanceToSquared(foco) : 0) - (a.estado === 'a_andar' || a.balao ? 1e4 : 0); });
  todos.sort((a, b) => a._d - b._d);
  const mostrados = [], rects = [], lim = max == null ? 10 : max;
  todos.forEach(a => {
    const p = a.obj.position;
    let livre = mostrados.length < lim && a.obj.visible !== false && !mostrados.some(q => Math.abs(q.x - p.x) < 1.3 && Math.abs(q.z - p.z) < 1.3);
    if (livre && projectar) {
      a.nomeSp.getWorldPosition(_pn); const q = projectar(_pn.x, _pn.y, _pn.z);
      if (q.z >= 1) livre = false;
      else {
        const w = 18 + String(a.nome || '').length * 6.6, h = 17, r = { l: q.x - w / 2, r: q.x + w / 2, t: q.y - h / 2, b: q.y + h / 2 };
        if (rects.some(o => r.l < o.r && o.l < r.r && r.t < o.b && o.t < r.b)) livre = false; else rects.push(r);
      }
    }
    a.nomeSp.visible = livre; if (livre) mostrados.push(p);
  });
}

// ================================================================ ALERTA 3D dentro do andar (ordem de 03/10)
export function alertasNoAndar(ab, lista, ctx) {
  if (!ab || !ab.pronto) return;
  const vivos = new Set();
  (lista || []).forEach(al => {
    if (al.andar !== ab.n) return;
    vivos.add(al.id);
    const ac = ab.porProg[al.funcionario];
    // o farol fica na SECRETARIA de quem falhou (nao onde ele esta agora: ele pode ter saido numa ida); sem actor, a recepcao
    const pos = ac && ac.lugar ? { x: ac.lugar.x, y: 0, z: ac.lugar.z + (ac.lugar.ry === 0 ? -0.15 : 0.15) } : ac ? ac.obj.position : { x: 0, y: 0, z: ab.planta.NUC + 2.2 };
    let f = ab.alertasFarol.get(al.id);
    if (!f) {
      f = farolAlerta(ab, ctx, al, pos); ab.alertasFarol.set(al.id, f);
    } else { f.g.position.set(pos.x, 0, pos.z); }
    f.al = al;
  });
  ab.alertasFarol.forEach((f, id) => { if (!vivos.has(id)) { ab.grupo.remove(f.g); ab.alertasFarol.delete(id); } });
}
function farolAlerta(ab, ctx, al, pos) {
  const g = new THREE.Group(); g.position.set(pos.x, 0, pos.z); g.userData.alerta = al; g.userData.proprio = true;
  const cor = al.sev_agora === 'vermelho' ? 0xff5a5f : 0xfbbf24;
  const anel = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.02, 6, 48), new THREE.MeshBasicMaterial({ color: cor, toneMapped: false, transparent: true, opacity: 0.85 })); anel.rotation.x = Math.PI / 2; anel.position.y = 2.35; g.add(anel);
  const anel2 = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.015, 6, 40), anel.material.clone()); anel2.rotation.x = Math.PI / 2 + 0.35; anel2.position.y = 2.55; g.add(anel2);
  const feixe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.5, 2.3, 16, 1, true), new THREE.MeshBasicMaterial({ color: cor, toneMapped: false, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); feixe.position.y = 1.2; g.add(feixe);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctx.texturaHalo(), color: cor, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(1.6, 1.6, 1); halo.position.y = 2.45; g.add(halo);
  const etq = etiquetaAlerta(al, cor); etq.position.y = 3.35; g.add(etq);
  // dentro do andar a etiqueta do alerta tem tamanho FIXO no ecra (03/10: a de um boneco perto da camara virava um cartaz
  // que tapava meio escritorio); na torre (t3b_torre.js) continua a escala do mundo
  etq.material.sizeAttenuation = false; etq.scale.set(0.26, 0.26 * 176 / 640, 1);
  ab.grupo.add(g);
  return { g, anel, anel2, feixe, halo, etq, y0: 3.35, al };
}
export function etiquetaAlerta(al, cor) {
  const c = document.createElement('canvas'); c.width = 1280; c.height = 352; const g = c.getContext('2d'); g.scale(2, 2);
  g.fillStyle = 'rgba(8,8,10,.9)'; g.beginPath(); g.roundRect ? g.roundRect(0, 0, 640, 176, 16) : g.rect(0, 0, 640, 176); g.fill();
  g.strokeStyle = '#' + new THREE.Color(cor).getHexString(); g.lineWidth = 4; g.stroke();
  const quem = window.T3B && window.T3B.quem ? window.T3B.quem(al.funcionario) : null;
  g.font = '600 34px Inter, system-ui, sans-serif'; g.fillStyle = '#efede8'; g.fillText((quem ? quem.nome : al.funcionario) || '—', 26, 46, 580);
  g.font = '500 24px Inter, system-ui, sans-serif'; g.fillStyle = '#' + new THREE.Color(cor).getHexString(); g.fillText(cortarTexto(window.T3BTexto ? window.T3BTexto.limpar(al.o_que_falhou || al.tipo || 'defeito por resolver') : (al.o_que_falhou || ''), 54), 26, 86, 590);
  const ha = al.fechado_ts ? haQuanto(Date.now() - al.fechado_ts * 1000) : (al.aberto_em ? haQuanto(Date.now() - Date.parse(al.aberto_em)) : '—');
  g.font = '500 24px "JetBrains Mono", monospace'; g.fillStyle = '#9797a3'; g.fillText('há ' + ha + ' · ' + (al.tentativas != null ? al.tentativas + ' tentativas' : '') + (al.ultimo_modelo ? ' · até ' + al.ultimo_modelo : '') + ' · clicar para o detalhe', 26, 128, 590);
  g.font = '600 20px "JetBrains Mono", monospace, "Segoe UI Symbol", "Segoe UI Emoji"'; g.fillStyle = '#ffdc6a'; g.fillText('⚠ A ESCADA INTEIRA NÃO RESOLVEU', 26, 160);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false })); sp.scale.set(3.6, 3.6 * 176 / 640, 1); sp.renderOrder = 14; sp.userData.alerta = al;
  return sp;
}
export function haQuanto(ms) { const s = Math.max(0, Math.round(ms / 1000)); return s < 60 ? s + ' s' : s < 3600 ? Math.round(s / 60) + ' min' : s < 86400 ? Math.round(s / 3600) + ' h' : Math.round(s / 86400) + ' d'; }

// ================================================================ A LISTA DE VERIFICACAO DO PONTO 5 (03/10 noite)
// Ele (r05): "muita coisa dessas que eu pedi nao foram activadas". Cada item da lista tem um PASSO que o mostra a
// acontecer, com o mesmo codigo que os eventos reais usam (a sonda chama-o e tira uma foto; nada disto corre sozinho - na
// pagina, o que mexe os bonecos e o /vivo.json). `foco` = onde a camara olha (coordenadas do andar).
export const ROTEIRO = [
  { id: 'visao_geral', espera: 1800, itens: ['bonecos adultos e esbeltos', 'cor da roupa pela especie (com legenda)', 'nome a flutuar', 'ilhas de secretarias por sector', 'chao com a cor do sector', 'placa com o nome do sector', 'plantas e decoracao', 'paredes de vidro entre sectores'] },
  { id: 'chefia', espera: 1800, itens: ['estrela ou coroa pelo nivel', 'secretaria maior com 2 ecras', 'sala de vidro do gerente (gabinete)', 'roupa diferente para chefes', 'objecto na mao pela funcao'] },
  { id: 'trabalho', espera: 2200, itens: ['a trabalhar: o monitor acende', 'graficos a correr no monitor', 'barra de progresso por cima', 'balao com icone', 'maos no teclado', 'dados a voar para o chefe (linha de luz)'] },
  { id: 'ida_chefe', espera: 3600, itens: ['modo C: cada accao vira uma ida', 'destino: ao chefe', 'entregam um documento', 'ritmo calmo', 'pelos corredores (contornam as mesas)'] },
  { id: 'ida_janela', espera: 3600, itens: ['destino: a janela (olhar o mercado)'] },
  { id: 'ida_arquivo', espera: 3600, itens: ['destino: ao arquivo / servidor'] },
  { id: 'ida_copa', espera: 3600, itens: ['destino: a copa (cafe e conversa)', 'copa / cafe'] },
  { id: 'ida_sector', espera: 3600, itens: ['destino: a mesa de outro sector (levar um recado)'] },
  { id: 'elevador', espera: 2600, itens: ['elevador com porta (abre e fecha)', 'destino: ao elevador'] },
  { id: 'conversam', espera: 4200, itens: ['encontros: param e conversam (frente a frente, com baloes)', 'desviam-se uns dos outros'] },
  { id: 'reuniao', espera: 4200, itens: ['sala de reunioes', 'reaccao: reuniao (varios levantam-se e juntam-se)', 'encontros: reuniao na sala'] },
  { id: 'visita_shield', espera: 3600, itens: ['reaccao: visita da S.H.I.E.L.D. (agente dourado inspecciona e volta)'] },
  { id: 'erro', espera: 1600, itens: ['reaccao: erro -> luz vermelha por cima de quem falhou'] },
  { id: 'perda', espera: 1300, itens: ['reaccao: perda -> abanam a cabeca'] },
  { id: 'ganho', espera: 1300, itens: ['reaccao: ganho -> festejam (saltam)'] },
  { id: 'contratacao', espera: 3200, itens: ['reaccao: contratacao (um novo sai do elevador e senta-se)'] },
  { id: 'demissao', espera: 3200, itens: ['reaccao: demissao (levanta-se com uma caixa e sai pelo elevador)'] },
  { id: 'ronda', espera: 3200, itens: ['encontros: o supervisor faz ronda'] },
  { id: 'stark_desce', espera: 3600, itens: ['encontros: o Sr. Stark desce do atico'] },
  { id: 'ecras_parede', espera: 1200, itens: ['ecras de parede com graficos ATS'] },
  { id: 'fita_pnl', espera: 1600, itens: ['G32 (obra 4): a fita do P&L em 3D dentro do escritorio, a ponta de hoje a brilhar e a luz a correr num evento do P&L'] }
];
function sentados(ab, n, excepto) {
  return ab.actores.filter(a => !a.visitante && a.lugar && !a.lugar.gerente && (a.estado === 'sentado' || a.estado === 'a_trabalhar') && !(excepto || []).includes(a)).slice(0, n);
}
export function demonstrar(ab, ctx, id) {
  if (!ab || !ab.pronto) return { ok: false, nota: 'andar fechado' };
  const P = ab.planta, sg = P.salas.gerente, [a1, a2, a3, a4] = sentados(ab, 4);
  const meio = (p, q) => ({ x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 });
  const pos = ac => ({ x: ac.obj.position.x, z: ac.obj.position.z });
  switch (id) {
    case 'visao_geral': return { ok: true, foco: { x: 0, z: 1, dist: 30, alt: 21 } };
    case 'chefia': { const g = ab.actores.find(a => a.nivel === 'gerente' && a.lugar && a.lugar.gerente); return { ok: !!g, nota: g ? g.nome : 'sem gerente', foco: { x: sg.cx, z: sg.cz - 1.2, dist: 7.2, alt: 0.9 } }; }
    case 'trabalho': {
      const qs = sentados(ab, 30).filter(a => a.obj.position.z > -3 && Math.abs(a.obj.position.x) > 6).slice(0, 4); qs.forEach((ac, i) => { ac.trabalharTot = 5; ac.trabalhar = 5; balaoIcone(ac, i % 2 ? ICONES.grafico : ICONES.trabalho, 4); voarDados(ab, ac, ctx); if (ac.lugar && ac.lugar.sector) acenderSector(ab, ac.lugar.sector.id, ctx); });
      return { ok: qs.length > 0, foco: qs[0] ? { x: qs[0].obj.position.x, z: qs[0].obj.position.z, dist: 6.5, alt: 3.6, ang: qs[0].lugar.ry === 0 ? Math.PI : 0 } : null };
    }
    case 'ida_chefe': { if (!a1) return { ok: false }; ida(a1, ab.lugarGerente.x, ab.lugarGerente.z + 1.6, 'entregar', null, ICONES.doc); const m = meio(pos(a1), ab.lugarGerente); return { ok: true, foco: { x: m.x, z: m.z, dist: 15, alt: 11 } }; }
    case 'ida_janela': { if (!a2) return { ok: false }; const j = P.janelas[a2.sem % P.janelas.length]; ida(a2, j.x, j.z, 'olhar', null, ICONES.grafico); const m = meio(pos(a2), j); return { ok: true, foco: { x: m.x, z: m.z, dist: 13, alt: 9 } }; }
    case 'ida_arquivo': { if (!a3) return { ok: false }; ida(a3, ab.arquivo.x, ab.arquivo.z, 'apanhar', null, ICONES.doc); ab.arquivoQuente = 4; const m = meio(pos(a3), ab.arquivo); return { ok: true, foco: { x: m.x, z: m.z, dist: 14, alt: 10 } }; }
    case 'ida_copa': { if (!a4) return { ok: false }; a4.cafeAte = 0; ida(a4, ab.cafe.x, ab.cafe.z, 'cafe', null, ICONES.cafe); const m = meio(pos(a4), ab.cafe); return { ok: true, foco: { x: m.x, z: m.z, dist: 14, alt: 10 } }; }
    case 'ida_sector': {
      const ss = P.sectores.filter(s => s.ilhasPos.length); const q = sentados(ab, 8).find(a => a.lugar && ss.length > 1 && a.lugar.sector);
      if (!q) return { ok: false, nota: 'um so sector' }; const outro = ss.find(s => s !== q.lugar.sector) || ss[0], ip = outro.ilhasPos[0];
      ida(q, ip.x, ip.z + 1.9, 'entregar', null, ICONES.doc); const m = meio(pos(q), { x: ip.x, z: ip.z }); return { ok: true, nota: 'para ' + outro.id, foco: { x: m.x, z: m.z, dist: 14, alt: 10 } };
    }
    case 'elevador': {
      const s = P.sectores[0], ip = s && s.ilhasPos[0]; const ac = nascerNoElevador(ab, ctx, { id: 'msg:demo', nome: 'recado do andar de cima', sem: 41 });
      if (ac && ip) { ac.estado = 'de_pe'; ida(ac, ip.x, ip.z + 1.9, 'entregar', 'sumir', ICONES.doc); }
      return { ok: !!ac, foco: { x: ab.elevador.x, z: ab.elevador.z + 1.2, dist: 7.5, alt: 3.2 } };
    }
    case 'conversam': {
      const [b1, b2] = sentados(ab, 2, [a1, a2, a3, a4]); if (!b1 || !b2) return { ok: false };
      ab.forcarEncontro = true; const p1 = pos(b1), p2 = pos(b2); ida(b1, p2.x, p2.z + (b2.lugar.ry === 0 ? -0.9 : 0.9), 'entregar', null, ICONES.doc); ida(b2, p1.x, p1.z + (b1.lugar.ry === 0 ? -0.9 : 0.9), 'entregar', null, ICONES.doc);
      const m = meio(p1, p2); return { ok: true, foco: { x: m.x, z: m.z, dist: 12, alt: 8 } };
    }
    case 'reuniao': { const q = sentados(ab, 1)[0]; if (!q) return { ok: false }; ab.reuniaoAte = 0; reuniao(ab, q, ctx); return { ok: true, foco: { x: P.salas.reuniao.cx, z: P.salas.reuniao.cz + 2, dist: 13, alt: 9 } }; }
    case 'visita_shield': {
      const alvo = sentados(ab, 1)[0]; if (!alvo) return { ok: false };
      eventoNoAndar(ab, { k: 'visita', id: alvo.id, para: ab.n, de: 54, cargo: 'Agente Hill', txt: 'verde', s: Date.now() }, ctx);
      return { ok: true, foco: { x: (alvo.obj.position.x + ab.elevador.x) / 2, z: (alvo.obj.position.z + ab.elevador.z) / 2, dist: 15, alt: 10 } };
    }
    case 'erro': { const q = sentados(ab, 1)[0]; if (!q) return { ok: false }; q.erro = 1; luzVermelha(ab, q); balaoIcone(q, ICONES.erro, 4); return { ok: true, foco: { x: q.obj.position.x, z: q.obj.position.z, dist: 6, alt: 3.4, ang: q.lugar.ry === 0 ? Math.PI : 0 } }; }
    case 'perda': { const q = sentados(ab, 2)[1] || sentados(ab, 1)[0]; if (!q) return { ok: false }; tocar(q, 'emote-no', 0.2); q.estado = 'parado'; q.espera = 1.6; q.depoisDeEsperar = () => sentar(q); balaoIcone(q, ICONES.aviso, 2.5); return { ok: true, foco: { x: q.obj.position.x, z: q.obj.position.z, dist: 5.5, alt: 3, ang: q.lugar.ry === 0 ? Math.PI : 0 } }; }
    case 'ganho': { const q = sentados(ab, 3)[2] || sentados(ab, 1)[0]; if (!q) return { ok: false }; festejar(ab, q); return { ok: true, foco: { x: q.obj.position.x, z: q.obj.position.z, dist: 8, alt: 4.5, ang: q.lugar.ry === 0 ? Math.PI : 0 } }; }
    case 'contratacao': { const livre = P.lugares.some(l => !l.ocupado); contratar(ab, ctx, { s: 'demo' + Date.now(), quem: 'Analista Nova (contratada)' }); return { ok: livre, nota: livre ? '' : 'sem secretaria livre neste andar', foco: { x: ab.elevador.x, z: ab.elevador.z + 2.5, dist: 10, alt: 5 } }; }
    case 'demissao': {
      const q = sentados(ab, 6).slice(-1)[0]; if (!q) return { ok: false };
      eventoNoAndar(ab, { k: 'falou', tipo: 'demissao', id: q.id, andar: ab.n, s: Date.now() }, ctx);
      return { ok: true, nota: q.nome, foco: { x: (q.obj.position.x + ab.elevador.x) / 2, z: (q.obj.position.z + ab.elevador.z) / 2, dist: 14, alt: 9 } };
    }
    case 'ronda': { ronda(ab, ctx); const l = ab.actores.find(a => a.lider && a.estado === 'a_andar'); return { ok: !!l, nota: l ? l.nome : 'sem lider livre', foco: l ? { x: l.obj.position.x, z: l.obj.position.z, dist: 12, alt: 8 } : { x: 0, z: 0, dist: 20, alt: 14 } }; }
    case 'stark_desce': { ab.starkAte = 0; starkDesce(ab, ctx); return { ok: true, foco: { x: (ab.elevador.x + ab.lugarGerente.x) / 2, z: (ab.elevador.z + ab.lugarGerente.z) / 2, dist: 15, alt: 10 } }; }
    case 'ecras_parede': return { ok: !!(ab.paredes && ab.paredes.length), foco: { x: 0, z: -12, dist: 15, alt: 2.4 } };
    case 'fita_pnl': { pulsoFita(ab); return { ok: !!ab.fita, nota: ab.fita ? (ab.fita.pts.length + ' dias') : 'sem dias no torre.json', foco: { x: 0, z: -4.5, dist: 13, alt: 3.2 } }; }
  }
  return { ok: false, nota: 'passo desconhecido' };
}
export { COR_ESPECIE, ALT_PESSOA, ICONES };
