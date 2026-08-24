# @yggdrasil-forge/multitenancy

> **Reservado / Reserved.** Este paquete é un oco planificado (ROADMAP §6, post-1.0); aínda non contén implementación. — This package is a planned placeholder; it contains no implementation yet.

Multi-tenant primitives for serving skill trees to multiple
isolated tenants.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Provide tenant-scoped TreeRegistry, storage namespacing, and
permission checks for SaaS scenarios where multiple organizations
or user groups share a single Yggdrasil Forge deployment with
strict isolation.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeRegistry (single-tenant
  baseline).
- [@yggdrasil-forge/storage](../storage): `ScopedStorage` is a
  building block for tenant isolation.

## License

MIT
