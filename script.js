/* ══════════════════════════════════════════════════════════════════════
   script.js v6 · Joan Català Mateu
   ──────────────────────────────────────────────────────────────────────
   v6 = v5 + botón "← atrás" en cada plato del bar (vuelve a la carta
        donde está el camarero). Ver marcas [v6] en el código.
   ──────────────────────────────────────────────────────────────────────
   TRES PANTALLAS en la misma página (body[data-pantalla]):
     portada → nombre grande + Conóceme / Contactar / Entrar
     diario  → la web entera, generada desde <template id="datosBar">
     bar     → el bar pixel-art con el camarero
   Cada apartado lleva una fila .nav3 con los botones de los OTROS DOS
   destinos (botonera() la genera y marca el actual con aria-current).
   ══════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

/* ── 0. Utilidades ─────────────────────────────────────────────────── */
var $  = function (s, c) { return (c || document).querySelector(s); };
var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
var on = function (el, ev, fn) { if (el) el.addEventListener(ev, fn); };
var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function modulo(nombre, fn) {
  try { fn(); } catch (e) { console.error('[web] módulo "' + nombre + '":', e); }
}

/* Año en portada/diario */
modulo('year', function () {
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

/* ══════════════════════════════════════════════════════════════════════
   1. LOS DATOS — un solo sitio: <template id="datosBar">
   Se usan DOS veces: clonados uno a uno en el bar, y todos seguidos
   en el diario. El orden del template es el orden de carta y sumario.
   ══════════════════════════════════════════════════════════════════════ */
var PLATOS = [], actual = 0;

var CARTA = {
  'sobre-mi' : { precio:'la base',        dicho:'Empieza por aquí, es la salsa de todo lo demás: entrenar, estudiar y revisar.' },
  'esgrima'  : { precio:'7 años',         dicho:'Siete años de pista. Te lo sirvo con la lección que vale más que las medallas.' },
  'viajar'   : { precio:'fuera del mapa', dicho:'Viajar no es mirar monumentos, es arreglártelas solo. Sale frío, como me gusta.' },
  'musica'   : { precio:'3 listas',       dicho:'La música aquí no es decorativa: es una herramienta con su sitio y su momento.' },
  'ingles'   : { precio:'B2 en curso',    dicho:'Inglés por independencia. Se equivoca uno hablando y deja de equivocarse leyendo.' },
  'estudios' : { precio:'DAM · C1',       dicho:'Bachillerato, primero de DAM en el Simarro y el C1 de valencià enmarcado en la pared.' },
  'ia'       : { precio:'a futuro',       dicho:'Esto es lo serio: vivir de crear con IA. Un prototipo al día, criterio el primero.' },
  'proyectos': { precio:'en marcha',      dicho:'De postre, lo que estoy construyendo ahora mismo. Café y código.' },
  'clima'    : { precio:'en vivo',        dicho:'Esto lo pide la casa: el tiempo de ahora, sin salir del bar.' }
};
var SALUDO = [
  'Buenas. Siéntate donde quieras, hoy no hay prisa.',
  '¿Qué quieres saber de Joan? Elige de la pizarra y te lo cuento entero.'
];

function leerPlatos() {
  var tpl = document.getElementById('datosBar');
  if (!tpl) { console.error('[web] falta <template id="datosBar">'); return []; }
  return $$('article', tpl.content).map(function (art, i) {
    var h2 = $('h2', art);
    var min = Math.max(1, Math.round(art.textContent.replace(/\s+/g, ' ').trim().split(' ').length / 170));
    var m = CARTA[art.id] || {};
    return {
      art: art, id: art.id || 'plato-' + (i + 1), n: i + 1,
      name: h2 ? h2.textContent.trim() : art.id, min: min,
      precio: m.precio || (min + ' min'),
      dicho: m.dicho || 'Aquí tienes. Buen provecho.'
    };
  });
}
PLATOS = leerPlatos();   /* se lee una sola vez: mismo orden en bar y diario */

/* ══════════════════════════════════════════════════════════════════════
   1b. CLIMA OPENWEATHER — sencillo, gratuito y sin base de datos
   Cambia solo CLIMA.key por tu API key real.
   ══════════════════════════════════════════════════════════════════════ */
var CLIMA = {
  key: '5796a0d1d068a83ebae6d0f194fce351',
  ciudad: 'Valencia,ES',
  lat: null,
  lon: null,
  unidades: 'metric',
  lang: 'es',
  cadaMinutos: 10
};

var ultimaData = null;

function unidadTemp() {
  return CLIMA.unidades === 'imperial' ? '°F' : '°C';
}

function iconoClima(code) {
  var m = {
    '01d': '☀️',
    '01n': '🌙',
    '02d': '⛅',
    '02n': '☁️',
    '03d': '☁️',
    '03n': '☁️',
    '04d': '☁️',
    '04n': '☁️',
    '09d': '🌧️',
    '09n': '🌧️',
    '10d': '🌦️',
    '10n': '🌧️',
    '11d': '⛈️',
    '11n': '⛈️',
    '13d': '❄️',
    '13n': '❄️',
    '50d': '🌫️',
    '50n': '🌫️'
  };

  return m[code] || '🌡️';
}

function climaUrl() {
  var params = new URLSearchParams();

  params.set('units', CLIMA.unidades);
  params.set('lang', CLIMA.lang);
  params.set('appid', CLIMA.key);

  if (CLIMA.lat != null && CLIMA.lon != null) {
    params.set('lat', CLIMA.lat);
    params.set('lon', CLIMA.lon);
  } else {
    params.set('q', CLIMA.ciudad);
  }

  return 'https://api.openweathermap.org/data/2.5/weather?' + params.toString();
}

function pintarClima(data) {
  if (data) ultimaData = data;
  if (!ultimaData) return;

  var w = ultimaData.weather && ultimaData.weather[0] ? ultimaData.weather[0] : {};

  var estado = w.description
    ? w.description.charAt(0).toUpperCase() + w.description.slice(1)
    : 'Sin descripción';

  var icon = iconoClima(w.icon);

  var temp = ultimaData.main && ultimaData.main.temp != null ? Math.round(ultimaData.main.temp) : null;
  var sens = ultimaData.main && ultimaData.main.feels_like != null ? Math.round(ultimaData.main.feels_like) : null;
  var min = ultimaData.main && ultimaData.main.temp_min != null ? Math.round(ultimaData.main.temp_min) : null;
  var max = ultimaData.main && ultimaData.main.temp_max != null ? Math.round(ultimaData.main.temp_max) : null;
  var humedad = ultimaData.main ? ultimaData.main.humidity : null;
  var viento = ultimaData.wind ? ultimaData.wind.speed : null;
  var ciudad = ultimaData.name || CLIMA.ciudad;
  var hora = new Date().toLocaleString('es-ES');

  $$('[data-clima]').forEach(function (bloque) {
    var e = bloque.querySelector('[data-clima-estado]');
    var t = bloque.querySelector('[data-clima-temp]');
    var x = bloque.querySelector('[data-clima-extra]');
    var n = bloque.querySelector('[data-clima-nota]');

    if (e) e.textContent = icon + ' ' + estado;

    if (t) {
      t.textContent = (temp != null ? temp : '—') + ' ' + unidadTemp();
    }

    if (x) {
      x.textContent =
        'Sensación ' + (sens != null ? sens : '—') + ' ' + unidadTemp() +
        ' · mín ' + (min != null ? min : '—') +
        ' · máx ' + (max != null ? max : '—') +
        ' · humedad ' + (humedad != null ? humedad : '—') + '%' +
        ' · viento ' + (viento != null ? viento : '—') + ' m/s';
    }

    if (n) {
      n.textContent = 'Ciudad: ' + ciudad + ' · Actualizado: ' + hora;
    }
  });
}

function pintarErrorClima(mensaje) {
  $$('[data-clima]').forEach(function (bloque) {
    var e = bloque.querySelector('[data-clima-estado]');
    var t = bloque.querySelector('[data-clima-temp]');
    var x = bloque.querySelector('[data-clima-extra]');
    var n = bloque.querySelector('[data-clima-nota]');

    if (e) e.textContent = '☁️ Tiempo no disponible';
    if (t) t.textContent = '— ' + unidadTemp();
    if (x) x.textContent = 'Revisa la API key, la ciudad o la conexión.';
    if (n) n.textContent = mensaje || 'Error desconocido';
  });
}

function cargarClima() {
  if (!CLIMA.key || CLIMA.key.indexOf('TU_API_KEY') > -1) {
    pintarErrorClima('Falta la API key en script.js.');
    return;
  }

  fetch(climaUrl())
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(pintarClima)
    .catch(function (e) {
      console.error('[clima]', e);
      pintarErrorClima(e.message);
    });
}

/* ══════════════════════════════════════════════════════════════════════
   2. EL CONMUTADOR DE PANTALLAS
   ══════════════════════════════════════════════════════════════════════ */
var bar, panel, listaEl, cuerpo, sello, txtEl, ecoEl;

function setPantalla(p) {
  document.body.dataset.pantalla = p;
  Escena.corriendo(p === 'bar');                 /* la escena solo gasta CPU si se ve */
  if (p === 'diario') window.scrollTo(0, 0);
}

/* Los destinos. "contacto" se comporta distinto según dónde estés:
   dentro del bar abre la vista contacto del panel; desde fuera aterriza
   en la sección de contacto del diario (tu contacto y todo alrededor). */
var DESTINOS = {
  portada : { txt:'⌂ portada',    acc:function(){ setPantalla('portada'); } },
  bar     : { txt:'☰ el bar',     acc:function(){ setPantalla('bar'); verVista('carta'); saludar(); } },
  diario  : { txt:'📖 el diario', acc:function(){ setPantalla('diario'); } },
  contacto: { txt:'✉ contactar',  acc:function(){
    if (document.body.dataset.pantalla === 'bar') { setPantalla('bar'); verVista('contacto'); decir('La cuenta no corre. El correo está ahí mismo.', true); }
    else { setPantalla('diario'); var c = document.getElementById('contacto');
           if (c) c.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); }
  } },
  /* [v6] ← atrás: dentro del bar, volver a la pizarra donde está el camarero */
  carta   : { txt:'← atrás',      acc:function(){ irCarta(); } }
};

/* Fila con los OTROS DOS destinos (el actual sale marcado y apagado) */
function botonera(actual) {
  var html = '';
  ['bar','diario','contacto'].forEach(function (k) {
    var d = DESTINOS[k], cur = (k === actual);
    html += '<button class="jn-btn jn-btn--linea" type="button" data-ir="' + k + '"' +
            (cur ? ' aria-current="page"' : '') + '>' + d.txt + '</button>';
  });
  return html;
}

/* Un solo manejador global para todos los botones de destino (data-ir) */
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-ir]');
  if (!b) return;
  var d = DESTINOS[b.getAttribute('data-ir')];
  if (d) d.acc();
});

