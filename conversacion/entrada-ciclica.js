// ORGANISMO CUIR 001 — Entrada cíclica
// Entrada = retiro mínimo entre ciclos
// Duración = tiempo base de presencia de cada ciclo
// Irregularidad = variación amplia de tiempo, volumen, tono y duración

const estadosEntradaCiclica = {};

function sortearRasgosDelCiclo(irregularidad, duracionBase) {
  return {
    // En 1, cada ciclo puede aparecer aprox. entre 55% y 145% del volumen base.
    volumen: 1 + randomEntre(-0.45, 0.45) * irregularidad,

    // En 1, el tono/velocidad puede desviarse aprox. ±18%.
    tono: 1 + randomEntre(-0.18, 0.18) * irregularidad,

    // En 1, la duración puede ir aprox. de 45% a 180% del valor elegido.
    duracion: Math.max(
      0.1,
      duracionBase * (1 + randomEntre(-0.55, 0.80) * irregularidad)
    )
  };
}

function estadoEntradaCiclica(nombre, entrada, duracion, irregularidad, tiempo) {
  if (!estadosEntradaCiclica[nombre]) {
    estadosEntradaCiclica[nombre] = {
      fase: 'espera',
      inicioFase: tiempo,
      esperaActual: entrada + Math.random() * entrada * irregularidad,
      volumenCiclo: 1,
      tonoCiclo: 1,
      duracionCiclo: Math.max(0.1, duracion)
    };
  }

  const estado = estadosEntradaCiclica[nombre];
  const transcurrido = tiempo - estado.inicioFase;

  if (estado.fase === 'espera' && transcurrido >= estado.esperaActual) {
    const rasgos = sortearRasgosDelCiclo(irregularidad, duracion);

    estado.fase = 'presencia';
    estado.inicioFase = tiempo;
    estado.volumenCiclo = rasgos.volumen;
    estado.tonoCiclo = rasgos.tono;
    estado.duracionCiclo = rasgos.duracion;
  } else if (estado.fase === 'presencia' && transcurrido >= estado.duracionCiclo) {
    estado.fase = 'espera';
    estado.inicioFase = tiempo;
    estado.esperaActual = entrada + Math.random() * entrada * irregularidad;
  }

  let envolvente = 0;

  if (estado.fase === 'presencia') {
    const dentro = tiempo - estado.inicioFase;
    const dur = estado.duracionCiclo;
    const fade = Math.min(0.8, dur * 0.18);
    const entradaSuave = fade > 0 ? limitar(dentro / fade, 0, 1) : 1;
    const salidaSuave = fade > 0 ? limitar((dur - dentro) / fade, 0, 1) : 1;
    envolvente = Math.min(entradaSuave, salidaSuave);
  }

  return {
    envolvente,
    volumenCiclo: estado.volumenCiclo,
    tonoCiclo: estado.tonoCiclo,
    duracionCiclo: estado.duracionCiclo,
    fase: estado.fase
  };
}

function habilitarVariacionDeTono(track) {
  if (track.tonoCiclicoPreparado) return;

  if ('preservesPitch' in track.audio) track.audio.preservesPitch = false;
  if ('mozPreservesPitch' in track.audio) track.audio.mozPreservesPitch = false;
  if ('webkitPreservesPitch' in track.audio) track.audio.webkitPreservesPitch = false;

  track.tonoCiclicoPreparado = true;
}

const actualizarTrackBase = actualizarTrack;

actualizarTrack = function(nombre, track, tiempo) {
  // LLAMA y RESOPLA conservan sus comportamientos propios.
  if (nombre === 'llama' || nombre === 'resopla') {
    actualizarTrackBase(nombre, track, tiempo);
    return;
  }

  const volumen = valor(nombre + 'Volume');
  const movimiento = valor(nombre + 'Movement');
  const presenciaInicial = valor(nombre + 'Presence');
  const expansion = valor(nombre + 'Expansion');
  const latente = valor(nombre + 'Latent');
  const entrada = valor(nombre + 'Entry');
  const duracion = valor(nombre + 'Duration');
  const irregularidad = valor(nombre + 'Irregularity');
  const contacto = valor(nombre + 'Contact');

  const ciclo = estadoEntradaCiclica(nombre, entrada, duracion, irregularidad, tiempo);
  const factorPresencia = presenciaInicial + (1 - presenciaInicial) * ciclo.envolvente;
  let factorMovimiento = 1;

  habilitarVariacionDeTono(track);

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
    const umbral = movimiento * (0.45 + irregularidad * 0.35);
    const fragmentacion = textura < umbral ? 0.03 : 0.38 + textura * 0.62;
    factorMovimiento = mezclar(1, fragmentacion, movimiento);

    track.audio.playbackRate = ciclo.tonoCiclo;
  }

  else if (nombre === 'vozsemilla') {
    const derivaLenta = Math.sin(tiempo * 0.37 + track.phase);
    const derivaMedia = Math.sin(tiempo * 0.83 + 2.1);
    const textura = Math.sin(tiempo * 2.31 + Math.sin(tiempo * 0.17) * 2.4);
    const desviacion = (
      derivaLenta * 0.035 +
      derivaMedia * 0.018 +
      textura * irregularidad * 0.012
    ) * movimiento;

    const velocidadObjetivo = (1 + desviacion) * ciclo.tonoCiclo;
    track.currentRate += (velocidadObjetivo - track.currentRate) * 0.025;
    track.audio.playbackRate = track.currentRate;

    const baile = 1 + movimiento * (
      derivaMedia * 0.055 +
      textura * irregularidad * 0.035
    );
    factorMovimiento = limitar(baile, 0.82, 1.12);
  }

  else if (track.dynamic) {
    const deriva = Math.sin(tiempo * (0.55 + movimiento * 2.8) + track.phase);
    const textura = Math.sin(tiempo * 1.71 + track.phase * 0.7);
    const rateObjetivo = limitar(
      (mezclar(0.92, 1.30, movimiento) + textura * irregularidad * 0.035) * ciclo.tonoCiclo,
      0.70,
      1.60
    );
    track.currentRate += (rateObjetivo - track.currentRate) * 0.035;
    track.audio.playbackRate = track.currentRate;
    factorMovimiento = limitar(1 + movimiento * deriva * 0.18, 0.72, 1.18);
  }

  const aporteContacto = nivelContacto * contacto * expansion;

  let volumenFinal = latente + (
    volumen * factorPresencia * factorMovimiento * ciclo.volumenCiclo
  ) + aporteContacto;

  volumenFinal *= track.gain;
  track.audio.volume = limitar(volumenFinal, 0, 1);
};