# Fix — error "duplicate key ... una_vigente_por_documento" al aprobar

## Qué pasó

Creaste la versión 2.0 de un documento que ya tenía la 1.0 vigente, y al aprobar
la 2.0 administrativamente saltó:

```
duplicate key value violates unique constraint "uq_versiones_una_vigente_por_documento"
```

## Por qué

Hay un índice único que impide que un documento tenga **dos versiones vigentes a
la vez** (correcto). La función de aprobación marcaba la versión nueva como
vigente **antes** de bajar la anterior, así que por un instante había dos
vigentes y el índice se quejaba.

## Solución (YA APLICADA en la base)

Corregí la función `fn_aprobar_documento_admin` para que respete el orden:

1. Primero **obsoleta** la versión vigente anterior.
2. Recién **después** marca la nueva como vigente.
3. Sincroniza el documento maestro.

Así nunca hay dos vigentes simultáneas. Probado sobre tu documento real
A-INS-05-001-001 (v1.0 vigente + v2.0 borrador): queda v1.0 obsoleta y v2.0
vigente, sin error.

## Qué tenés que hacer

**Nada en el frontend.** La función ya está corregida en la base y tu botón
"Aprobar (admin)" la llama igual. Solo **volvé a intentar la aprobación** de la
v2.0 desde la app — ahora va a funcionar.

## Respaldo

`migraciones/023_fix_aprobacion_admin_orden_vigencia.sql` — para tu historial. Ya
está aplicada, no hay que correrla.

## Verificación

- [ ] Volvé a la versión 2.0 de A-INS-05-001-001.
- [ ] Aprobá administrativamente con un motivo.
- [ ] Ahora debe aprobar sin error: la v2.0 queda vigente y la v1.0 obsoleta.
