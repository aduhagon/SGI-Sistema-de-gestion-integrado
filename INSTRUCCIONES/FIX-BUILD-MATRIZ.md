# Fix build — falta obtenerPanoramaNormas en matriz.ts

## Qué pasó

Subiste la página `cumplimiento/panorama/page.tsx`, que importa
`obtenerPanoramaNormas` desde `@/lib/api/matriz`. Pero la función **no se pegó**
en `lib/api/matriz.ts`, así que el import no resuelve y el build falla:

```
Module '"@/lib/api/matriz"' has no exported member 'obtenerPanoramaNormas'.
```

## Solución

Reemplazá tu `lib/api/matriz.ts` por el archivo **completo** incluido en este
paquete. Es tu archivo actual (las 175 líneas tal cual, sin tocar nada) **más**
la función `obtenerPanoramaNormas` agregada al final.

Lo leí de tu repo en su estado actual, así que no pierde nada de lo que ya
tenías: `obtenerMatriz`, `obtenerNormasConRequisitos`, todos los tipos, etc.,
quedan idénticos. Solo se suma la función nueva.

### Pasos

1. En GitHub, abrí `lib/api/matriz.ts`.
2. Reemplazá **todo** el contenido por el del archivo incluido
   (`lib/api/matriz.ts`).
3. Commit a `main`.
4. Build. La página del panorama ya va a encontrar la función.

> Verificado: el archivo completo tipa limpio, y el join usa los nombres de FK
> reales de tu base (`coberturas_documento_id_fkey`,
> `requisitos_version_norma_id_fkey`, `versiones_norma_norma_id_fkey`).

## Por qué pasó (para la próxima)

El snippet venía como archivo aparte para "pegar al final". Ese paso manual es
fácil de saltear. Por eso ahora te lo doy como archivo completo para reemplazar:
menos pasos, menos margen de error.

## Checklist

- [ ] `lib/api/matriz.ts` reemplazado por la versión completa.
- [ ] Build verde (sin el error de `obtenerPanoramaNormas`).
- [ ] Entrar a `/cumplimiento/panorama`: se ven las normas con su cobertura.
