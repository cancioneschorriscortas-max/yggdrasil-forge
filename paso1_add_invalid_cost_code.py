import sys

old_block = """  INVALID_TREE_DEF = 'YGG_V001',
  INVALID_NODE_DEF = 'YGG_V002',
  INVALID_EDGE_DEF = 'YGG_V003',
  SCHEMA_VERSION_UNSUPPORTED = 'YGG_V004',
  PEDAGOGICAL_RULE_VIOLATED = 'YGG_V005',

  // Migration"""

new_block = """  INVALID_TREE_DEF = 'YGG_V001',
  INVALID_NODE_DEF = 'YGG_V002',
  INVALID_EDGE_DEF = 'YGG_V003',
  SCHEMA_VERSION_UNSUPPORTED = 'YGG_V004',
  PEDAGOGICAL_RULE_VIOLATED = 'YGG_V005',
  INVALID_COST = 'YGG_V006',

  // Migration"""

file_path = "packages/common/src/errors/codes.ts"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()
if old_block not in content:
    print("ERRO: bloque non atopado en " + file_path)
    sys.exit(1)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content.replace(old_block, new_block))
print("OK: INVALID_COST (YGG_V006) engadido a codes.ts")
