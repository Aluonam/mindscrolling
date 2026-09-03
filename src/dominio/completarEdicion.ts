// Rellenar la edición de hoy con lo que quedó de la anterior.
//
// El día que el cupo de la IA se agota a mitad, la edición sale corta. Antes se
// publicaba corta y ya; ahora se completa con las piezas de la edición previa
// que hoy no han vuelto a salir. Es preferible releer algo de ayer a que el
// carril se acabe a los veinte deslizamientos.
//
// Función pura, como todo el dominio: entran dos listas y sale una. Sin red,
// sin ficheros, sin reloj.

import type { Edicion, PiezaPublicada } from './tipos.ts';

/**
 * Las de hoy primero y las heredadas después, hasta llegar al objetivo.
 *
 * Tres reglas, y las tres importan:
 *
 * 1. **Ninguna pieza de hoy se cae.** Lo nuevo manda siempre; lo heredado solo
 *    ocupa el hueco que quedó.
 * 2. **Nada se repite.** Se descarta por huella, que es la identidad real de
 *    una pieza: la misma noticia con dos direcciones distintas es una.
 * 3. **Cada pieza recuerda de qué día es.** Una heredada que ya venía heredada
 *    conserva su fecha original, no la de la edición por la que pasó. Así el
 *    lector puede decir la verdad —«del 1 de septiembre»— por muchas ediciones
 *    que la hayan arrastrado.
 *
 * La herencia es en cadena a propósito: mientras haya sequía, el carril se
 * completa con lo más reciente que haya, aunque venga de varios días atrás.
 */
export function completarConAnteriores(
  deHoy: readonly PiezaPublicada[],
  anterior: Edicion | null,
  objetivo: number,
): PiezaPublicada[] {
  const completa = [...deHoy];
  if (!anterior) return completa;

  const yaEstan = new Set(deHoy.map(p => p.huella));

  for (const pieza of anterior.piezas) {
    if (completa.length >= objetivo) break;
    if (yaEstan.has(pieza.huella)) continue;

    yaEstan.add(pieza.huella);
    completa.push({ ...pieza, deOtroDia: pieza.deOtroDia ?? anterior.fecha });
  }

  return completa;
}

/** Cuántas de la lista no se escribieron hoy. Para contarlo en las incidencias. */
export function cuantasHeredadas(piezas: readonly PiezaPublicada[]): number {
  return piezas.filter(p => p.deOtroDia !== undefined).length;
}
