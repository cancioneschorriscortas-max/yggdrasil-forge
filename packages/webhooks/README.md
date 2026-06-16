# @yggdrasil-forge/webhooks

Webhook integration for skill tree events.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Emit HTTP webhooks when significant TreeEngine events occur
(unlocks, completions, milestones), with retry policies, signature
verification, and event filtering for external service integration.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeEngine event system.
- [@yggdrasil-forge/plugins](../plugins): Webhook emitter
  implementable as plugin.

## License

MIT
