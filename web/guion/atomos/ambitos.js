// Los tres ámbitos, con el nombre que ve la lectora.
// El identificador viene del dominio; el color, de estilos/organismos/pieza.css.

const NOMBRES = {
  tecnico: 'Técnico',
  clinico: 'Clínico',
  gestion: 'Gestión',
};

export function nombreDe(ambito) {
  return NOMBRES[ambito] || ambito;
}

/** Un ámbito que no conocemos no puede teñir la interfaz. */
export function esConocido(ambito) {
  return Object.hasOwn(NOMBRES, ambito);
}
