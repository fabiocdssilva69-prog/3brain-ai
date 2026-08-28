# -*- coding: utf-8 -*-
"""Prova que as travas do conferir_base.py conseguem REPROVAR.

Trava verde que nao sabe ficar vermelha nao mede nada: a do "527" ficou dois
meses morta (um \b virou barra literal dentro de r"...") e o conferir_base
imprimia "OK: nenhuma regressao" o tempo todo. Rodar ISTO antes de confiar
naquilo.  Uso: python prova_travas.py
"""
import importlib.util
import io
import re
import sys
import textwrap

spec = importlib.util.spec_from_file_location("cb", "conferir_base.py")
cb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cb)

s = io.open("conferir_base.py", encoding="utf8").read()
bloco = s[s.index("    FATO = re.compile("):s.index("    for e in ent:", s.index("    HIPOT"))]
ns = {"re": re}
exec(textwrap.dedent(bloco), ns)
FATO, HIPOT, achata = ns["FATO"], ns["HIPOT"], cb.achata

CASOS = [
    ("numero realizado sem ressalva", "o BarberGO tem 527 barbearias pagantes hoje", True),
    ("mesmo numero COM ressalva", "seriam precisas 527 barbearias pagantes para bancar", False),
    ("acentuado, COM ressalva",
     "fica a 65 clientes de dist\u00e2ncia. N\u00e3o h\u00e1 cliente pagante ainda", False),
    ("acentuado, SEM ressalva", "j\u00e1 somos 65 clientes pagantes e crescendo", True),
]


def main():
    todas = True
    for nome, txt, deve in CASOS:
        pegou = any(not HIPOT.search(achata(txt[max(0, m.start() - 120):m.end() + 60]))
                    for m in FATO.finditer(achata(txt)))
        ok = pegou == deve
        todas &= ok
        print("  %s %-32s -> %s" % ("OK " if ok else "X  ", nome, "PEGOU" if pegou else "passou"))

    bruto = "var r = /^(oi)" + chr(8) + "/;"
    achou = any(chr(c) in bruto for c in (8, 11, 12, 0, 27))
    todas &= achou
    print("  %s %-32s -> %s" % ("OK " if achou else "X  ", "backspace cru no fonte",
                                "PEGOU" if achou else "passou"))
    print()
    if not todas:
        print("ALGUMA TRAVA ESTA MORTA -- nao confie no conferir_base ate consertar.")
        sys.exit(1)
    print("todas as travas sabem reprovar.")


if __name__ == "__main__":
    main()
