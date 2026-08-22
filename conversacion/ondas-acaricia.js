// ORGANISMO CUIR 001 — ACARICIA / ONDAS
// Dos corrientes largas nacidas de la misma grabación.
// v4: ACARICIA pasa deliberadamente al primer plano para calibrar su presencia.

let contextoAcaricia = null;
let ondasAcaricia = [];
let motorAcaricia = null;
let inicioAcaricia = 0;

function prepararAcaricia() {
  const boton = document.getElementById('startButton');
  if (boton) boton.addEventListener('click', iniciarAcaricia);
}

async function iniciarAcaricia() {
  if (motorAcaricia) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  contextoAcaricia = new AudioContextClass();
  if (contextoAcaricia.state === 'suspended') await contextoAcaricia.resume();

  ondasAcaricia = [
    crearOndaAcaricia(0, 0.996, -0.22),
    crearOndaAcaricia(1, 1.010, 0.22)
  ];

  inicioAcaricia = performance.now();
  motorAcaricia = setInterval(actualizarAcaricia, 90);
  actualizarEstadoAcaricia(true);
}

function crearOndaAcaricia(indice, velocidad, pan) {
  const audio = new Audio('voces/acaricia.wav');
  audio.preload = 'auto';
  audio.loop = true;
  audio.volume = 1;
  audio.playbackRate = velocidad;

  if ('preservesPitch' in audio) audio.preservesPitch = false;
  if ('webkitPreservesPitch' in audio) audio.webkitPreservesPitch = false;

  const source = contextoAcaricia.createMediaElementSource(audio);
  const filtro = contextoAcaricia.createBiquadFilter();
  const gain = contextoAcaricia.createGain();
  const panner = contextoAcaricia.createStereoPanner();

  // Conservamos cuerpo y quitamos sólo el filo superior.
  filtro.type = 'lowpass';
  filtro.frequency.value = 3400;
  filtro.Q.value = 0.2;

  source.connect(filtro);
  filtro.connect(gain);
  gain.connect(panner);
  panner.connect(contextoAcaricia.destination);

  gain.gain.value = 0;
  panner.pan.value = pan;

  const comenzar = () => {
    if (Number.isFinite(audio.duration) && audio.duration > 2) {
      const fraccion = indice === 0 ? 0.08 : 0.40;
      audio.currentTime = audio.duration * fraccion;
    }
    audio.play().catch((e) => console.warn('ACARICIA no pudo iniciar:', e));
  };

  if (audio.readyState >= 1) comenzar();
  else audio.addEventListener('loadedmetadata', comenzar, { once: true });

  return { audio, filtro, gain, panner, panBase: pan };
}

function actualizarAcaricia() {
  if (!contextoAcaricia || !ondasAcaricia.length) return;

  const t = (performance.now() - inicioAcaricia) / 1000;
  const volumen = leerAcaricia('acariciaVolume', 0.060);
  const encuentro = leerAcaricia('acariciaEncounter', 0.58);
  const apertura = leerAcaricia('acariciaSpace', 0.55);

  ondasAcaricia.forEach((onda, i) => {
    const fase = i === 0 ? 0.2 : 2.15;
    const ciclo = (Math.sin(t * (i === 0 ? 0.070 : 0.058) + fase) + 1) / 2;

    // Mucho menos retirada: primero necesitamos oír claramente el material.
    const piso = 0.78 + encuentro * 0.14;
    const presencia = piso + (1 - piso) * ciclo;

    // La toma original quedó muy baja. Esta versión la trae deliberadamente adelante.
    // Si resulta excesiva, después calibramos hacia atrás desde un punto audible.
    const preamplificacion = i === 0 ? 12.0 : 10.5;
    const gananciaObjetivo = volumen * presencia * preamplificacion;

    onda.gain.gain.setTargetAtTime(
      Math.min(1.8, gananciaObjetivo),
      contextoAcaricia.currentTime,
      0.55
    );

    const deriva = Math.sin(t * 0.022 + i * 2.0) * 0.045;
    const objetivoPan = onda.panBase * (0.16 + apertura * 0.42) + deriva;
    onda.panner.pan.setTargetAtTime(
      Math.max(-0.38, Math.min(0.38, objetivoPan)),
      contextoAcaricia.currentTime,
      2.4
    );
  });
}

function leerAcaricia(id, fallback) {
  const el = document.getElementById(id);
  const n = el ? parseFloat(el.value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function actualizarEstadoAcaricia(activa) {
  const estado = document.getElementById('acariciaStatus');
  if (estado) estado.textContent = activa ? '● presente' : '○ esperando';
}

document.addEventListener('DOMContentLoaded', prepararAcaricia);
