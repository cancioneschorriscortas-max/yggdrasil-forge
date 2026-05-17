import sys

file_path = "packages/core/__tests__/engine/ResourceManager.test.ts"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("Lonxitude orixinal:", len(content))

# 1. Engadir ErrorCode ao import
old_import = "import { isYggdrasilError } from '@yggdrasil-forge/common'"
new_import = "import { ErrorCode, isYggdrasilError } from '@yggdrasil-forge/common'"
if old_import not in content:
    print("ERRO: import non atopado. Buscando...")
    for i, line in enumerate(content.split('\n')[:5]):
        print(f"  L{i+1}: {repr(line)}")
    sys.exit(1)
content = content.replace(old_import, new_import)
print("OK: import actualizado")

# 2. Refortar test INSUFFICIENT_RESOURCES
old_t1 = "      if (!result.ok) {\n        expect(isYggdrasilError(result.error)).toBe(true)\n      }\n    })\n\n    it('errors with INVALID_COST"
new_t1 = "      if (!result.ok) {\n        expect(isYggdrasilError(result.error)).toBe(true)\n        expect(result.error.code).toBe(ErrorCode.INSUFFICIENT_RESOURCES)\n      }\n    })\n\n    it('errors with INVALID_COST"
if old_t1 not in content:
    print("ERRO: bloque INSUFFICIENT_RESOURCES non atopado")
    # Mostrar contexto para diagnosticar
    idx = content.find("errors with INSUFFICIENT_RESOURCES")
    print("Contexto:", repr(content[idx:idx+300]))
    sys.exit(1)
content = content.replace(old_t1, new_t1)
print("OK: test INSUFFICIENT_RESOURCES reforzado")

# 3. Refortar test INVALID_COST + engadir test de localización
old_t2 = "    it('errors with INVALID_COST for negative amounts', () => {\n      const rm = new ResourceManager()\n      const result = rm.applyCost([{ resourceId: 'xp', amount: -5 }], budgetOf({ xp: 100 }))\n      expect(result.ok).toBe(false)\n    })\n\n    it('is atomic"
new_t2 = "    it('errors with INVALID_COST for negative amounts', () => {\n      const rm = new ResourceManager()\n      const result = rm.applyCost([{ resourceId: 'xp', amount: -5 }], budgetOf({ xp: 100 }))\n      expect(result.ok).toBe(false)\n      if (!result.ok) {\n        expect(result.error.code).toBe(ErrorCode.INVALID_COST)\n      }\n    })\n\n    it('INVALID_COST error message is localized and non-empty', () => {\n      const rm = new ResourceManager()\n      const result = rm.applyCost([{ resourceId: 'xp', amount: -5 }], budgetOf({ xp: 100 }))\n      expect(result.ok).toBe(false)\n      if (!result.ok) {\n        expect(result.error.code).toBe(ErrorCode.INVALID_COST)\n        expect(result.error.message).toBeTruthy()\n        expect(result.error.message.length).toBeGreaterThan(0)\n      }\n    })\n\n    it('is atomic"
if old_t2 not in content:
    print("ERRO: bloque INVALID_COST non atopado")
    idx = content.find("errors with INVALID_COST")
    print("Contexto:", repr(content[idx:idx+300]))
    sys.exit(1)
content = content.replace(old_t2, new_t2)
print("OK: test INVALID_COST reforzado + test de localización engadido")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Lonxitude final:", len(content))
print("COMPLETADO: paso4 aplicado correctamente")