/* ══════════════════════════════════════════════════════════════════════
   3. EL DIARIO — se construye entero desde el template
   ══════════════════════════════════════════════════════════════════════ */
modulo('diario', function () {
  var cuerpoD = document.getElementById('diarioCuerpo');
  var sumario = document.getElementById('sumarioLista');
  if (!cuerpoD || !sumario) return;

  /* Sumario: un enlace por entrada */
  sumario.innerHTML = PLATOS.map(function (p) {
    return '<li><a href="#' + p.id + '">' + p.name + '</a></li>';
  }).join('');

  /* Entradas: número, contenido íntegro y los botones de salida */
  cuerpoD.innerHTML = PLATOS.map(function (p) {
    var clon = p.art.cloneNode(true);
    clon.removeAttribute('id');
    return '<section class="entrada" id="' + p.id + '">' +
             '<p class="num">plato ' + ('0' + p.n).slice(-2) + '</p>' +
             clon.innerHTML +
             '<div class="nav3">' + botonera('diario') + '</div>' +
           '</section>';
  }).join('');

  /* Rellena el clima si ya lo teníamos cargado */
  pintarClima(ultimaData);

  /* Enlaces internos (#) con scroll suave, sin recargar */
  on(document.getElementById('diario'), 'click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var t = document.getElementById(a.getAttribute('href').slice(1));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); }
  });

  /* Botonera de la sección contacto (los otros dos: bar y diario) */
  var n3 = document.getElementById('nav3Contacto');
  if (n3) n3.innerHTML = botonera('contacto');

  /* Copiar correo dentro del diario */
  on(document.getElementById('diarioCopyMail'), 'click', function () { copiar(this); });
});

