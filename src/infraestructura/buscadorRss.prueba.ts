// La limpieza del texto que llega de los feeds.
//
// Se prueba porque su fallo no da error: sale una pieza publicada con
// «<span class=...» o «&#8217;» en mitad del título, y no se ve hasta que
// alguien la lee en el móvil. Los casos de aquí salieron así.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { limpiar } from './buscadorRss.ts';

test('las etiquetas se van', () => {
  assert.equal(limpiar('<p>Hola <b>mundo</b></p>'), 'Hola mundo');
});

test('las etiquetas escapadas también', () => {
  // Este era el fallo: se quitaban las etiquetas antes de decodificar, así que
  // no había ninguna que quitar, y al decodificar volvían a aparecer.
  assert.equal(limpiar('&lt;span class="x"&gt;Hola&lt;/span&gt;'), 'Hola');
});

test('las entidades numéricas se leen, en decimal y en hexadecimal', () => {
  assert.equal(limpiar('&#8216;Dragon Ball&#8217;'), '‘Dragon Ball’');
  assert.equal(limpiar('Ezra Klein&#x27;s interview'), "Ezra Klein's interview");
  assert.equal(limpiar('Sigue&#8230;'), 'Sigue…');
});

test('las entidades con nombre también', () => {
  assert.equal(limpiar('&ldquo;cita&rdquo; &mdash; autor'), '“cita” — autor');
});

test('un feed que escapa dos veces se deshace igual', () => {
  // Tras una sola pasada quedaban 372 «&quot;» y 116 «&lt;» en el catálogo.
  assert.equal(limpiar('&amp;lt;p&amp;gt;Hola&amp;lt;/p&amp;gt;'), 'Hola');
});

test('el CDATA se abre', () => {
  assert.equal(limpiar('<![CDATA[Un resumen]]>'), 'Un resumen');
});

test('la estadística de un paper no se toca', () => {
  // Con un «<[^>]+>» a secas esto perdía el trozo de en medio.
  assert.equal(
    limpiar('mejoró la marcha (p < 0,05) en n > 30 pacientes'),
    'mejoró la marcha (p < 0,05) en n > 30 pacientes',
  );
});

test('un código que no significa nada se deja como está', () => {
  assert.equal(limpiar('raro &#99999999;'), 'raro &#99999999;');
});

test('los espacios de más se juntan en uno', () => {
  assert.equal(limpiar('  Hola   <br/>   mundo  '), 'Hola mundo');
});
