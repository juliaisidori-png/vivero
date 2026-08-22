// ORGANISMO CUIR 001 — TEXTURA / SAPITOS
// Capa ambiental diurna: conserva el carácter de la grabación,
// sin reverb, con respiración lenta de presencia y deriva estéreo suave.

let texturaSapitos = null;
let contextoSapitos = null;
let fuenteSapitos = null;
let gananciaSapitos = null;
let paneoSapitos = null;
let motorSapitos = null;
let inicioSapitos = 0;

function prepararTexturaSapitos() {
  texturaSapitos = new Audio('voces/sapitos.wav');
  texturaSapitos.preload = 'auto';
  texturaSapitos.loop = true;
  texturaSapitos.volume = 1;

  const boton = document.getElementById('startButton');
  if (boton) boton.addEventListener('click', iniciarTexturaSapitos);
}

async function iniciarTexturaSapitos() {
  if (!texturaSapitos || motorSapitos) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  contextoSapitos = new AudioContextClass();
  if (contextoSapitos.state === 'suspended') await contextoSapitos.resume();

  fuenteSapitos = contextoSapitos.createMediaElementSource(texturaSapitos);
  gananciaSapitos = contextoSapitos.createGain();
  paneoSapitos = contextoSapitos.createStereoPanner();

  fuenteSapitos.connect(gananciaSapitos);
  gananciaSapitos.connect(paneoSapitos);
  paneoSapitos.connect(contextoSapitos.destination);

  gananciaSapitos.gain.value = 0;
  paneoSapitos.pan.value = 0;

  try {
    texturaSapitos.currentTime = 0;
    await texturaSapitos.play();
  } catch (e) {
    console.warn('No se pudo iniciar TEXTURA / SAPITOS:', e);
    return;
  }

  inicioSapitos = performance.now();
  actualizarEstadoTextura(true);
  motorSapitos = setInterval(actualizarTexturaSapitos, 80);
}

function actualizarTexturaSapitos() {
  if (!organismoActivo || !contextoSapitos || !gananciaSapitos || !paneoSapitos) return;

  const t = (performance.now() - inicioSapitos) / 1000;
  const volumen = numeroSapitos('texturaVolume', 0.032);
  const presencia = numeroSapitos('texturaPresence', 0.62);
  const movimiento = numeroSapitos('texturaMovement', 0.35);

  // Respiración muy lenta e irregular: no pulsa, más bien cambia el aire.
  const lenta = (Math.sin(t * 0.105) + 1) / 2;
  const segunda = (Math.sin(t * 0.061 + 2.7) + 1) / 2;
  const respiracion = 0.58 + 0.42 * (lenta * 0.65 + segunda * 0.35);
  const factor = presencia + (1 - presencia) * respiracion;
  const objetivoVolumen = volumen * factor;

  gananciaSapitos.gain.setTargetAtTime(objetivoVolumen, contextoSapitos.currentTime, 1.8);

  // Movimiento espacial lento y abierto, sin efecto dramático.
  const pan = Math.sin(t * 0.047) * (0.12 + movimiento * 0.34)
            + Math.sin(t * 0.019 + 1.4) * 0.08;
  paneoSapitos.pan.setTargetAtTime(Math.max(-0.55, Math.min(0.55, pan)), contextoSapitos.currentTime, 2.5);
}

function numeroSapitos(id, fallback) {
  const elemento = document.getElementById(id);
  if (!elemento) return fallback;
  const n = parseFloat(elemento.value);
  return Number.isFinite(n) ? n : fallback;
}

function actualizarEstadoTextura(activa) {
  const estado = document.getElementById('texturaStatus');
  if (estado) estado.textContent = activa ? '● presente' : '○ esperando';
}

document.addEventListener('DOMContentLoaded', prepararTexturaSapitos);
