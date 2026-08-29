-- REGISTO DE DUVIDAS — a materia-prima da auto-evolucao do RAG.
--
-- O QUE SE GRAVA, E POR QUE SO ISTO: a pergunta, o idioma, que motor
-- respondeu, se houve recusa e qual entrada ficou em 1o lugar. Basta para
-- responder as duas perguntas que interessam -- "o que perguntam muito?" e
-- "o que o bot nao soube responder?" -- e nada alem disso e' preciso.
--
-- O QUE NAO SE GRAVA, de proposito: IP, agente do navegador, identificador de
-- sessao, referer. Nenhum deles ajuda a melhorar a base, e todos transformam
-- um registo de melhoria num registo de pessoas. Pergunta cortada em 400
-- caracteres, porque texto longo colado num chat e' onde dado pessoal entra
-- sem querer.
CREATE TABLE IF NOT EXISTS duvidas (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       TEXT    NOT NULL,
  pergunta TEXT    NOT NULL,
  idioma   TEXT,
  motor    TEXT,
  recusou  INTEGER DEFAULT 0,
  topo     TEXT,
  n_ctx    INTEGER
);
CREATE INDEX IF NOT EXISTS ix_duvidas_ts      ON duvidas(ts);
CREATE INDEX IF NOT EXISTS ix_duvidas_recusou ON duvidas(recusou);
