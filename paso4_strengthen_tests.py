import sys

file_path = "packages/core/__tests__/engine/ResourceManager.test.ts"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Engadir ErrorCode ao import
old_import = "import { isYggdrasilError } from '@yggdrasil-forge/common'"
new_import = "import { ErrorCode, isYggdrasilError } from '@yggdrasil-forge/common'"
if old_import not in content:
    print("ERRO: import non atopado")
    sys.exit(1)
content = content.replace(old_import, new_import)

# 2. Refortar test INSUFFICIENT_RESOURCES
old_t1 = """    it('errors with INSUFFICIENT_RESOURCES when cannot pay', () => {
      const rm = new ResourceManager()
      const result = rm.applyCost([{ resourceId: 'xp', amount: 150 }], budgetOf({ xp: 100 }))
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(isYggdrasilError(result.error)).toBe(true)
      }
    })"""
new_t1 = """    it('errors with INSUFFICIENT_RESOURCES when cannot pay', () => {
      const rm = new ResourceManager()
      const result = rm.applyCost([{ resourceId: 'xp', amount: 150 }], budgetOf({ xp: 100 }))
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(isYggdrasilError(result.error)).toBe(true)
        expect(result.error.code).toBe(ErrorCode.INSUFFICIENT_RESOURCES)
      }
    })"""
if old_t1 not in content:
    print("ERRO: test INSUFFICIENT_RESOURCES non atopado")
    sys.exit(1)
content = content.replace(old_t1, new_t1)

# 3. Refortar test INVALID_COST + engadir test de localización
old_t2 = """    it('errors with INVALID_COST for negative amounts', () => {
      const rm = new ResourceManager()
      const result = rm.applyCost([{ resourceId: 'xp', amount: -5 }], budgetOf({ xp: 100 }))
      expect(result.ok).toBe(false)
    })"""
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
    })"""
if old_t2 not in content:
    print("ERRO: test INVALID_COST non atopado")
    sys.exit(1)
content = content.replace(old_t2, new_t2)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("OK: tests reforzados e test novo de localización engadido")
