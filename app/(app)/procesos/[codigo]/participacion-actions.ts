// OBSOLETO — La asignación directa usuario↔proceso fue eliminada.
//
// Desde la migración 043 la participación en proceso se DERIVA de la cadena
// puesto (puesto_proceso_rol activo → persona_puesto vigente → personas).
// La tabla participacion_usuario_proceso ya no gobierna nada y esta server
// action (que escribía en ella) dejó de tener sentido.
//
// Para cambiar quién participa de un proceso: Configuración → Puestos
// (asignar el proceso/rol al puesto, y la persona al puesto).
//
// Este archivo se conserva vacío para no dejar imports rotos durante el
// despliegue; puede borrarse del repo cuando convenga.

export {};
