// ORGANISMO CUIR 001 — CICLOS GOBERNADOS POR EXPANSIÓN
// Sin expansión: duración máxima, entrada mínima, irregularidad casi nula,
// tono apenas vivo y centro estéreo.
// Con contacto sostenido: duración se acorta, irregularidad crece,
// el tono se vuelve más variable y la voz se desplaza en estéreo.

const estadosEntradaCiclica = {};
let contextoEspacial = null;

function maxSlider(id, fallback) {
  const el = document.getElementById(id);
  return el ? parseFloat(el.max) : fallback;
}

function minSlider(id, fallback) {
  const el = document.getElementById(id);
  return el ? parseFloat(el.min) : fallback;
}

function intensidadExpansionCiclica(nombre) {
  const expansion = valor(nombre + 'Expansion');
  const contacto = valor(nombre + 'Contact');
  return limitar(expansion * contacto * nivelContacto, 0, 1);
}

function parametrosPorExpansion(nombre, intensidad) {
  const durMax = maxSlider(nombre + 'Duration', 30);
  const durMin = minSlider(nombre + 'Duration', 0.1);

  // Curva suave al principio y mucho más rápida hacia el extremo.
  const curva = Math.pow(intensidad, 0.72);

  return {
    entrada: 0,
    duracion: mezclar(durMax, durMin, curva),
    irregularidad: mezclar(0.015, 1.0, curva),
    tonoMin: mezclar(0.99, 0.58, curva),
    tonoMax: mezclar(1.01, 1.55, curva),
    variacionVolumen: mezclar(0.015, 0.48, curva),
    pan: mezclar(0, 1, curva)
  };
}

function sortearRasgosExpansion(params) {
  return {
    volumen: 1 + randomEntre(-params.variacionVolumen, params.variacionVolumen),
    tono: randomEntre(params.tonoMin, params.tonoMax),
    pan: randomEntre(-params.pan, params.pan)
  };
}

function estadoEntradaCiclica(nombre, tiempo) {
  const intensidad = intensidadExpansionCiclica(nombre);
  const params = parametrosPorExpansion(nombre, intensidad);

  if (!estadosEntradaCiclica[nombre]) {
    estadosEntradaCiclica[nombre] = {
      inicioCiclo: tiempo,
      duracionCiclo: params.duracion,
      volumenCiclo: 1,
      tonoCiclo: 1,
      panCiclo: 0,
      numeroCiclo: 0
    };
  }

  const estado = estadosEntradaCiclica[nombre];
  const transcurrido = tiempo - estado.inicioCiclo;

  if (transcurrido >= estado.duracionCiclo) {
    const rasgos = sortearRasgosExpansion(params);

    estado.inicioCiclo = tiempo;
    estado.duracionCiclo = Math.max(0.08, params.duracion);
    estado.volumenCiclo = rasgos.volumen;
    estado.tonoCiclo = rasgos.tono;
    estado.panCiclo = rasgos.pan;
    estado.numeroCiclo += 1;
  }

  const dentro = tiempo - estado.inicioCiclo;
  const dur = Math.max(0.08, estado.duracionCiclo);

  // No hay silencio de Entrada: sólo una respiración mínima entre ciclos.
  const fade = Math.min(0.20, dur * 0.10);
  const entradaSuave = fade > 0 ? limitar(dentro / fade, 0, 1) : 1;
  const salidaSuave = fade > 0 ? limitar((dur - dentro) / fade, 0, 1) : 1;
  const envolvente = Math.min(entradaSuave, salidaSuave);

  return {
    intensidad,
    envolvente,
    volumenCiclo: estado.volumenCiclo,
    tonoCiclo: estado.tonoCiclo,
    panCiclo: estado.panCiclo,
    numeroCiclo: estado.numeroCiclo
  };
}

function habilitarVariacionDeTono(track) {
  if (track.tonoCiclicoPreparado) return;

  if ('preservesPitch' in track.audio) track.audio.preservesPitch = false;
  if ('mozPreservesPitch' in track.audio) track.audio.mozPreservesPitch = false;
  if ('webkitPreservesPitch' in track.audio) track.audio.webkitPreservesPitch = false;

  track.tonoCiclicoPreparado = true;
}

function prepararEspacializacion(track) {
  if (track.pannerCiclico) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    if (!contextoEspacial) contextoEspacial = new AudioContextClass();

    const fuente = contextoEspacial.createMediaElementSource(track.audio);
    const panner = contextoEspacial.createStereoPanner();

    fuente.connect(panner);
    panner.connect(contextoEspacial.destination);

    track.pannerCiclico = panner;
    track.ultimoNumeroCicloPaneado = -1;
  } catch (error) {
    track.pannerCiclico = null;
  }
}

