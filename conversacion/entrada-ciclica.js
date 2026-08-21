// ORGANISMO CUIR 001 — Entrada cíclica
// Entrada = retiro mínimo entre ciclos
// Duración = tiempo de presencia de cada ciclo
// Irregularidad = tiempo extra aleatorio añadido a Entrada

const estadosEntradaCiclica = {};

function estadoEntradaCiclica(nombre, entrada, duracion, irregularidad, tiempo) {
  if (!estadosEntradaCiclica[nombre]) {
    estadosEntradaCiclica[nombre] = {
      fase: 'espera',
      inicioFase: tiempo,
      esperaActual: entrada + Math.random() * entrada * irregularidad
    };
  }

  const estado = estadosEntradaCiclica[nombre];
  const transcurrido = tiempo - estado.inicioFase;

  if (estado.fase === 'espera' && transcurrido >= estado.esperaActual) {
    estado.fase = 'presencia';
    estado.inicioFase = tiempo;
  } else if (estado.fase === 'presencia' && transcurrido >= Math.max(0.1, duracion)) {
    estado.fase = 'espera';
    estado.inicioFase = tiempo;
    estado.esperaActual = entrada + Math.random() * entrada * irregularidad;
  }

  if (estado.fase === 'espera') return 0;

  // Entrada y salida suaves para que el ciclo no corte bruscamente.
  const dentro = tiempo - estado.inicioFase;
  const dur = Math.max(0.1, duracion);
  const fade = Math.min(0.8, dur * 0.18);
  const entradaSuave = fade > 0 ? limitar(dentro / fade, 0, 1) : 1;
  const salidaSuave = fade > 0 ? limitar((dur - dentro) / fade, 0, 1) : 1;
  return Math.min(entradaSuave, salidaSuave);
}

const actualizarTrackBase = actualizarTrack;

actualizarTrack = function(nombre, track, tiempo) {
  // LLAMA y RESOPLA ya poseen ciclos propios de aparición y respiración.
  // Conservamos esos comportamientos tal como estaban.
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
  const factorPresencia = presenciaInicial + (1 - presenciaInicial) * ciclo;
  let factorMovimiento = 1;

  if (nombre === 'intenta') {
    const velocidad = 0.75 + movimiento * 7.0;
    const onda = (Math.sin(tiempo * velocidad + track.phase) + 1) / 2;
    const espasmo = Math.pow(onda, 12);
    const comportamiento = 0.58 + espasmo * 0.82;
    factorMovimiento = mezclar(1, comportamiento, movimiento);
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

    const velocidadObjetivo = 1 + desviacion;
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
      mezclar(0.92, 1.30, movimiento) + textura * irregularidad * 0.035,
      0.82,
      1.42
    );
    track.currentRate += (rateObjetivo - track.currentRate) * 0.035;
    track.audio.playbackRate = track.currentRate;
    factorMovimiento = limitar(1 + movimiento * deriva * 0.18, 0.72, 1.18);
  }

  const aporteContacto = nivelContacto * contacto * expansion;
  let volumenFinal = latente + (volumen * factorPresencia * factorMovimiento) + aporteContacto;
  volumenFinal *= track.gain;
  track.audio.volume = limitar(volumenFinal, 0, 1);
};