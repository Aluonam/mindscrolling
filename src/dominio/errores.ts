// Lo que le puede pasar al ciclo y no es un fallo del programa.

/**
 * Hoy ya no se puede escribir más: el proveedor agotó su cupo del día.
 *
 * No es un error que corregir, es un límite del calendario. Quien lo recibe no
 * reintenta ni sigue pidiendo: cierra la edición con lo que lleve escrito y la
 * publica. Veinte piezas son una edición corta; cero piezas es un día perdido.
 */
export class SinCupoHoy extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'SinCupoHoy';
  }
}
