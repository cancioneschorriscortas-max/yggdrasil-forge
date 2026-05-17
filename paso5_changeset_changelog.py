import sys
import os
import uuid

# 1. Crear o changeset
changeset_name = str(uuid.uuid4())[:8]
changeset_path = f".changeset/{changeset_name}.md"
changeset_content = """---
'@yggdrasil-forge/common': minor
'@yggdrasil-forge/core': minor
---

Added INVALID_COST (YGG_V006) error code with localized messages (gl/es/en) for invalid resource cost amounts.
ResourceManager now emits localized error messages via getErrorMessage() instead of hardcoded English strings.
Strengthened ResourceManager tests to verify error codes and localization."""

with open(changeset_path, 'w', encoding='utf-8') as f:
    f.write(changeset_content)
print("OK: changeset creado en " + changeset_path)

# 2. Actualizar CHANGELOG.md
changelog_path = "CHANGELOG.md"
with open(changelog_path, 'r', encoding='utf-8') as f:
    content = f.read()

marker = "## [Unreleased]"
if marker not in content:
    print("ERRO: ## [Unreleased] non atopado en CHANGELOG.md")
    sys.exit(1)

new_section = """## [Unreleased]

### Added
- `INVALID_COST` (`YGG_V006`) error code with localized messages in Galician, Spanish, and English for invalid resource cost amounts.

### Changed
- `ResourceManager` now emits localized error messages via `getErrorMessage()` instead of hardcoded English strings.

### Fixed
- Lint warning `useTemplate` in `ResourceManager` (DT-5).

"""

idx = content.find(marker)
next_section = content.find("\n## [", idx + len(marker))
if next_section == -1:
    content = content[:idx] + new_section
else:
    content = content[:idx] + new_section + content[next_section + 1:]

with open(changelog_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("OK: CHANGELOG.md actualizado")
print("")
print("Agora executa:")
print("  pnpm lint")
print("  pnpm typecheck")
print("  pnpm test")
print("")
print("Se todo pasa, fai commit:")
print("  git add .")
print("  git commit -m \"fix(core): localize ResourceManager error messages; add INVALID_COST code (YGG_V006)\"")
print("  git push origin main")