function aplicarPanDelCiclo(track, ciclo) {
  prepararEspacializacion(track);
  if (!track.pannerCiclico) return;

  if (contextoEspacial && contextoEspacial.state === 'suspended') {
    contextoEspacial.resume().catch(() => {});
  }

  if (track.ultimoNumeroCicloPaneado !== ciclo.numeroCiclo) {
    track.pannerCiclico.pan.setTargetAtTime(
      ciclo.panCiclo,
      contextoEspacial.currentTime,
      0.05
    );
    track.ultimoNumeroCicloPaneado = ciclo.numeroCiclo;
  }
}

const actualizarTrackBase = actualizarTrack;

actualizarTrack = function(nombre, track, tiempo) {
  // LLAMA y RESOPLA conservan por ahora sus comportamientos propios.
  if (nombre === 'llama' || nombre === 'resopla') {
    actualizarTrackBase(nombre, track, tiempo);
    return;
  }

  const volumen = valor(nombre + 'Volume');
  const movimiento = valor(nombre + 'Movement');
  const presenciaInicial = valor(nombre + 'Presence');
  const expansion = valor(nombre + 'Expansion');
  const latente = valor(nombre + 'Latent');
  const contacto = valor(nombre + 'Contact');

  const ciclo = estadoEntradaCiclica(nombre, tiempo);

  // Sin expansión la voz queda plenamente presente.
  // A medida que expande, el ciclo empieza a respirar y fragmentarse.
  const factorPresencia = mezclar(
    1,
    presenciaInicial + (1 - presenciaInicial) * ciclo.envolvente,
    ciclo.intensidad
  );

  let factorMovimiento = 1;

  habilitarVariacionDeTono(track);
  aplicarPanDelCiclo(track, ciclo);

  if (nombre === 'intenta') {
    const velocidad = 0.75 + movimiento * 7.0;
    const onda = (Math.sin(tiempo * velocidad + track.phase) + 1) / 2;
    const espasmo = Math.pow(onda, 12);
    const comportamiento = 0.58 + espasmo * 0.82;
    factorMovimiento = mezclar(1, comportamiento, movimiento);
    track.audio.playbackRate = ciclo.tonoCiclo;
  }

  else if (nombre === 'cruje') {
    const velocidad = 1.3 + movimiento * 10;
    const fragmento1 = Math.sin(tiempo * velocidad + track.phase);
    const fragmento2 = Math.sin(tiempo * velocidad * 1.73 + 2.1);
    const fragmento3 = Math.sin(tiempo * velocidad * 0.61 + 4.3);
    const textura = (fragmento1 + fragmento2 + fragmento3 + 3) / 6;

    // La fragmentación propia de CRUJE sigue dependiendo de Movimiento,
    // no del antiguo control de Irregularidad.
    const umbral = movimiento * 0.62;
    const fragmentacion = textura < umbral ? 0.03 : 0.38 + textura * 0.62;
    factorMovimiento = mezclar(1, fragmentacion, movimiento);
    track.audio.playbackRate = ciclo.tonoCiclo;
  }

  else if (nombre === 'vozsemilla') {
    const derivaLenta = Math.sin(tiempo * 0.37 + track.phase);
    const derivaMedia = Math.sin(tiempo * 0.83 + 2.1);
    const textura = Math.sin(tiempo * 2.31 + Math.sin(tiempo * 0.17) * 2.4);

    // Su baile propio permanece, pero la expansión decide cuánto cambia de tono.
    const desviacion = (
      derivaLenta * 0.035 +
      derivaMedia * 0.018 +
      textura * 0.012
    ) * movimiento;

    const velocidadObjetivo = (1 + desviacion) * ciclo.tonoCiclo;
    track.currentRate += (velocidadObjetivo - track.currentRate) * 0.07;
    track.audio.playbackRate = limitar(track.currentRate, 0.50, 1.65);

    const baile = 1 + movimiento * (
      derivaMedia * 0.055 +
      textura * 0.035
    );

    factorMovimiento = limitar(baile, 0.82, 1.12);
  }

  else if (track.dynamic) {
    const deriva = Math.sin(tiempo * (0.55 + movimiento * 2.8) + track.phase);
    const textura = Math.sin(tiempo * 1.71 + track.phase * 0.7);

    const rateObjetivo = limitar(
      (mezclar(0.92, 1.30, movimiento) + textura * 0.035) * ciclo.tonoCiclo,
      0.50,
      1.70
    );

    track.currentRate += (rateObjetivo - track.currentRate) * 0.07;
    track.audio.playbackRate = track.currentRate;
    factorMovimiento = limitar(1 + movimiento * deriva * 0.18, 0.72, 1.18);
  }

  // Contacto + Expansión ya no se traduce simplemente en más volumen.
  // El crecimiento ocurre sobre todo por proliferación, ciclos, tono y estéreo.
  const aporteContacto = nivelContacto * contacto * expansion * 0.08;

  let volumenFinal = latente + (
    volumen * factorPresencia * factorMovimiento * ciclo.volumenCiclo
  ) + aporteContacto;

  volumenFinal *= track.gain;
  track.audio.volume = limitar(volumenFinal, 0, 1);
};