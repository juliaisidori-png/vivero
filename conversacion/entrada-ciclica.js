// ORGANISMO CUIR 001 — Entrada cíclica
// Entrada = retiro base entre ciclos
// Duración = tiempo base de presencia
// Irregularidad = acelera, desordena y espacializa cada nueva aparición

const estadosEntradaCiclica = {};
let contextoEspacial = null;

function sortearRasgosDelCiclo(irregularidad, duracionBase) {
  return {
    volumen: 1 + randomEntre(-0.55, 0.55) * irregularidad,

    // Variación de tono/velocidad mucho más amplia en el extremo.
    tono: 1 + randomEntre(-0.35, 0.45) * irregularidad,

    // Con mucha irregularidad predominan ciclos más breves, aunque algunos se estiran.
    duracion: Math.max(
      0.08,
      duracionBase * (1 + randomEntre(-0.78, 0.45) * irregularidad)
    ),

    // Cada aparición ocupa una posición nueva en el campo estéreo.
    pan: randomEntre(-1, 1) * irregularidad
  };
}

function sortearEspera(entrada, irregularidad) {
  if (irregularidad <= 0) return entrada;

  // Hacia 1, la espera media se comprime mucho y además se vuelve impredecible.
  // Entrada sigue siendo la referencia, pero deja de funcionar como mínimo rígido.
  const factorMinimo = mezclar(1, 0.08, irregularidad);
  const factorMaximo = mezclar(1, 0.55, irregularidad);
  return entrada * randomEntre(factorMinimo, factorMaximo);
}

function estadoEntradaCiclica(nombre, entrada, duracion, irregularidad, tiempo) {
  if (!estadosEntradaCiclica[nombre]) {
    estadosEntradaCiclica[nombre] = {
      fase: 'espera',
      inicioFase: tiempo,
      esperaActual: sortearEspera(entrada, irregularidad),
      volumenCiclo: 1,
      tonoCiclo: 1,
      duracionCiclo: Math.max(0.1, duracion),
      panCiclo: 0,
      numeroCiclo: 0
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
    estado.panCiclo = rasgos.pan;
    estado.numeroCiclo += 1;
  } else if (estado.fase === 'presencia' && transcurrido >= estado.duracionCiclo) {
    estado.fase = 'espera';
    estado.inicioFase = tiempo;
    estado.esperaActual = sortearEspera(entrada, irregularidad);
  }

  let envolvente = 0;

  if (estado.fase === 'presencia') {
    const dentro = tiempo - estado.inicioFase;
    const dur = estado.duracionCiclo;
    const fade = Math.min(0.45, dur * 0.15);
    const entradaSuave = fade > 0 ? limitar(dentro / fade, 0, 1) : 1;
    const salidaSuave = fade > 0 ? limitar((dur - dentro) / fade, 0, 1) : 1;
    envolvente = Math.min(entradaSuave, salidaSuave);
  }

  return {
    envolvente,
    volumenCiclo: estado.volumenCiclo,
    tonoCiclo: estado.tonoCiclo,
    duracionCiclo: estado.duracionCiclo,
    panCiclo: estado.panCiclo,
    numeroCiclo: estado.numeroCiclo,
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

function prepararEspacializacion(track) {
  if (track.pannerCiclico || !window.AudioContext && !window.webkitAudioContext) return;

  try {
    if (!contextoEspacial) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      contextoEspacial = new AudioContextClass();
    }

    const fuente = contextoEspacial.createMediaElementSource(track.audio);
    const panner = contextoEspacial.createStereoPanner();
    fuente.connect(panner);
    panner.connect(contextoEspacial.destination);

    track.pannerCiclico = panner;
    track.ultimoNumeroCicloPaneado = -1;
  } catch (error) {
    // Si un navegador no permite crear el nodo, el organismo sigue funcionando en mono.
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
      0.08
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
  const entrada = valor(nombre + 'Entry');
  const duracion = valor(nombre + 'Duration');
  const irregularidad = valor(nombre + 'Irregularity');
  const contacto = valor(nombre + 'Contact');

  const ciclo = estadoEntradaCiclica(nombre, entrada, duracion, irregularidad, tiempo);
  const factorPresencia = presenciaInicial + (1 - presenciaInicial) * ciclo.envolvente;
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
    track.currentRate += (velocidadObjetivo - track.currentRate) * 0.05;
    track.audio.playbackRate = limitar(track.currentRate, 0.55, 1.75);

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
      0.55,
      1.75
    );
    track.currentRate += (rateObjetivo - track.currentRate) * 0.06;
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