/* ══════════════════════════════════════════════════════════════════════
   4. EL BAR — carta, serveta y contacto
   ══════════════════════════════════════════════════════════════════════ */
function construirCarta() {
  if (!listaEl) return;
  listaEl.innerHTML = PLATOS.map(function (p, i) {
    return '<li><button class="plato" type="button" data-i="' + i + '" style="--i:' + i + '">' +
             '<span class="plato__num">' + ('0' + p.n).slice(-2) + '</span>' +
             '<span class="plato__name">' + p.name + '</span>' +
             '<span class="plato__dots" aria-hidden="true"></span>' +
             '<span class="plato__tag">' + p.precio + '</span>' +
           '</button></li>';
  }).join('');
  var total = document.getElementById('barTotal');
  if (total) total.textContent = PLATOS.length;

  /* Actualiza el texto del hint según el número real de platos */
  var hint = document.querySelector('.bar__hint');
  if (hint) {
    hint.textContent =
      '1–' + PLATOS.length +
      ' saltar a un plato · c carta · s siguiente · m contactar · esc carta';
  }
}

function verVista(v) { if (panel) panel.dataset.vista = v; }

/* Sirve el plato COMPLETO + [← atrás] + siguiente + los otros dos destinos */
function servirPlato(i) {
  var p = PLATOS[i]; if (!p || !cuerpo) return;
  actual = i;

  var clon = p.art.cloneNode(true);
  clon.removeAttribute('id');
  clon.className = 'plato-post';
  cuerpo.replaceChildren(clon);

  var sig = PLATOS[(i + 1) % PLATOS.length];
  var fin = document.createElement('div');
  fin.className = 'servido__fin';
  fin.innerHTML =
    /* [v6] el botón que pediste: volver a la carta con el camarero */
    '<button class="jn-btn jn-btn--linea" type="button" data-ir="carta">← atrás</button>' +
    '<button class="jn-btn" type="button" data-siguiente="' + PLATOS.indexOf(sig) + '">Siguiente · ' + sig.name + ' →</button>' +
    botonera('bar');                                  /* 📖 el diario · ✉ contactar */
  cuerpo.appendChild(fin);

  /* Importante: como el artículo se clona, hay que volver a pintar el clima */
  pintarClima(ultimaData);

  if (sello) sello.textContent = 'plato ' + ('0' + p.n).slice(-2) + ' · ' + p.min + ' min';
  verVista('plato');
  decir(p.dicho, true);
  Escena.pulso();
  setTimeout(function () { try { cuerpo.focus({ preventScroll: true }); } catch (e) {} }, 240);
}

/* Volver a la pizarra (la usan el botón ← atrás, la tecla c y Esc del panel) */
function irCarta() {
  verVista('carta');
  decir('¿Otra cosa? Mira la pizarra tranquilamente.', true);
  var primero = $('.plato', listaEl); if (primero) primero.focus();
}
function saludar() { decir(SALUDO[0], true); decir(SALUDO[1]); }

