// ORGANISMO CUIR 001 — ACARICIA / ONDAS
// Dos corrientes largas nacidas de la misma grabación.
// Sin reverb: la armonía aparece por convivencia, aire y leve diferencia de altura.

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

  // Dos versiones del mismo cuerpo: una casi original y otra apenas elevada.
  ondasAcaricia = [
    crearOndaAcaricia(0, 0.985, -0.34),
    crearOndaAcaricia(1, 1.035, 0.34)
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
  const gain = contextoAcaricia.createGain();
  const panner = contextoAcaricia.createStereoPanner();
  source.connect(gain);
  gain.connect(panner);
  panner.connect(contextoAcaricia.destination);
  gain.gain.value = 0;
  panner.pan.value = pan;

  const comenzar = () => {
    if (Number.isFinite(audio.duration) && audio.duration > 2) {
      const fraccion = indice === 0 ? 0.08 : 0.46;
      audio.currentTime = audio.duration * fraccion;
    }
    audio.play().catch(() => {});
  };
  if (audio.readyState >= 1) comenzar();
  else audio.addEventListener('loadedmetadata', comenzar, { once: true });

  return { audio, gain, panner, panBase: pan };
}

function actualizarAcaricia() {
  if (!contextoAcaricia || !ondasAcaricia.length) return;
  const t = (performance.now() - inicioAcaricia) / 1000;
  const volumen = leerAcaricia('acariciaVolume', 0.027);
  const encuentro = leerAcaricia('acariciaEncounter', 0.58);
  const apertura = leerAcaricia('acariciaSpace', 0.55);

  ondasAcaricia.forEach((onda, i) => {
    // Respiraciones muy largas y desfasadas: a veces se encuentran, a veces queda una sola.
    const fase = i === 0 ? 0.2 : 2.55;
    const ciclo = (Math.sin(t * (i === 0 ? 0.075 : 0.061) + fase) + 1) / 2;
    const forma = Math.pow(ciclo, 1.35);
    const piso = 0.10 + encuentro * 0.34;
    const presencia = piso + (1 - piso) * forma;
    onda.gain.gain.setTargetAtTime(volumen * presencia, contextoAcaricia.currentTime, 2.8);

    // El estéreo se mueve apenas: no "viaja", respira espacialmente.
    const deriva = Math.sin(t * 0.024 + i * 2.1) * 0.10;
    const objetivoPan = onda.panBase * (0.35 + apertura * 0.65) + deriva;
    onda.panner.pan.setTargetAtTime(Math.max(-0.65, Math.min(0.65, objetivoPan)), contextoAcaricia.currentTime, 3.2);
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
