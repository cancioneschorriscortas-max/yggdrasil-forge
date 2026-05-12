# @yggdrasil-forge/common

Shared constants, error codes, locales, and i18n helpers for the Yggdrasil Forge monorepo.

## Status

🚧 **Early development.** Public API not yet stable.

## Installation

```bash
pnpm add @yggdrasil-forge/common
```

## Exports

### Constants

- `PROJECT_NAME` — Canonical project name
- `VERSION` — Current package version
- `SCHEMA_VERSION` — Current TreeDef schema version

### Locales

- `SUPPORTED_LOCALES` — Officially supported locales (`gl`, `es`, `en`)
- `DEFAULT_LOCALE` — Default locale (`en`)
- `FALLBACK_LOCALE` — Fallback locale (`en`)
- `isSupportedLocale(value)` — Type guard

### i18n

- `LocalizedString` — Type for translatable strings
- `resolveLocalized(value, locale, fallback?)` — Resolve a translation
- `interpolate(template, values)` — Substitute `{variable}` placeholders

### Errors

- `ErrorCode` — Enum of all error codes
- `YggdrasilError` — Base error class
- `isYggdrasilError(value)` — Type guard
- `getErrorMessage(code, locale, context?)` — Get localized error message
- `ERROR_MESSAGES` — Raw localized messages

## License

MIT