modulo('bar', function () {
  bar     = document.getElementById('bar');
  panel   = document.getElementById('barPanel');
  listaEl = document.getElementById('barLista');
  cuerpo  = document.getElementById('servidoCuerpo');
  sello   = document.getElementById('servidoSello');
  txtEl   = document.getElementById('burbujaTxt');
  ecoEl   = document.getElementById('burbujaEco');
  if (!bar || !panel || !listaEl || !cuerpo) { console.error('[bar] faltan referencias'); return; }

  construirCarta();

  /* Pizarra: clic, sobrevuelo y flechas como menú de videojuego */
  on(listaEl, 'click', function (e) {
    var b = e.target.closest && e.target.closest('.plato');
    if (b) servirPlato(+b.dataset.i);
  });
  on(listaEl, 'mouseover', function (e) {
    if (e.target.closest && e.target.closest('.plato')) { Escena.pulso(); Sonido.tintir(); }
  });
  on(listaEl, 'keydown', function (e) {
    var items = $$('.plato', listaEl), i = items.indexOf(document.activeElement);
    if (i < 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  });

  /* Serveta: siguiente / anterior (los destinos ya los capta el manejador global) */
  on(cuerpo, 'click', function (e) {
    var s = e.target.closest && e.target.closest('[data-siguiente]');
    var a = e.target.closest && e.target.closest('[data-anterior]');
    if (s) servirPlato(+s.dataset.siguiente);
    else if (a) servirPlato(+a.dataset.anterior);
  });
  on(document.getElementById('barPrev'), 'click', function () { servirPlato((actual - 1 + PLATOS.length) % PLATOS.length); });
  on(document.getElementById('barInicio'), 'click', irCarta);            /* ☰ la carta */
  on(document.getElementById('barContactoBack'), 'click', irCarta);      /* contacto → carta */
  on(document.getElementById('burbuja'), 'click', saltarTexto);
  on(document.getElementById('barCopyMail'), 'click', function () { copiar(this); });
  on(document.getElementById('barSon'), 'click', function () {
    var o = Sonido.conmutar();
    this.setAttribute('aria-pressed', o ? 'true' : 'false');
    this.textContent = 'sonido: ' + (o ? 'on' : 'off');
  });

  /* Esc = portada · Tab encerrado en el bar */
  on(bar, 'keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); setPantalla('portada'); return; }
    if (e.key !== 'Tab') return;
    var foco = $$('button, a[href], [tabindex="-1"]', bar).filter(function (el) {
      return el.offsetParent !== null && !el.disabled;
    });
    if (!foco.length) return;
    var a = foco[0], z = foco[foco.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });

  /* Parallax suave de la escena */
  var escena = document.getElementById('barEscena');
  on(escena, 'pointermove', function (e) {
    var r = this.getBoundingClientRect();
    this.style.setProperty('--px', (-((e.clientX - r.left) / r.width  - .5) * 7).toFixed(2) + 'px');
    this.style.setProperty('--py', (-((e.clientY - r.top)  / r.height - .5) * 5).toFixed(2) + 'px');
  });
  on(escena, 'pointerleave', function () {
    this.style.setProperty('--px', '0px'); this.style.setProperty('--py', '0px');
  });
});

/* ══════════════════════════════════════════════════════════════════════
   5. MÁQUINA DE ESCRIBIR del camarero
   ══════════════════════════════════════════════════════════════════════ */
var cola = [], escribiendo = null, reloj = null;
function fijar(t) { if (ecoEl) ecoEl.hidden = true; if (txtEl) txtEl.textContent = t; }
function decir(frase, urgente) {
  if (!txtEl) return;
  if (urgente) { cola.length = 0; clearInterval(reloj); escribiendo = null; Escena.hablar(false); }
  cola.push(frase);
  if (!escribiendo) siguienteFrase();
}
function siguienteFrase() {
  if (!cola.length) return;
  var frase = cola.shift();
  if (REDUCED) { fijar(frase); terminar(); return; }
  var anterior = txtEl.textContent;
  if (ecoEl) { ecoEl.textContent = anterior; ecoEl.hidden = !anterior; }
  txtEl.textContent = '';
  escribiendo = { txt: frase, i: 0 };
  Escena.hablar(true);
  reloj = setInterval(pompear, 24);
}
function pompear() {
  if (!escribiendo) return;
  var t = escribiendo.txt;
  escribiendo.i++;
  txtEl.textContent = t.slice(0, escribiendo.i);
  var ch = t.charAt(escribiendo.i - 1);
  if (',;:'.indexOf(ch) > -1) escribiendo.i += 6;          /* pausa corta  */
  else if ('.!?'.indexOf(ch) > -1) escribiendo.i += 14;    /* pausa larga  */
  if (escribiendo.i % 3 === 0) Sonido.blip();
  if (escribiendo.i >= t.length) { txtEl.textContent = t; terminar(); }
}
function terminar() {
  clearInterval(reloj); reloj = null; escribiendo = null;
  Escena.hablar(false);
  if (cola.length) setTimeout(siguienteFrase, 340);
}
function saltarTexto() {                                   /* clic en la burbuja */
  if (!escribiendo && !cola.length) return;
  var destino = cola.length ? cola[cola.length - 1] : escribiendo.txt;
  cola.length = 0; clearInterval(reloj); fijar(destino); terminar();
}

/* ══════════════════════════════════════════════════════════════════════
   6. ESCENA PIXEL-ART — canvas 256×144, pixelado duro.
   Capas: pared → ventana → pizarra mural → estante → techo → lámparas
   → camarero → barra → cafetera → tazas → gato → conos de luz → vapor
   → polvo → grano → viñeta.
   ══════════════════════════════════════════════════════════════════════ */
var Escena = (function () {
  var cv = document.getElementById('barCanvas');
  function noop() {}
  if (!cv || !cv.getContext) return { corriendo: noop, hablar: noop, pulso: noop };
  var g = cv.getContext('2d', { alpha: false });
  if (!g) return { corriendo: noop, hablar: noop, pulso: noop };

  var W = cv.width, H = cv.height, CY = 100;   /* CY = borde superior de la barra */
  g.imageSmoothingEnabled = false;

  var C = {
    pared:'#3a2418', junta:'#241505', marco:'#2b1a11', noche:'#0f1a2b', ciudad:'#0a1120',
    luz:'#ffd27a', lluvia:'#9ecbe8', tablero:'#8f5a30', canto:'#c98a4f', frente:'#241710',
    panelito:'#2d1c12', madera:'#4a2c1a', pizarra:'#1e2a24', tiza:'#dfe6da',
    metal:'#b9c3cc', metal2:'#8d949c', metal3:'#3f464d', camisa:'#efe6d6', chaleco:'#26303f',
    piel:'#e3ac82', piel2:'#c98d64', pelo:'#241a14', lazo:'#c04a3a', plato:'#cfc6b2',
    cafe:'#5a3320', gato:'#3a2b22', planta:'#3f7a4a', tiesto:'#a4552f', bombilla:'#ffdf9e'
  };
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); }
  function A(x, y, w, h, c, a) { g.globalAlpha = a; g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); g.globalAlpha = 1; }
  function azar(n) { return (Math.sin(n * 12.9898) * 43758.5453) % 1; }   /* pseudoaleatorio estable */

  /* Grano de película: se genera una vez y siempre se superpone */
  var grano = document.createElement('canvas'); grano.width = W; grano.height = H;
  (function () {
    var gg = grano.getContext('2d'), n = Math.floor(W * H * .05);
    for (var i = 0; i < n; i++) {
      gg.fillStyle = Math.random() > .5 ? 'rgba(255,240,210,.05)' : 'rgba(0,0,0,.07)';
      gg.fillRect(Math.random() * W | 0, Math.random() * H | 0, 1, 1);
    }
  })();
  var vin = g.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .92);
  vin.addColorStop(0, 'rgba(0,0,0,0)'); vin.addColorStop(1, 'rgba(0,0,0,.72)');

  var st = { t0: 0, raf: 0, corriendo: false, hablando: false, pulso: 0 };
  var lluvia = [], vapor = [], polvo = [], i;
  for (i = 0; i < 46; i++) lluvia.push({ x: Math.random(), y: Math.random(), v: .3 + Math.random() * .5, l: 2 + (Math.random() * 4 | 0) });
  for (i = 0; i < 34; i++) polvo.push({ x: Math.random() * W, y: 16 + Math.random() * 78, v: .5 + Math.random(), f: Math.random() * 6.28 });
  var lamparas = [{ x: 40 }, { x: 176 }];

  function soltarVapor(x, y, n) {
    if (vapor.length > 130) return;
    for (var k = 0; k < n; k++) vapor.push({ x: x + Math.random() * 3 - 1.5, y: y, v: 7 + Math.random() * 9, vida: 1, f: Math.random() * 6 });
  }

  /* Pared de listones con veta falsa */
  function pared() {
    R(0, 10, W, CY - 10, C.pared);
    for (var x = 0; x < W; x += 13) {
      var s = azar(x * .37);
      R(x, 10, 12, CY - 10, s > .66 ? '#402a1c' : (s > .33 ? '#37221a' : '#3e2820'));
      R(x + 12, 10, 1, CY - 10, C.junta);
    }
    R(0, 78, W, 2, C.junta); R(0, 80, W, CY - 80, '#2e1c13');
  }
  /* Ventana a la calle: edificios, ventanas titilando y lluvia */
  var VX = 8, VY = 22, VW = 58, VH = 46;
  function ventana(t, dt) {
    R(VX - 3, VY - 3, VW + 6, VH + 6, C.marco); R(VX, VY, VW, VH, C.noche);
    g.save(); g.beginPath(); g.rect(VX, VY, VW, VH); g.clip();
    for (var b = 0; b < 6; b++) {
      var bx = VX + b * 10 + 1, bh = 9 + azar(b * 7) * 22;
      R(bx, VY + VH - bh, 9, bh, C.ciudad);
      for (var w = 0; w < 4; w++)
        if (azar(b * 13 + w * 3 + (t * .12 | 0)) > .58)
          A(bx + 1 + (w % 2) * 4, VY + VH - bh + 2 + ((w / 2) | 0) * 5, 2, 2, C.luz, .8);
    }
    for (var k = 0; k < lluvia.length; k++) {
      var d = lluvia[k]; d.y += d.v * dt; d.x -= d.v * dt * .12;
      if (d.y > 1) { d.y = -.06; d.x = Math.random(); }
      A(VX + d.x * VW, VY + d.y * VH, 1, d.l, C.lluvia, .5);
    }
    g.restore();
    R(VX + (VW >> 1) - 1, VY, 2, VH, C.marco);
    R(VX, VY + (VH >> 1) - 1, VW, 2, C.marco);
    R(VX - 5, VY + VH + 3, VW + 10, 3, C.madera);
  }
  /* Pizarra colgada: menú con tiza + tacita humeante */
  function menuPared(t) {
    var BX = 140, BY = 26, BW = 62, BH = 42;
    R(BX - 3, BY - 3, BW + 6, BH + 6, C.madera); R(BX, BY, BW, BH, C.pizarra);
    A(BX + 2, BY + 2, BW - 4, 1, C.tiza, .25);
    for (var f = 0; f < 5; f++) {
      var y = BY + 9 + f * 7, w = 16 + azar(f * 3.3) * 26;
      A(BX + 6, y, w, 1, C.tiza, .45); A(BX + 12 + w, y, 7, 1, '#e8c07a', .5);
    }
    var cx = BX + BW - 12, cy = BY + BH - 12;
    A(cx, cy, 7, 5, C.tiza, .55); A(cx + 7, cy + 1, 2, 3, C.tiza, .45);
    A(cx + 3 + Math.sin(t * 2), cy - 3, 1, 2, C.tiza, .35);
  }
  function estanteria(t) {
    var EX = 212, EW = 42;
    R(EX - 2, 42, EW + 4, 3, C.madera); R(EX - 2, 64, EW + 4, 3, C.madera);
    var tarimas = ['#8a4a3a', '#c9a04a', '#4a7a6a', '#a4552f', '#6a4a8a'];
    for (var f = 0; f < 5; f++) {
      var h = 8 + azar(f * 5) * 8, x = EX + 1 + f * 8;
      R(x, 42 - h, 6, h, tarimas[f]); R(x, 42 - h - 1, 6, 1, '#e8dcc8');
    }
    R(EX + 32, 56, 8, 8, C.tiesto);
    for (var p = 0; p < 4; p++) R(EX + 33 + p * 2 + Math.round(Math.sin(t * .9 + p)), 48, 1, 8, C.planta);
  }
  function techo(t) {
    R(0, 0, W, 10, '#140d09');
    for (var x = 8; x < W; x += 34) R(x, 0, 3, 10, '#0d0806');
    R(0, 9, W, 1, '#241710');
    var fx = 112, w = Math.abs(Math.cos(t * 2.6)) * 20 + 2;
    R(fx - 2, 10, 4, 4, '#1b1410'); R(fx - w, 13, w * 2, 2, '#241a14');
  }
  function lamparasE() {
    for (var i = 0; i < lamparas.length; i++) {
      var x = lamparas[i].x; R(x - 1, 0, 2, 20, '#1a1109');
      for (var k = 0; k < 6; k++) R(x - (3 + k), 20 + k, (3 + k) * 2, 1, k % 2 ? '#7a3b2e' : '#8f4635');
      R(x - 2, 26, 4, 3, C.bombilla);
    }
  }
  /* El camarero: respira, pestañea y mueve la boca al hablar */
  function camarero(t) {
    var bx = 104, bob = Math.round(Math.sin(t * 1.7)), y = CY - 2 + bob;
    R(bx - 3, y - 38, 6, 4, C.piel2);
    R(bx - 12, y - 35, 24, 40, C.camisa);
    R(bx - 12, y - 35, 6, 40, C.chaleco); R(bx + 6, y - 35, 6, 40, C.chaleco);
    R(bx - 4, y - 37, 3, 3, C.lazo); R(bx + 1, y - 37, 3, 3, C.lazo);
    var ay = y - 24 + Math.round(Math.sin(t * 1.7 + 1));
    R(bx + 12, y - 33, 4, 22, C.camisa);
    R(bx - 22, ay, 12, 4, C.camisa); R(bx - 25, ay, 3, 4, C.piel);
    R(bx - 31, ay - 3, 17, 3, C.metal); R(bx - 31, ay - 1, 17, 1, C.metal2);
    R(bx - 25, ay - 8, 6, 5, C.plato); R(bx - 24, ay - 7, 4, 1, C.cafe);
    if (Math.random() < .28) soltarVapor(bx - 22, ay - 9, 1);
    R(bx - 8, y - 52, 16, 14, C.piel);
    R(bx - 10, y - 46, 2, 4, C.piel2); R(bx + 8, y - 46, 2, 4, C.piel2);
    R(bx - 9, y - 54, 18, 6, C.pelo); R(bx - 9, y - 50, 2, 8, C.pelo); R(bx + 7, y - 50, 2, 8, C.pelo);
    R(bx - 6, y - 49, 4, 1, C.pelo); R(bx + 2, y - 49, 4, 1, C.pelo);
    if ((t % 4.6) > 4.42) { R(bx - 5, y - 45, 3, 1, C.pelo); R(bx + 2, y - 45, 3, 1, C.pelo); }
    else { R(bx - 5, y - 46, 3, 2, C.pelo); R(bx + 2, y - 46, 3, 2, C.pelo); }
    if (st.hablando && (Math.floor(t * 9) % 2 === 0)) R(bx - 2, y - 42, 5, 3, '#7a2a20');
    else R(bx - 2, y - 41, 4, 1, '#a35a44');
  }
  function barra() {
    A(0, CY - 3, W, 3, '#000', .28);
    R(0, CY, W, 4, C.tablero); R(0, CY, W, 1, C.canto); R(0, CY + 3, W, 1, C.madera);
    R(0, CY + 4, W, H - CY - 4, C.frente);
    for (var x = 4; x < W; x += 26) { R(x, CY + 9, 18, H - CY - 16, C.panelito); R(x, CY + 9, 18, 1, '#3a2418'); }
    R(0, H - 4, W, 4, '#170f0a');
  }
  function cafetera(t) {
    var x = 194, y = CY - 24;
    R(x, y, 36, 24, C.metal2); R(x, y, 36, 4, C.metal); R(x + 1, y + 22, 34, 2, C.metal3);
    R(x + 4, y + 8, 8, 6, C.metal3); R(x + 22, y + 8, 8, 6, C.metal3);
    R(x + 6, y + 14, 4, 5, '#2b3138'); R(x + 24, y + 14, 4, 5, '#2b3138');
    R(x + 14, y + 7, 7, 7, '#e8dcc8');
    R(x + 16 + Math.round(Math.sin(t * 1.1) * 2), y + 9, 2, 2, C.lazo);
    R(x + 32, y + 8, 2, 11, C.metal);
    if (Math.random() < .45) soltarVapor(x + 33, y + 6, 1);
  }
  function taza(x) {
    R(x - 4, CY - 2, 9, 2, C.plato); R(x - 2, CY - 7, 5, 5, '#efe6d2');
    R(x - 1, CY - 6, 3, 1, C.cafe); R(x + 3, CY - 6, 2, 2, '#efe6d2');
    if (Math.random() < .18) soltarVapor(x, CY - 8, 1);
  }
  function gato(t) {
    var x = 46, y = CY - 2;
    R(x, y - 6, 16, 6, C.gato); R(x + 12, y - 9, 7, 6, C.gato);
    R(x + 13, y - 11, 1, 2, C.gato); R(x + 18, y - 11, 1, 2, C.gato);
    R(x + 13, y - 7, 2, 1, '#120c09');
    R(x - 4, y - 5, 4, 2, C.gato); R(x - 5, y - 6 + Math.round(Math.sin(t * 1.6) * 2), 2, 3, C.gato);
  }
  /* Conos de luz: por delante de todo, con parpadeo eléctrico */
  function conos(t) {
    for (var i = 0; i < lamparas.length; i++) {
      var x = lamparas[i].x;
      var f = .78 + Math.sin(t * 6.3 + i * 2) * .05 + Math.sin(t * 21 + i) * .02 + st.pulso * .22;
      A(x - 4, 26, 8, 4, '#ffb066', .55 * f);
      for (var k = 0; k < CY - 30; k++) A(x - (8 + k * 1.9) / 2, 30 + k, 8 + k * 1.9, 1, '#ffc478', .026 * f);
      A(x - 17, CY, 34, 2, '#ffd8a0', .18 * f);
    }
  }
  function pintar(t, dt) {
    R(0, 0, W, H, '#0d0908');
    pared(); ventana(t, dt); menuPared(t); estanteria(t); techo(t); lamparasE();
    camarero(t); barra(); cafetera(t); taza(128); taza(154); gato(t);
    conos(t);
    for (var v = vapor.length - 1; v >= 0; v--) {                    /* vapor */
      var p = vapor[v]; p.y -= p.v * dt; p.x += Math.sin(p.y * .17 + p.f) * .3; p.vida -= dt * .5;
      if (p.vida <= 0 || p.y < 12) { vapor.splice(v, 1); continue; }
      A(p.x, p.y, 1, 1, '#efe6d2', p.vida * .34);
      if (p.vida < .65) A(p.x + 1, p.y - 1, 1, 1, '#efe6d2', p.vida * .2);
    }
    for (var d = 0; d < polvo.length; d++) {                          /* motas en el haz */
      var q = polvo[d]; q.x += Math.sin(t * .3 + q.f) * .07; q.y -= q.v * dt * 5;
      if (q.y < 14) { q.y = CY - 6; q.x = Math.random() * W; }
      var cerca = Math.min(Math.abs(q.x - lamparas[0].x), Math.abs(q.x - lamparas[1].x));
      if (.17 - cerca * .0045 > 0) A(q.x, q.y, 1, 1, '#ffd8a0', .17 - cerca * .0045);
    }
    g.drawImage(grano, 0, 0); g.fillStyle = vin; g.fillRect(0, 0, W, H);
    st.pulso *= .93;
  }
  var ultimo = 0;
  function bucle(now) {
    st.raf = requestAnimationFrame(bucle);
    if (document.hidden) return;                                      /* pestaña oculta: no gastar */
    var dt = Math.min(.05, (now - ultimo) / 1000) || .016; ultimo = now;
    pintar((now - st.t0) / 1000, dt);
  }
  return {
    corriendo: function (v) {                                         /* solo anima si el bar se ve */
      if (v && !st.corriendo) {
        pintar(0, .016);
        if (REDUCED) { st.corriendo = true; return; }                 /* estática: un fotograma */
        st.corriendo = true; st.t0 = performance.now(); ultimo = st.t0;
        st.raf = requestAnimationFrame(bucle);
      } else if (!v && st.corriendo) {
        cancelAnimationFrame(st.raf); st.corriendo = false;
      }
    },
    hablar: function (v) { st.hablando = v; },
    pulso:  function () { st.pulso = 1; }
  };
})();

