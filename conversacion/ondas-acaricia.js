// ORGANISMO CUIR 001 — ACARICIA / ONDAS
// v5: versión tímbrica blanda para evaluar la materia antes de mezclarla.
// Menos filo, más cuerpo, dos ondas casi unísonas y una cola cálida muy corta.

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
    crearOndaAcaricia(0, 0.955, -0.18),
    crearOndaAcaricia(1, 0.962, 0.18)
  ];

  inicioAcaricia = performance.now();
  motorAcaricia = setInterval(actualizarAcaricia, 90);
  actualizarEstadoAcaricia(true);
}

function crearReverbCorta(ctx) {
  const convolver = ctx.createConvolver();
  const duracion = 0.32;
  const largo = Math.floor(ctx.sampleRate * duracion);
  const impulso = ctx.createBuffer(2, largo, ctx.sampleRate);

  for (let canal = 0; canal < 2; canal++) {
    const datos = impulso.getChannelData(canal);
    for (let i = 0; i < largo; i++) {
      const x = i / largo;
      const envolvente = Math.pow(1 - x, 4.8);
      datos[i] = (Math.random() * 2 - 1) * envolvente * 0.28;
    }
  }
  convolver.buffer = impulso;
  return convolver;
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
  const lowpass = contextoAcaricia.createBiquadFilter();
  const cuerpo = contextoAcaricia.createBiquadFilter();
  const gain = contextoAcaricia.createGain();
  const panner = contextoAcaricia.createStereoPanner();
  const reverb = crearReverbCorta(contextoAcaricia);
  const wet = contextoAcaricia.createGain();

  // Sacamos el borde punzante con decisión.
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 1850;
  lowpass.Q.value = 0.35;

  // Un pequeño sostén en la zona corporal del mmm.
  cuerpo.type = 'peaking';
  cuerpo.frequency.value = 330;
  cuerpo.Q.value = 0.75;
  cuerpo.gain.value = 4.5;

  wet.gain.value = 0.12;

  source.connect(lowpass);
  lowpass.connect(cuerpo);
  cuerpo.connect(gain);
  gain.connect(panner);
  panner.connect(contextoAcaricia.destination);

  // Cola corta en paralelo: redondea, no crea una habitación.
  gain.connect(reverb);
  reverb.connect(wet);
  wet.connect(panner);

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

  return { audio, lowpass, cuerpo, gain, panner, reverb, wet, panBase: pan };
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

    // Presencia sostenida para evaluar el timbre, sin desapariciones largas.
    const piso = 0.80 + encuentro * 0.12;
    const presencia = piso + (1 - piso) * ciclo;

    // Sigue claramente audible, pero ya no intentamos resolver el problema sólo con volumen.
    const preamplificacion = i === 0 ? 9.0 : 8.2;
    const gananciaObjetivo = volumen * presencia * preamplificacion;

    onda.gain.gain.setTargetAtTime(
      Math.min(1.35, gananciaObjetivo),
      contextoAcaricia.currentTime,
      0.75
    );

    const deriva = Math.sin(t * 0.018 + i * 2.0) * 0.035;
    const objetivoPan = onda.panBase * (0.14 + apertura * 0.34) + deriva;
    onda.panner.pan.setTargetAtTime(
      Math.max(-0.30, Math.min(0.30, objetivoPan)),
      contextoAcaricia.currentTime,
      2.8
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
