import sys

file_path = "packages/core/src/engine/ResourceManager.ts"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Actualizar o import
old_import = "import { ErrorCode, YggdrasilError } from '@yggdrasil-forge/common'"
new_import = "import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'"
if old_import not in content:
    print("ERRO: import non atopado")
    sys.exit(1)
content = content.replace(old_import, new_import)

# 2. Substituír erro de custo negativo
old_err1 = """    if (required === null) {
      return err(
        new YggdrasilError(ErrorCode.INVALID_NODE_DEF, 'Cost amounts must be non-negative'),
      )
    }"""
new_err1 = """    if (required === null) {
      return err(
        new YggdrasilError(
          ErrorCode.INVALID_COST,
          getErrorMessage(ErrorCode.INVALID_COST, 'gl', { amount: 'unknown' }),
        ),
      )
    }"""
if old_err1 not in content:
    print("ERRO: bloque de custo negativo non atopado")
    sys.exit(1)
content = content.replace(old_err1, new_err1)

# 3. Substituír erro de recursos insuficientes
old_err2 = """      if (available < amount) {
        return err(
          new YggdrasilError(
            ErrorCode.INSUFFICIENT_RESOURCES,
            'Insufficient resource: need ' + amount + ', have ' + available,
          ),
        )
      }"""
new_err2 = """      if (available < amount) {
        return err(
          new YggdrasilError(
            ErrorCode.INSUFFICIENT_RESOURCES,
            getErrorMessage(ErrorCode.INSUFFICIENT_RESOURCES, 'gl', {
              needed: String(amount),
              resourceId,
              available: String(available),
            }),
          ),
        )
      }"""
if old_err2 not in content:
    print("ERRO: bloque de recursos insuficientes non atopado")
    sys.exit(1)
content = content.replace(old_err2, new_err2)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("OK: ResourceManager.ts localizado correctamente")
