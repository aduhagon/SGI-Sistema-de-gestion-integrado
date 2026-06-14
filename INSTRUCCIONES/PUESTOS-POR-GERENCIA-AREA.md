# Puestos agrupados por gerencia → área → puesto

Misma lógica que las áreas, pero con dos niveles: cada **gerencia** es una sección
colapsable, dentro cada **área** es una subsección, y dentro los **puestos**.

## Cómo se ve

```
▼ 🏢 Gerencia General                          2 puestos
    ▼ GERENCIA PRODUCCIÓN INDUSTRIAL              2
        JEFE-CAL        Jefe de calidad           ✏ 🗑
        JEFE-PROD-IND   Responsable Prod. Ind.    ✏ 🗑
▼ 🏢 Gerencia Financiera                        1 puesto
    ▼ RECURSOS HUMANOS                            1
        JEFE-RR-HH      Responsable de RR.HH.     ✏ 🗑
▼ 🏢 Sin gerencia asignada                      1 puesto
    ▼ SIN ÁREA ASIGNADA                           1
        JEFE-OYM        Responsable de O y M.     ✏ 🗑
```

- Las gerencias respetan el mismo orden de negocio que las áreas (General, Prod.
  Agrícola, Prod. Industrial, Comercial, Financiera, Administración).
- Puestos sin área o sin gerencia caen en grupos "Sin … asignada" al final.
- Crear/editar/eliminar puesto sigue igual.

## Archivos (2)

### 1. Diff en `lib/api/configuracion.ts` (cambio quirúrgico)

Seguí `diffs/DIFF-configuracion-listarPuestos.md`. Son DOS cambios chicos: ampliar
el tipo `Puesto` (sumar gerencia) y `listarPuestos` (resolver la gerencia de cada
puesto). **No reemplaces el archivo entero**, solo esos dos bloques.

### 2. Reemplazar `components/configuracion/GestionPuestos.tsx`

El componente nuevo con el doble agrupamiento. El formulario queda idéntico.

## Importante (orden de subida)

Subí **primero el diff de configuracion.ts** (para que `Puesto` tenga
`gerenciaId`/`gerenciaNombre`), y después el componente. Si subís solo el
componente sin el diff, el build falla porque el tipo no tiene esos campos.

## Nota typecheck

El patrón `<form action={formAction}>` (useFormState) puede dar un falso positivo
en verificadores locales; en Vercel compila bien (ya está en todos los ABM).

## Checklist

- [ ] Aplicado el diff de `listarPuestos` + tipo `Puesto` en configuracion.ts.
- [ ] Reemplazado `GestionPuestos.tsx`.
- [ ] Build verde.
- [ ] En Configuración → Puestos: se ven agrupados por gerencia y área, en dos
      niveles colapsables.
- [ ] Crear/editar/eliminar puesto sigue funcionando.
