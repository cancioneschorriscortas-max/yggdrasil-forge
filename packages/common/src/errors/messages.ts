// ── INICIO: error messages localizadas ──
// Mensaxes user-facing para cada error code, en gl/es/en.
// As variables {nome} substitúense co contexto do error.

import type { SupportedLocale } from '../locales.js'
import { ErrorCode } from './codes.js'

export const ERROR_MESSAGES: Record<ErrorCode, Record<SupportedLocale, string>> = {
  [ErrorCode.NODE_NOT_FOUND]: {
    gl: 'O nodo "{nodeId}" non existe na árbore',
    es: 'El nodo "{nodeId}" no existe en el árbol',
    en: 'Node "{nodeId}" does not exist in the tree',
  },
  [ErrorCode.NODE_ALREADY_UNLOCKED]: {
    gl: 'O nodo "{nodeId}" xa está desbloqueado',
    es: 'El nodo "{nodeId}" ya está desbloqueado',
    en: 'Node "{nodeId}" is already unlocked',
  },
  [ErrorCode.PREREQUISITES_NOT_MET]: {
    gl: 'Non se cumpren os prerrequisitos para desbloquear "{nodeId}"',
    es: 'No se cumplen los prerrequisitos para desbloquear "{nodeId}"',
    en: 'Prerequisites not met for unlocking "{nodeId}"',
  },
  [ErrorCode.INSUFFICIENT_RESOURCES]: {
    gl: 'Recursos insuficientes: necesítanse {needed} de "{resourceId}", tes {available}',
    es: 'Recursos insuficientes: se necesitan {needed} de "{resourceId}", tienes {available}',
    en: 'Insufficient resources: need {needed} of "{resourceId}", have {available}',
  },
  [ErrorCode.EXCLUSION_VIOLATION]: {
    gl: 'O nodo "{nodeId}" exclúe o nodo "{conflictId}" que xa está desbloqueado',
    es: 'El nodo "{nodeId}" excluye al nodo "{conflictId}" que ya está desbloqueado',
    en: 'Node "{nodeId}" excludes node "{conflictId}" which is already unlocked',
  },
  [ErrorCode.CYCLE_DETECTED]: {
    gl: 'Detectouse un ciclo de dependencias na árbore',
    es: 'Se detectó un ciclo de dependencias en el árbol',
    en: 'A dependency cycle was detected in the tree',
  },
  [ErrorCode.SUBTREE_NOT_FOUND]: {
    gl: 'A sub-árbore "{subtreeId}" non existe',
    es: 'El sub-árbol "{subtreeId}" no existe',
    en: 'Subtree "{subtreeId}" does not exist',
  },
  [ErrorCode.NODE_EXPIRED]: {
    gl: 'O nodo "{nodeId}" caducou',
    es: 'El nodo "{nodeId}" ha caducado',
    en: 'Node "{nodeId}" has expired',
  },
  [ErrorCode.TIME_CONSTRAINT_VIOLATION]: {
    gl: 'Violación de restrición temporal no nodo "{nodeId}"',
    es: 'Violación de restricción temporal en el nodo "{nodeId}"',
    en: 'Time constraint violation on node "{nodeId}"',
  },
  [ErrorCode.BULK_OPERATION_FAILED]: {
    gl: 'A operación masiva fallou no nodo "{nodeId}": {reason}',
    es: 'La operación masiva falló en el nodo "{nodeId}": {reason}',
    en: 'Bulk operation failed at node "{nodeId}": {reason}',
  },
  [ErrorCode.INVALID_NODE_STATE]: {
    gl: 'Estado de nodo inválido para a operación: "{nodeId}" ({details})',
    es: 'Estado de nodo inválido para la operación: "{nodeId}" ({details})',
    en: 'Invalid node state for operation: "{nodeId}" ({details})',
  },
  [ErrorCode.CHANGE_CONFLICT]: {
    gl: 'Conflito interno na lista de cambios: {conflictType} ({details})',
    es: 'Conflicto interno en la lista de cambios: {conflictType} ({details})',
    en: 'Internal conflict in change list: {conflictType} ({details})',
  },
  [ErrorCode.EFFECT_TYPE_UNSUPPORTED]: {
    gl: 'O tipo de efecto "{effectType}" non está soportado nesta versión',
    es: 'El tipo de efecto "{effectType}" no está soportado en esta versión',
    en: 'Effect type "{effectType}" is not supported in this version',
  },
  [ErrorCode.IRREVERSIBLE_EFFECT]: {
    gl: 'O efecto "{effectType}" está marcado como irreversible e non se pode reverter',
    es: 'El efecto "{effectType}" está marcado como irreversible y no se puede revertir',
    en: 'Effect "{effectType}" is marked as irreversible and cannot be reverted',
  },
  [ErrorCode.CIRCULAR_EFFECT]: {
    gl: 'Detectouse un ciclo na cascada de efectos: {cycle}',
    es: 'Se detectó un ciclo en la cascada de efectos: {cycle}',
    en: 'A cycle was detected in the effect cascade: {cycle}',
  },
  [ErrorCode.EFFECT_TARGET_NOT_FOUND]: {
    gl: 'O efecto "{effectType}" referencia un destino inexistente: "{targetId}"',
    es: 'El efecto "{effectType}" referencia un destino inexistente: "{targetId}"',
    en: 'Effect "{effectType}" references a non-existent target: "{targetId}"',
  },
  [ErrorCode.EFFECT_APPLICATION_FAILED]: {
    gl: 'Fallou a aplicación do efecto "{effectType}" no índice {failedAt}: {reason}',
    es: 'Falló la aplicación del efecto "{effectType}" en el índice {failedAt}: {reason}',
    en: 'Effect "{effectType}" application failed at index {failedAt}: {reason}',
  },
  [ErrorCode.NODE_NOT_YET_AVAILABLE]: {
    gl: 'O nodo "{nodeId}" aínda non está dispoñible (comeza en {startsAt})',
    es: 'El nodo "{nodeId}" aún no está disponible (comienza en {startsAt})',
    en: 'Node "{nodeId}" is not yet available (starts at {startsAt})',
  },
  [ErrorCode.PROGRESS_NOT_SUPPORTED]: {
    gl: 'O nodo "{nodeId}" non admite progreso (supportsProgress é false ou ausente)',
    es: 'El nodo "{nodeId}" no admite progreso (supportsProgress es false o ausente)',
    en: 'Node "{nodeId}" does not support progress (supportsProgress is false or absent)',
  },
  [ErrorCode.PROGRESS_SOURCE_UNSUPPORTED]: {
    gl: 'A fonte de progreso do nodo "{nodeId}" non é "manual" e non está soportada nesta versión',
    es: 'La fuente de progreso del nodo "{nodeId}" no es "manual" y no está soportada en esta versión',
    en: 'Progress source of node "{nodeId}" is not "manual" and is not supported in this version',
  },
  [ErrorCode.INVALID_PROGRESS_VALUE]: {
    gl: 'Valor de progreso inválido para "{nodeId}": {percent}. Debe ser finito e estar en [0, 100]',
    es: 'Valor de progreso inválido para "{nodeId}": {percent}. Debe ser finito y estar en [0, 100]',
    en: 'Invalid progress value for "{nodeId}": {percent}. Must be finite and in [0, 100]',
  },
  [ErrorCode.INVALID_PROGRESS_OPERATION]: {
    gl: 'A operación setProgress non é válida para o nodo "{nodeId}": é unha fonte computed',
    es: 'La operación setProgress no es válida para el nodo "{nodeId}": es una fuente computed',
    en: 'setProgress is not valid for node "{nodeId}": it is a computed source',
  },
  [ErrorCode.SUBTREE_DEPTH_EXCEEDED]: {
    gl: 'Profundidade máxima de sub-árbores excedida: {depth} > {maxDepth}',
    es: 'Profundidad máxima de sub-árboles excedida: {depth} > {maxDepth}',
    en: 'Maximum subtree depth exceeded: {depth} > {maxDepth}',
  },
  [ErrorCode.SUBTREE_CYCLE_DETECTED]: {
    gl: 'Detectouse un ciclo de sub-árbores: {subtreeId} xa está activo en {chain}',
    es: 'Se detectó un ciclo de sub-árboles: {subtreeId} ya está activo en {chain}',
    en: 'Subtree cycle detected: {subtreeId} is already active in {chain}',
  },
  [ErrorCode.SUBTREE_NOT_UNLOCKED]: {
    gl: 'A sub-árbore {subtreeId} non está desbloqueada (ningún anchor está unlocked)',
    es: 'La sub-árbol {subtreeId} no está desbloqueada (ningún anchor está unlocked)',
    en: 'Subtree {subtreeId} is not unlocked (no anchor is unlocked)',
  },
  [ErrorCode.MERGE_INVALID_INPUT]: {
    gl: 'Federator require polo menos 2 TreeDefs para mesturar; recibiu {count}',
    es: 'Federator requiere al menos 2 TreeDefs para mezclar; recibió {count}',
    en: 'Federator requires at least 2 TreeDefs to merge; got {count}',
  },
  [ErrorCode.MERGE_CONFLICTS_DETECTED]: {
    gl: 'Detectáronse {count} conflitos durante o merge; estratexia "manual" require resolución externa',
    es: 'Se detectaron {count} conflictos durante el merge; estrategia "manual" requiere resolución externa',
    en: '{count} conflicts detected during merge; "manual" strategy requires external resolution',
  },
  [ErrorCode.MERGE_INCOMPATIBLE_SCHEMA]: {
    gl: 'TreeDefs con schemaVersion incompatibles: primeira={first}, árbore {treeIndex}={other}. Use MigrationRunner antes de federar',
    es: 'TreeDefs con schemaVersion incompatibles: primera={first}, árbol {treeIndex}={other}. Use MigrationRunner antes de federar',
    en: 'TreeDefs with incompatible schemaVersion: first={first}, tree {treeIndex}={other}. Use MigrationRunner before federating',
  },
  [ErrorCode.TREE_REGISTRY_USER_NOT_FOUND]: {
    gl: 'O usuario {userId} non está rexistrado no TreeRegistry',
    es: 'El usuario {userId} no está registrado en el TreeRegistry',
    en: 'User {userId} is not registered in the TreeRegistry',
  },
  [ErrorCode.TREE_REGISTRY_USER_EXISTS]: {
    gl: 'O usuario {userId} xa existe no TreeRegistry',
    es: 'El usuario {userId} ya existe en el TreeRegistry',
    en: 'User {userId} already exists in the TreeRegistry',
  },
  [ErrorCode.TREE_REGISTRY_BUILD_NOT_FOUND]: {
    gl: 'O build {buildId} non existe',
    es: 'El build {buildId} no existe',
    en: 'Build {buildId} not found',
  },
  [ErrorCode.APPLY_CHANGES_FAILED]: {
    gl: 'applyChanges fallou en {count} engines',
    es: 'applyChanges falló en {count} engines',
    en: 'applyChanges failed in {count} engines',
  },
  [ErrorCode.QUOTA_USERS_EXCEEDED]: {
    gl: 'Cota de usuarios excedida: {current}/{max}',
    es: 'Cuota de usuarios excedida: {current}/{max}',
    en: 'User quota exceeded: {current}/{max}',
  },
  [ErrorCode.QUOTA_BUILDS_EXCEEDED]: {
    gl: 'Cota de builds excedida para usuario {userId}: {current}/{max}',
    es: 'Cuota de builds excedida para usuario {userId}: {current}/{max}',
    en: 'Build quota exceeded for user {userId}: {current}/{max}',
  },
  [ErrorCode.QUOTA_STORAGE_EXCEEDED]: {
    gl: 'Cota de bytes en storage excedida: {current}/{max}',
    es: 'Cuota de bytes en storage excedida: {current}/{max}',
    en: 'Storage bytes quota exceeded: {current}/{max}',
  },
  [ErrorCode.INVALID_COST]: {
    gl: 'Custo inválido: o importe debe ser non negativo (recibido {amount})',
    es: 'Coste inválido: el importe debe ser no negativo (recibido {amount})',
    en: 'Invalid cost: amount must be non-negative (got {amount})',
  },
  [ErrorCode.INVALID_TREE_DEF]: {
    gl: 'A definición da árbore é inválida: {details}',
    es: 'La definición del árbol es inválida: {details}',
    en: 'Tree definition is invalid: {details}',
  },
  [ErrorCode.INVALID_NODE_DEF]: {
    gl: 'A definición do nodo "{nodeId}" é inválida: {details}',
    es: 'La definición del nodo "{nodeId}" es inválida: {details}',
    en: 'Node definition "{nodeId}" is invalid: {details}',
  },
  [ErrorCode.INVALID_EDGE_DEF]: {
    gl: 'A definición da conexión "{edgeId}" é inválida: {details}',
    es: 'La definición de la conexión "{edgeId}" es inválida: {details}',
    en: 'Edge definition "{edgeId}" is invalid: {details}',
  },
  [ErrorCode.SCHEMA_VERSION_UNSUPPORTED]: {
    gl: 'Versión de esquema non soportada: {version}',
    es: 'Versión de esquema no soportada: {version}',
    en: 'Unsupported schema version: {version}',
  },
  [ErrorCode.PEDAGOGICAL_RULE_VIOLATED]: {
    gl: 'Regra pedagóxica violada: {rule}',
    es: 'Regla pedagógica violada: {rule}',
    en: 'Pedagogical rule violated: {rule}',
  },
  [ErrorCode.MIGRATION_FAILED]: {
    gl: 'A migración de {from} a {to} fallou: {details}',
    es: 'La migración de {from} a {to} falló: {details}',
    en: 'Migration from {from} to {to} failed: {details}',
  },
  [ErrorCode.NO_MIGRATION_PATH]: {
    gl: 'Non hai camiño de migración de {from} a {to}',
    es: 'No hay camino de migración de {from} a {to}',
    en: 'No migration path from {from} to {to}',
  },
  [ErrorCode.STORAGE_READ_FAILED]: {
    gl: 'Fallou a lectura do almacenamento: {key}',
    es: 'Falló la lectura del almacenamiento: {key}',
    en: 'Storage read failed: {key}',
  },
  [ErrorCode.STORAGE_WRITE_FAILED]: {
    gl: 'Fallou a escritura no almacenamento: {key}',
    es: 'Falló la escritura en el almacenamiento: {key}',
    en: 'Storage write failed: {key}',
  },
  [ErrorCode.STORAGE_QUOTA_EXCEEDED]: {
    gl: 'Excedida a cota de almacenamento',
    es: 'Excedida la cuota de almacenamiento',
    en: 'Storage quota exceeded',
  },
  [ErrorCode.PLUGIN_INSTALL_FAILED]: {
    gl: 'Fallou a instalación do plugin "{pluginId}": {reason}',
    es: 'Falló la instalación del plugin "{pluginId}": {reason}',
    en: 'Plugin "{pluginId}" install failed: {reason}',
  },
  [ErrorCode.PLUGIN_HOOK_FAILED]: {
    gl: 'O hook "{hookName}" do plugin "{pluginId}" fallou',
    es: 'El hook "{hookName}" del plugin "{pluginId}" falló',
    en: 'Hook "{hookName}" of plugin "{pluginId}" failed',
  },
  [ErrorCode.PLUGIN_PERMISSION_DENIED]: {
    gl: 'O plugin "{pluginId}" non ten permiso para "{permission}"',
    es: 'El plugin "{pluginId}" no tiene permiso para "{permission}"',
    en: 'Plugin "{pluginId}" does not have permission for "{permission}"',
  },
  [ErrorCode.PROGRESS_SOURCE_UNAVAILABLE]: {
    gl: 'A fonte de progreso externa para "{nodeId}" non está dispoñible',
    es: 'La fuente de progreso externa para "{nodeId}" no está disponible',
    en: 'External progress source for "{nodeId}" is unavailable',
  },
  [ErrorCode.PROGRESS_SOURCE_INVALID_DATA]: {
    gl: 'A fonte de progreso devolveu datos inválidos para "{nodeId}"',
    es: 'La fuente de progreso devolvió datos inválidos para "{nodeId}"',
    en: 'Progress source returned invalid data for "{nodeId}"',
  },
  [ErrorCode.AUTH_PROVIDER_NOT_FOUND]: {
    gl: 'O provedor de autenticación "{providerId}" non está rexistrado',
    es: 'El proveedor de autenticación "{providerId}" no está registrado',
    en: 'Auth provider "{providerId}" is not registered',
  },
  [ErrorCode.AUTH_PROVIDER_FAILED]: {
    gl: 'O provedor de autenticación "{providerId}" fallou: {reason}',
    es: 'El proveedor de autenticación "{providerId}" falló: {reason}',
    en: 'Auth provider "{providerId}" failed: {reason}',
  },
  [ErrorCode.FEDERATION_ID_CONFLICT]: {
    gl: 'Conflito de IDs na federación: "{id}" aparece en {sources}',
    es: 'Conflicto de IDs en la federación: "{id}" aparece en {sources}',
    en: 'Federation ID conflict: "{id}" appears in {sources}',
  },
  [ErrorCode.FEDERATION_INCOMPATIBLE_SCHEMA]: {
    gl: 'Esquema incompatible en federación: {source} usa v{version}',
    es: 'Esquema incompatible en federación: {source} usa v{version}',
    en: 'Incompatible federation schema: {source} uses v{version}',
  },
  [ErrorCode.OPERATION_LOCKED]: {
    gl: 'A operación está bloqueada porque outra está en curso',
    es: 'La operación está bloqueada porque otra está en curso',
    en: 'Operation is locked because another is in progress',
  },
  [ErrorCode.READ_ONLY_VIOLATION]: {
    gl: 'O motor está en modo só-lectura',
    es: 'El motor está en modo solo lectura',
    en: 'Engine is in read-only mode',
  },
  [ErrorCode.TENANT_QUOTA_EXCEEDED]: {
    gl: 'Cota do tenant superada: {quota}',
    es: 'Cuota del tenant superada: {quota}',
    en: 'Tenant quota exceeded: {quota}',
  },
  [ErrorCode.TENANT_PERMISSION_DENIED]: {
    gl: 'O tenant non ten permiso para "{action}"',
    es: 'El tenant no tiene permiso para "{action}"',
    en: 'Tenant does not have permission for "{action}"',
  },
  [ErrorCode.RECONCILE_TREE_MISMATCH]: {
    gl: 'Non se pode reconciliar: árbores con id distinto ({oldId} vs {newId})',
    es: 'No se puede reconciliar: árboles con id distinto ({oldId} vs {newId})',
    en: 'Cannot reconcile: trees have different ids ({oldId} vs {newId})',
  },
  [ErrorCode.LAYOUT_TYPE_UNKNOWN]: {
    gl: 'Layout descoñecido: tipo {type} non rexistrado',
    es: 'Layout desconocido: tipo {type} no registrado',
    en: 'Unknown layout: type {type} not registered',
  },
  [ErrorCode.LAYOUT_COMPUTE_FAILED]: {
    gl: 'Erro ao calcular layout {type}: {reason}',
    es: 'Error al calcular layout {type}: {reason}',
    en: 'Layout computation failed ({type}): {reason}',
  },
}
// ── FIN: error messages localizadas ──