/* ══════════════════════════════════════════════════════════════════════
   7. SONIDO opcional + copiar correo
   ══════════════════════════════════════════════════════════════════════ */
var Sonido = (function () {
  var ctx = null, activo = false;
  function audio() {
    if (!ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function pita(f, vol, dur) {
    if (!activo) return; var a = audio(); if (!a) return;
    var o = a.createOscillator(), gn = a.createGain();
    o.type = 'square'; o.frequency.value = f;
    gn.gain.setValueAtTime(vol, a.currentTime);
    gn.gain.exponentialRampToValueAtTime(.0005, a.currentTime + dur);
    o.connect(gn); gn.connect(a.destination); o.start(); o.stop(a.currentTime + dur + .01);
  }
  return {
    conmutar: function () { activo = !activo; if (activo) { audio(); pita(660, .02, .05); } return activo; },
    blip:   function () { pita(420 + Math.random() * 260, .014, .045); },
    tintir: function () { pita(1180, .008, .06); }
  };
})();

function copiar(btn) {
  var c = btn.getAttribute('data-copy');
  var ok = function () {
    var antes = btn.textContent; btn.textContent = '¡copiado!';
    setTimeout(function () { btn.textContent = antes; }, 2200);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(c).then(ok, function () {});
  else {
    var t = document.createElement('textarea'); t.value = c;
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); ok(); } catch (e) {}
    document.body.removeChild(t);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   7b. PANTALLA DE CARGA
   Se muestra al pulsar los botones de navegación y luego ejecuta la acción.
   ══════════════════════════════════════════════════════════════════════ */
var cargaOcupada = false;

modulo('carga', function () {
  var cargaEl = document.getElementById('carga');
  var msgEl   = document.getElementById('cargaMsg');
  var pistaEl = document.getElementById('cargaPista');

  if (!cargaEl || !msgEl || !pistaEl) return;

  function pick(a) {
    return a[Math.floor(Math.random() * a.length)];
  }

  function accionDesdeBoton(b) {
    if (!b) return null;

    if (b.hasAttribute('data-ir')) {
      var d = DESTINOS[b.getAttribute('data-ir')];
      return d ? function () { d.acc(); } : null;
    }

    if (b.classList.contains('plato')) {
      var i = parseInt(b.dataset.i, 10);
      return isNaN(i) ? null : function () { servirPlato(i); };
    }

    if (b.hasAttribute('data-siguiente')) {
      var s = parseInt(b.dataset.siguiente, 10);
      return isNaN(s) ? null : function () { servirPlato(s); };
    }

    if (b.hasAttribute('data-anterior')) {
      var a = parseInt(b.dataset.anterior, 10);
      return isNaN(a) ? null : function () { servirPlato(a); };
    }

    if (b.id === 'barPrev') {
      return function () {
        servirPlato((actual - 1 + PLATOS.length) % PLATOS.length);
      };
    }

    if (b.id === 'barContactoBack' || b.id === 'barInicio') {
      return function () { irCarta(); };
    }

    return null;
  }

  function esBotonCarga(b) {
    if (!b || b.tagName !== 'BUTTON') return false;
    if (b.getAttribute('data-carga') === 'no') return false;
    if (b.hasAttribute('data-copy')) return false;
    if (b.id === 'barSon') return false;
    if (b.disabled) return false;
    return !!accionDesdeBoton(b);
  }

  function mensajeDe(b) {
    var ir = b.getAttribute('data-ir');

    if (ir === 'portada') {
      return pick([
        'Encendiendo la portada…',
        'Poniendo el nombre en neón…',
        'Volviendo a la puerta de la casa…'
      ]);
    }

    if (ir === 'diario') {
      return pick([
        'Abriendo el diario entero…',
        'Pasando servilletas…',
        'Compilando la vida de Joan…'
      ]);
    }

    if (ir === 'bar') {
      return pick([
        'Empujando la puerta del bar…',
        'Encendiendo el ABIERTO…',
        'El camarero se acerca…'
      ]);
    }

    if (ir === 'contacto') {
      return pick([
        'Llamando al camarero…',
        'Pidiendo la cuenta…',
        'Buscando papel y boli…'
      ]);
    }

    if (ir === 'carta') {
      return pick([
        'Volvendo a la pizarra…',
        'Repasando la carta…'
      ]);
    }

    if (b.classList.contains('plato')) {
      var nameEl = $('.plato__name', b);
      var name = nameEl ? nameEl.textContent.trim() : 'un plato';
      return pick([
        'Sirviendo ' + name + '…',
        'Buscando la servilleta de ' + name + '…',
        'El camarero trae ' + name + '…',
        'Afinando el sable antes de ' + name + '…'
      ]);
    }

    if (b.hasAttribute('data-siguiente')) {
      var txt = b.textContent.trim();
      var siguiente = txt
        .replace(/^Siguiente\s*·\s*/, '')
        .replace(/\s*→\s*$/, '')
        .trim() || 'el siguiente plato';
      return pick([
        'Pasando a ' + siguiente + '…',
        'Sirviendo el siguiente…',
        'El camarero apunta la comanda…'
      ]);
    }

    if (b.id === 'barPrev') {
      return pick([
        'Volviendo al plato anterior…',
        'Recogiendo la taza…'
      ]);
    }

    if (b.id === 'barContactoBack' || b.id === 'barInicio') {
      return pick([
        'Volvendo a la carta…',
        'Dejando la cuenta sobre la barra…'
      ]);
    }

    return pick([
      'Cargando Casa Joan…',
      'Encendiendo la madera…',
      'Puliendo la florete…',
      'Guardando el C1 en la pared…',
      'Mirando el tiempo por la ventana…',
      'Un prototipo con IA…'
    ]);
  }

  function mostrarCarga(msg, fn) {
    if (cargaOcupada) return;

    cargaOcupada = true;

    msgEl.textContent = msg;
    cargaEl.hidden = false;
    cargaEl.setAttribute('aria-hidden', 'false');

    /* Fuerza reflow para que la transición funcione */
    void cargaEl.offsetWidth;

    cargaEl.classList.add('is-visible');
    pistaEl.style.transform = 'scaleX(0)';

    var dur = REDUCED ? 220 : (520 + Math.random() * 380);
    var t0 = performance.now();

    function frame(now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3); /* easeOutCubic */

      pistaEl.style.transform = 'scaleX(' + e + ')';

      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        cargaEl.classList.remove('is-visible');
        cargaEl.classList.add('is-salida');

        setTimeout(function () {
          cargaEl.hidden = true;
          cargaEl.setAttribute('aria-hidden', 'true');
          cargaEl.classList.remove('is-salida');
          cargaOcupada = false;
          fn();
        }, REDUCED ? 0 : 230);
      }
    }

    requestAnimationFrame(frame);
  }

  document.addEventListener('click', function (e) {
    if (cargaOcupada) {
      var bloqueado = e.target.closest && e.target.closest('button');
      if (bloqueado) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }

    var b = e.target.closest && e.target.closest('button');
    if (!b || !esBotonCarga(b)) return;

    var accion = accionDesdeBoton(b);
    if (!accion) return;

    e.preventDefault();
    e.stopPropagation();

    mostrarCarga(mensajeDe(b), accion);
  }, true);
});

/* ══════════════════════════════════════════════════════════════════════
   8. TECLADO y arranque
   ══════════════════════════════════════════════════════════════════════ */
modulo('teclado', function () {
  document.addEventListener('keydown', function (e) {
    if (cargaOcupada) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var pantalla = document.body.dataset.pantalla;
    if (e.key === 'Escape') { setPantalla('portada'); return; }
    if (pantalla !== 'bar') return;

    /* Ahora funciona con cualquier número de platos, no solo 1-8 */
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= PLATOS.length) {
      servirPlato(n - 1);
      return;
    }

    var t = document.activeElement && document.activeElement.tagName;
    if (/^(BUTTON|A|INPUT|TEXTAREA)$/.test(t)) return;   /* no pisar al foco del teclado */
    var k = e.key.toLowerCase();
    if (k === 'c') irCarta();                             /* c = carta (= ← atrás) */
    if (k === 's') servirPlato((actual + 1) % PLATOS.length);
    if (k === 'm') DESTINOS.contacto.acc();
  });
});

/* Arranque: portada. Si vienes con #contacto o un #apartado, respeta el enlace. */
modulo('arranque', function () {
  var hash = location.hash.replace('#', '');
  if (hash === 'contacto') { DESTINOS.contacto.acc(); return; }
  var directo = PLATOS.filter(function (p) { return p.id === hash; })[0];
  if (directo) {
    setPantalla('diario');
    var t = document.getElementById(directo.id);
    if (t) setTimeout(function () { t.scrollIntoView({ behavior: 'smooth' }); }, 120);
  }
});

/* Carga del clima OpenWeather */
modulo('clima', function () {
  cargarClima();

  if (CLIMA.cadaMinutos > 0) {
    setInterval(cargarClima, CLIMA.cadaMinutos * 60000);
  }
});

console.log('%c[web] v6 cargada · ' + PLATOS.length + ' apartados', 'color:#ffb066;font-weight:700');

})();