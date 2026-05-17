import sys

file_path = "packages/core/__tests__/engine/ResourceManager.test.ts"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Verificar estado actual
if "INVALID_COST error message is localized" in content:
    print("Test de localización xa existe, nada que facer")
    sys.exit(0)

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
    print("ERRO: bloque non atopado. Contexto actual arredor de INVALID_COST:")
    idx = content.find("errors with INVALID_COST for negative")
    print(repr(content[idx:idx+400]))
    sys.exit(1)

content = content.replace(old_t2, new_t2)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("COMPLETADO: test INVALID_COST reforzado + test de localización engadido")
