// ORGANISMO CUIR 001 — ACARICIA / ONDAS
// Dos corrientes largas nacidas de la misma grabación.
// Más cuerpo, menos filo: la armonía aparece por convivencia, aire y cercanía tímbrica.

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

  // Dos versiones muy cercanas: evitamos que la segunda se vuelva filosa.
  ondasAcaricia = [
    crearOndaAcaricia(0, 0.992, -0.30),
    crearOndaAcaricia(1, 1.018, 0.30)
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

  // Filtro suave para quitar filo sin volverla oscura ni cavernosa.
  filtro.type = 'lowpass';
  filtro.frequency.value = 2300;
  filtro.Q.value = 0.35;

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
    audio.play().catch(() => {});
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
    // Respiraciones largas, pero con más piso: debe sentirse como arrullo,
    // no como apariciones lejanas.
    const fase = i === 0 ? 0.2 : 2.15;
    const ciclo = (Math.sin(t * (i === 0 ? 0.070 : 0.058) + fase) + 1) / 2;
    const forma = Math.pow(ciclo, 1.18);

    const piso = 0.34 + encuentro * 0.30;
    const presencia = piso + (1 - piso) * forma;

    // Ganancia general más alta y densa.
    const gananciaObjetivo = volumen * presencia * 1.45;
    onda.gain.gain.setTargetAtTime(
      Math.min(0.42, gananciaObjetivo),
      contextoAcaricia.currentTime,
      1.9
    );

    // Apertura todavía suave: más envolvente que panorámica.
    const deriva = Math.sin(t * 0.022 + i * 2.0) * 0.065;
    const objetivoPan = onda.panBase * (0.22 + apertura * 0.50) + deriva;
    onda.panner.pan.setTargetAtTime(
      Math.max(-0.48, Math.min(0.48, objetivoPan)),
      contextoAcaricia.currentTime,
      3.0
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
