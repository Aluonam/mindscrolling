// Cómo se le cuenta a una persona que la edición de hoy no salió entera.
//
// Aquí no se toca el DOM: entra lo que publicó el ciclo y sale una frase. El
// tono importa tanto como el dato — quien lee no tiene por qué saber qué es un
// cupo de tokens, pero sí merece saber por qué hoy hay menos.

/**
 * Devuelve cadena vacía cuando no hay nada que contar, que es lo normal.
 *
 * Las ediciones publicadas antes de que esto existiera no traen `incidencias`.
 * Se tratan como buenas: no hay motivo para sospechar de ellas, y un aviso que
 * salta sin causa se aprende a ignorar en dos días.
 */
export function textoDeIncidencia(incidencias) {
  if (!incidencias) return '';

  const previstas = incidencias.previstas ?? 0;
  const publicadas = incidencias.publicadas ?? 0;
  const faltan = previstas - publicadas;

  if (faltan > 0 && incidencias.cupoAgotado) {
    return `Hoy se han quedado en ${publicadas} de ${previstas}. La inteligencia `
      + 'artificial que escribe los resúmenes gastó su cuota gratuita del día '
      + 'antes de terminar. Mañana vuelve entera.';
  }

  if (faltan > 0) {
    return `Hoy se han quedado en ${publicadas} de ${previstas}. A las otras `
      + `${faltan} no se les pudo escribir un resumen a la altura, y se `
      + 'prefirió dejarlas fuera antes que enseñarlas mal.';
  }

  if (incidencias.cupoAgotado) {
    return 'Están todas, pero parte de los resúmenes de hoy los ha escrito el '
      + 'modelo de repuesto: la cuota gratuita del bueno se agotó a media '
      + 'edición. Puede que se note en la redacción.';
  }

  return '';
}
