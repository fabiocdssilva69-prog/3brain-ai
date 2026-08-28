import { ENTRADAS } from './peneira.mjs';
const EN = /\b(what|how|who|why|where|when|is|are|do|does|can|the|your|you|of|for)\b/i;
const sem = ENTRADAS.filter(e => !(e.perguntas || []).some(p => EN.test(p)));
console.log('entradas SEM nenhum gatilho em ingles: ' + sem.length + ' de ' + ENTRADAS.length);
console.log('');
console.log(sem.map(e => e.id).join(' '));
