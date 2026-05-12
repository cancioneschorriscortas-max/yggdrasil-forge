// ── INICIO: error codes ──
// Códigos canónicos de error de Yggdrasil Forge.
// Cada código ten unha mensaxe localizada en ERROR_MESSAGES.
//
// Convención de prefixos:
//   YGG_E   = Engine errors (operacións internas)
//   YGG_V   = Validation errors (datos inválidos)
//   YGG_M   = Migration errors
//   YGG_S   = Storage errors
//   YGG_P   = Plugin errors
//   YGG_X   = External progress source errors
//   YGG_F   = Federation errors
//   YGG_C   = Concurrency errors
//   YGG_RO  = Read-only mode errors
//   YGG_T   = Multi-tenancy errors

export enum ErrorCode {
  // Engine
  NODE_NOT_FOUND = 'YGG_E001',
  NODE_ALREADY_UNLOCKED = 'YGG_E002',
  PREREQUISITES_NOT_MET = 'YGG_E003',
  INSUFFICIENT_RESOURCES = 'YGG_E004',
  EXCLUSION_VIOLATION = 'YGG_E005',
  CYCLE_DETECTED = 'YGG_E006',
  SUBTREE_NOT_FOUND = 'YGG_E007',
  NODE_EXPIRED = 'YGG_E008',
  TIME_CONSTRAINT_VIOLATION = 'YGG_E009',
  BULK_OPERATION_FAILED = 'YGG_E010',

  // Validation
  INVALID_TREE_DEF = 'YGG_V001',
  INVALID_NODE_DEF = 'YGG_V002',
  INVALID_EDGE_DEF = 'YGG_V003',
  SCHEMA_VERSION_UNSUPPORTED = 'YGG_V004',
  PEDAGOGICAL_RULE_VIOLATED = 'YGG_V005',

  // Migration
  MIGRATION_FAILED = 'YGG_M001',
  NO_MIGRATION_PATH = 'YGG_M002',

  // Storage
  STORAGE_READ_FAILED = 'YGG_S001',
  STORAGE_WRITE_FAILED = 'YGG_S002',
  STORAGE_QUOTA_EXCEEDED = 'YGG_S003',

  // Plugins
  PLUGIN_INSTALL_FAILED = 'YGG_P001',
  PLUGIN_HOOK_FAILED = 'YGG_P002',
  PLUGIN_PERMISSION_DENIED = 'YGG_P003',

  // External progress
  PROGRESS_SOURCE_UNAVAILABLE = 'YGG_X001',
  PROGRESS_SOURCE_INVALID_DATA = 'YGG_X002',
  AUTH_PROVIDER_NOT_FOUND = 'YGG_X003',
  AUTH_PROVIDER_FAILED = 'YGG_X004',

  // Federation
  FEDERATION_ID_CONFLICT = 'YGG_F001',
  FEDERATION_INCOMPATIBLE_SCHEMA = 'YGG_F002',

  // Concurrency
  OPERATION_LOCKED = 'YGG_C001',

  // Read-only
  READ_ONLY_VIOLATION = 'YGG_RO001',

  // Multi-tenancy
  TENANT_QUOTA_EXCEEDED = 'YGG_T001',
  TENANT_PERMISSION_DENIED = 'YGG_T002',
}
// ── FIN: error codes ──
