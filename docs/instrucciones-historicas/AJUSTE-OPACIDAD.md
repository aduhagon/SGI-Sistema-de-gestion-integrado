# Ajuste — más opacidad al fondo del mapa

El fondo quedaba casi imperceptible. Se subió la opacidad del mapa de 0.10 a 0.18
y se aligeró un poco el velo, para que se aprecie sin tapar los procesos.

## Archivo a reemplazar (1)

`app/(app)/procesos/page.tsx`

## Para seguir calibrando

La línea con `opacity-[0.18]` controla la intensidad. Si querés más marcado,
subila a 0.22 o 0.25; si fue mucho, bajala. Avisame el número que te guste.

## Checklist
- [ ] Reemplazado page.tsx
- [ ] Build verde + Ctrl+Shift+R
- [ ] El mapa se ve más presente, procesos legibles
