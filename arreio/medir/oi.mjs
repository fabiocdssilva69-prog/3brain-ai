import { M } from './peneira.mjs';
for (const p of ['oi','ola','bom dia','obrigado','valeu','tudo bem']) {
  const soc = M.ehSocial(p);
  const cand = M.candidatos(p, 60) || [];
  const b = M.busca(p);
  console.log(JSON.stringify(p).padEnd(12) +
    ' social=' + String(soc).padEnd(6) +
    ' candidatos=' + String(cand.length).padEnd(3) +
    ' busca=' + (b ? b.id : 'NADA') +
    '   -> visitante ve: ' + (soc ? 'saudacao correta' : (cand.length ? 'resposta do modelo' : '"Nao tenho essa resposta aqui."')));
}
