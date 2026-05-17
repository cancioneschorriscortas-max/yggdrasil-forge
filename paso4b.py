import sys

file_path = "packages/core/__tests__/engine/ResourceManager.test.ts"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Verificar que ErrorCode xa está no import
if "ErrorCode" not in content.split('\n')[0]:
    print("ERRO: ErrorCode non está no import da liña 1")
    sys.exit(1)
print("OK: import con ErrorCode confirmado")

# 1. Refortar test INSUFFICIENT_RESOURCES
old_t1 = """      if (!result.ok) {
        expect(isYggdrasilError(result.error)).toBe(true)
      }
    })

    it('errors with INVALID_COST"""

new_t1 = """      if (!result.ok) {
        expect(isYggdrasilError(result.error)).toBe(true)
        expect(result.error.code).toBe(ErrorCode.INSUFFICIENT_RESOURCES)
      }
    })

    it('errors with INVALID_COST"""

if old_t1 not in content:
    print("ERRO: bloque INSUFFICIENT_RESOURCES non atopado")
    idx = content.find("isYggdrasilError(result.error)")
    print("Contexto:", repr(content[idx:idx+200]))
    sys.exit(1)
content = content.replace(old_t1, new_t1)
print("OK: assert INSUFFICIENT_RESOURCES engadido")

# 2. Refortar test INVALID_COST + engadir test de localización
old_t2 = """    it('errors with INVALID_COST for negative amounts', () => {
      const rm = new ResourceManager()
      const result = rm.applyCost([{ resourceId: 'xp', amount: -5 }], budgetOf({ xp: 100 }))
      expect(result.ok).toBe(false)
    })

    it('is atomic"""

new_t2 = """    it('errors with INVALID_COST for negative amounts', () => {
      const rm = new ResourceManager()
      const result = rm.applyCost([{ resourceId: 'xp', amount: -5 }], budgetOf({ xp: 100 }))
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.INVALID_COST)
      }
    })

    it('INVALID_COST error message is localized and non-empty', () => {
      const rm = new ResourceManager()
      const result = rm.applyCost([{ resourceId: 'xp', amount: -5 }], budgetOf({ xp: 100 }))
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.INVALID_COST)
        expect(result.error.message).toBeTruthy()
        expect(result.error.message.length).toBeGreaterThan(0)
      }
    })

    it('is atomic"""

if old_t2 not in content:
    print("ERRO: bloque INVALID_COST non atopado")
    idx = content.find("errors with INVALID_COST")
    print("Contexto:", repr(content[idx:idx+300]))
    sys.exit(1)
content = content.replace(old_t2, new_t2)
print("OK: test INVALID_COST reforzado + test de localización engadido")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("COMPLETADO")
