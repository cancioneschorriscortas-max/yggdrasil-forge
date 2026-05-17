import sys

old_block = """  [ErrorCode.INVALID_TREE_DEF]: {
    gl: 'A definición da árbore é inválida: {details}',
    es: 'La definición del árbol es inválida: {details}',
    en: 'Tree definition is invalid: {details}',
  },"""

new_block = """  [ErrorCode.INVALID_COST]: {
    gl: 'Custo inválido: o importe debe ser non negativo (recibido {amount})',
    es: 'Coste inválido: el importe debe ser no negativo (recibido {amount})',
    en: 'Invalid cost: amount must be non-negative (got {amount})',
  },
  [ErrorCode.INVALID_TREE_DEF]: {
    gl: 'A definición da árbore é inválida: {details}',
    es: 'La definición del árbol es inválida: {details}',
    en: 'Tree definition is invalid: {details}',
  },"""

file_path = "packages/common/src/errors/messages.ts"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()
if old_block not in content:
    print("ERRO: bloque non atopado en " + file_path)
    sys.exit(1)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content.replace(old_block, new_block))
print("OK: mensaxe localizada de INVALID_COST engadida a messages.ts")
