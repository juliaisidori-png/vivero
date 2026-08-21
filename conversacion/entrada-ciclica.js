// ORGANISMO CUIR 001 — CICLOS GOBERNADOS POR EXPANSIÓN
// Sin expansión: duración máxima, entrada mínima, irregularidad casi nula,
// tono apenas vivo y centro estéreo.
// Con contacto sostenido: duración se acorta, irregularidad crece,
// el tono cambia por saltos discretos sobre todo cerca de la expansión máxima.

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

  const curva = Math.pow(intensidad, 0.78);

  // El tono queda casi estable durante la mayor parte del recorrido.
  // Recién en expansión alta se abre de forma marcada.
  let tonoMin = 0.997;
  let tonoMax = 1.003;

  if (intensidad >= 0.55 && intensidad < 0.82) {
    const t = (intensidad - 0.55) / 0.27;
    tonoMin = mezclar(0.997, 0.92, t);
    tonoMax = mezclar(1.003, 1.10, t);
  } else if (intensidad >= 0.82) {
    const t = (intensidad - 0.82) / 0.18;
    tonoMin = mezclar(0.92, 0.62, t);
    tonoMax = mezclar(1.10, 1.48, t);
  }

  return {
    entrada: 0,
    duracion: mezclar(durMax, durMin, curva),
    irregularidad: mezclar(0.01, 1.0, curva),
    tonoMin,
    tonoMax,
    variacionVolumen: mezclar(0.01, 0.48, curva),
    pan: intensidad < 0.45 ? 0 : mezclar(0, 1, (intensidad - 0.45) / 0.55)
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
    const umbral = movimiento * 0.62;
    const fragmentacion = textura < umbral ? 0.03 : 0.38 + textura * 0.62;
    factorMovimiento = mezclar(1, fragmentacion, movimiento);
    track.audio.playbackRate = ciclo.tonoCiclo;
  }

  else if (nombre === 'vozsemilla') {
    const derivaLenta = Math.sin(tiempo * 0.37 + track.phase);
    const derivaMedia = Math.sin(tiempo * 0.83 + 2.1);
    const textura = Math.sin(tiempo * 2.31 + Math.sin(tiempo * 0.17) * 2.4);

    // En reposo, apenas una vida microscópica de tono.
    // La expansión no produce glissando: el tono cambia por ciclos discretos.
    const microVida = (
      derivaLenta * 0.0025 +
      derivaMedia * 0.0015 +
      textura * 0.001
    ) * (1 - ciclo.intensidad);

    const baile = (
      derivaMedia * 0.018 +
      textura * 0.010
    ) * movimiento * (1 - ciclo.intensidad * 0.75);

    track.audio.playbackRate = limitar(
      (1 + microVida + baile) * ciclo.tonoCiclo,
      0.58,
      1.52
    );

    factorMovimiento = limitar(
      1 + movimiento * derivaMedia * 0.035,
      0.90,
      1.08
    );
  }

  else if (track.dynamic) {
    const deriva = Math.sin(tiempo * (0.55 + movimiento * 2.8) + track.phase);
    const textura = Math.sin(tiempo * 1.71 + track.phase * 0.7);

    const microVida = (deriva * 0.002 + textura * 0.0015) * (1 - ciclo.intensidad);

    track.audio.playbackRate = limitar(
      (1 + microVida) * ciclo.tonoCiclo,
      0.58,
      1.55
    );

    factorMovimiento = limitar(1 + movimiento * deriva * 0.10, 0.82, 1.10);
  }

  const aporteContacto = nivelContacto * contacto * expansion * 0.08;

  let volumenFinal = latente + (
    volumen * factorPresencia * factorMovimiento * ciclo.volumenCiclo
  ) + aporteContacto;

  volumenFinal *= track.gain;
  track.audio.volume = limitar(volumenFinal, 0, 1);
};