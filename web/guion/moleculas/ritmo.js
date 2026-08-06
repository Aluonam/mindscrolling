// Velocidad de lectura. El factor multiplica la duración de cada palabra, así
// que a más factor, más despacio.

const RITMOS = [
  { etiqueta: '0,7×', factor: 1.45 },
  { etiqueta: '1,0×', factor: 1.00 },
  { etiqueta: '1,4×', factor: 0.72 },
];

let actual = 1;

export function factor() {
  return RITMOS[actual].factor;
}

export function etiqueta() {
  return RITMOS[actual].etiqueta;
}

export function siguiente() {
  actual = (actual + 1) % RITMOS.length;
  return RITMOS[actual].etiqueta;
}
