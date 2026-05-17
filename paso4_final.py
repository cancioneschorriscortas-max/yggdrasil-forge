import sys

file_path = "packages/core/__tests__/engine/ResourceManager.test.ts"
with open(file_path, 'rb') as f:
    raw = f.read()

# Detectar fin de liña
if b'\r\n' in raw:
    nl = '\r\n'
    print("Fins de liña: CRLF")
else:
    nl = '\n'
    print("Fins de liña: LF")

content = raw.decode('utf-8')

# Estado actual
has_er_code = "expect(result.error.code).toBe(ErrorCode.INSUFFICIENT_RESOURCES)" in content
has_ic_code = "expect(result.error.code).toBe(ErrorCode.INVALID_COST)" in content
has_loc_test = "INVALID_COST error message is localized" in content

print(f"INSUFFICIENT_RESOURCES code assert: {'SI' if has_er_code else 'NON'}")
print(f"INVALID_COST code assert: {'SI' if has_ic_code else 'NON'}")
print(f"Test de localización: {'SI' if has_loc_test else 'NON'}")

changed = False

# 1. Refortar INSUFFICIENT_RESOURCES se falta
if not has_er_code:
    old = (
        "      if (!result.ok) {" + nl +
        "        expect(isYggdrasilError(result.error)).toBe(true)" + nl +
        "      }" + nl +
        "    })" + nl +
        nl +
        "    it('errors with INVALID_COST"
    )
    new = (
        "      if (!result.ok) {" + nl +
        "        expect(isYggdrasilError(result.error)).toBe(true)" + nl +
        "        expect(result.error.code).toBe(ErrorCode.INSUFFICIENT_RESOURCES)" + nl +
        "      }" + nl +
        "    })" + nl +
        nl +
        "    it('errors with INVALID_COST"
    )
    if old not in content:
        print("ERRO: non atopo bloque INSUFFICIENT_RESOURCES")
        sys.exit(1)
    content = content.replace(old, new)
    print("OK: assert INSUFFICIENT_RESOURCES engadido")
    changed = True

# 2. Refortar INVALID_COST + engadir test de localización se faltan
if not has_ic_code or not has_loc_test:
    old = (
        "    it('errors with INVALID_COST for negative amounts', () => {" + nl +
        "      const rm = new ResourceManager()" + nl +
        "      const result = rm.applyCost([{ resourceId: 'xp', amount: -5 }], budgetOf({ xp: 100 }))" + nl +
        "      expect(result.ok).toBe(false)" + nl +
        "    })" + nl +
        nl +
        "    it('is atomic"
    )
    new = (
        "    it('errors with INVALID_COST for negative amounts', () => {" + nl +
        "      const rm = new ResourceManager()" + nl +
        "      const result = rm.applyCost([{ resourceId: 'xp', amount: -5 }], budgetOf({ xp: 100 }))" + nl +
        "      expect(result.ok).toBe(false)" + nl +
        "      if (!result.ok) {" + nl +
        "        expect(result.error.code).toBe(ErrorCode.INVALID_COST)" + nl +
        "      }" + nl +
        "    })" + nl +
        nl +
        "    it('INVALID_COST error message is localized and non-empty', () => {" + nl +
        "      const rm = new ResourceManager()" + nl +
        "      const result = rm.applyCost([{ resourceId: 'xp', amount: -5 }], budgetOf({ xp: 100 }))" + nl +
        "      expect(result.ok).toBe(false)" + nl +
        "      if (!result.ok) {" + nl +
        "        expect(result.error.code).toBe(ErrorCode.INVALID_COST)" + nl +
        "        expect(result.error.message).toBeTruthy()" + nl +
        "        expect(result.error.message.length).toBeGreaterThan(0)" + nl +
        "      }" + nl +
        "    })" + nl +
        nl +
        "    it('is atomic"
    )
    if old not in content:
        print("ERRO: non atopo bloque INVALID_COST")
        idx = content.find("errors with INVALID_COST for negative")
        print("Contexto:", repr(content[idx:idx+400]))
        sys.exit(1)
    content = content.replace(old, new)
    print("OK: test INVALID_COST reforzado + test de localización engadido")
    changed = True

if not changed:
    print("Todo xa estaba aplicado, nada que facer")
    sys.exit(0)

with open(file_path, 'wb') as f:
    f.write(content.encode('utf-8'))

print("COMPLETADO: ficheiro gardado")
