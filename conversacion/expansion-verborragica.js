// ORGANISMO CUIR 001 — EXPANSIÓN VERBORRÁGICA DE VOZSEMILLA
// La proliferación comienza antes y crece progresivamente con el contacto.

let contextoExpansion = null;
const estadosExpansion = {};
const fragmentosExpansionActivos = new Set();
const MAX_FRAGMENTOS_EXPANSION = 36;

function asegurarContextoExpansion() {
  if (!contextoExpansion) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    contextoExpansion = new AudioContextClass();
  }
  if (contextoExpansion.state === 'suspended') contextoExpansion.resume().catch(() => {});
  return contextoExpansion;
}

function intensidadExpansion(nombre) {
  if (nombre !== 'vozsemilla') return 0;
  return limitar(valor('vozsemillaExpansion') * valor('vozsemillaContact') * nivelContacto, 0, 1);
}

function prepararExpansion() {
  const start = document.getElementById('startButton');
  if (start) start.addEventListener('click', asegurarContextoExpansion);
  document.addEventListener('mousedown', asegurarContextoExpansion, { once: true });
  document.addEventListener('keydown', asegurarContextoExpansion, { once: true });
  setInterval(actualizarExpansionVerborragica, 45);
}

function actualizarExpansionVerborragica() {
  if (!organismoActivo) return;
  const nombre = 'vozsemilla';
  const track = tracks[nombre];
  if (!track || !track.audio) return;

  const ahora = performance.now();
  const intensidad = intensidadExpansion(nombre);
  if (!estadosExpansion[nombre]) estadosExpansion[nombre] = { proximo: 0 };
  const estado = estadosExpansion[nombre];

  // Empieza a proliferar desde aproximadamente 20% de expansión.
  if (intensidad < 0.18) {
    estado.proximo = ahora + 150;
    return;
  }
  if (ahora < estado.proximo) return;

  // La curva ahora abre antes: ya en la mitad del recorrido debe sentirse
  // claramente que la voz comienza a volverse varias.
  const normalizada = limitar((intensidad - 0.18) / 0.82, 0, 1);
  const curva = Math.pow(normalizada, 0.48);
  const intervaloBase = mezclar(560, 48, curva);
  estado.proximo = ahora + intervaloBase * randomEntre(0.68, 1.12);

  let cantidad = 1;
  if (intensidad >= 0.30) cantidad = 2;
  if (intensidad >= 0.46) cantidad = 3;
  if (intensidad >= 0.62) cantidad = 4;
  if (intensidad >= 0.78) cantidad = 5;
  if (intensidad >= 0.90) cantidad = 6;

  if (cantidad > 3 && Math.random() < 0.22) cantidad -= 1;

  for (let i = 0; i < cantidad; i++) {
    setTimeout(() => lanzarFragmentoExpansion(nombre, track, intensidad), i * randomEntre(18, 65));
  }
}

function lanzarFragmentoExpansion(nombre, track, intensidad) {
  if (fragmentosExpansionActivos.size >= MAX_FRAGMENTOS_EXPANSION) return;
  const ctx = asegurarContextoExpansion();
  if (!ctx) return;

  const src = track.audio.currentSrc || track.audio.src;
  if (!src) return;

  const fragmento = new Audio(src);
  fragmento.preload = 'auto';
  fragmento.loop = false;
  fragmento.volume = 1;
  if ('preservesPitch' in fragmento) fragmento.preservesPitch = false;
  if ('mozPreservesPitch' in fragmento) fragmento.mozPreservesPitch = false;
  if ('webkitPreservesPitch' in fragmento) fragmento.webkitPreservesPitch = false;

  // Tono casi estable al principio; la diversidad tímbrica se abre después.
  let rangoTono = 0.008;
  if (intensidad >= 0.42 && intensidad < 0.72) {
    rangoTono = mezclar(0.008, 0.10, (intensidad - 0.42) / 0.30);
  } else if (intensidad >= 0.72) {
    rangoTono = mezclar(0.10, 0.42, (intensidad - 0.72) / 0.28);
  }

  const desvioTono = randomEntre(1 - rangoTono, 1 + rangoTono);
  const aceleracion = mezclar(0.99, 1.48, Math.pow(intensidad, 1.25));
  fragmento.playbackRate = limitar(aceleracion * desvioTono, 0.62, 2.05);

  const source = ctx.createMediaElementSource(fragmento);
  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  source.connect(gain);
  gain.connect(panner);
  panner.connect(ctx.destination);

  const volumenBase = valor('vozsemillaVolume');
  const gananciaTrack = Number.isFinite(track.gain) ? track.gain : 1;
  const presenciaCoro = mezclar(0.42, 0.82, Math.pow(intensidad, 1.15));
  gain.gain.value = limitar(volumenBase * gananciaTrack * presenciaCoro * randomEntre(0.82, 1.18), 0, 0.65);

  const aperturaStereo = intensidad < 0.28 ? 0 : mezclar(0.12, 1, (intensidad - 0.28) / 0.72);
  panner.pan.value = randomEntre(-1, 1) * aperturaStereo;

  const registro = { fragmento, source, gain, panner };
  fragmentosExpansionActivos.add(registro);

  function comenzar() {
    const duracionAudio = fragmento.duration;
    if (Number.isFinite(duracionAudio) && duracionAudio > 0.45) {
      const margen = Math.min(0.18, duracionAudio * 0.05);
      const maxInicio = Math.max(margen, duracionAudio - 0.42);
      fragmento.currentTime = randomEntre(margen, maxInicio);
    }
    fragmento.play().catch(() => limpiarFragmentoExpansion(registro));

    const duracionFragmento = mezclar(randomEntre(0.85, 1.55), randomEntre(0.38, 0.95), intensidad);
    setTimeout(() => {
      try { fragmento.pause(); } catch (e) {}
      limpiarFragmentoExpansion(registro);
    }, duracionFragmento * 1000);
  }

  if (fragmento.readyState >= 1) comenzar();
  else {
    fragmento.addEventListener('loadedmetadata', comenzar, { once: true });
    fragmento.addEventListener('error', () => limpiarFragmentoExpansion(registro), { once: true });
  }
}

function limpiarFragmentoExpansion(registro) {
  if (!fragmentosExpansionActivos.has(registro)) return;
  fragmentosExpansionActivos.delete(registro);
  try { registro.fragmento.pause(); } catch (e) {}
  try { registro.source.disconnect(); } catch (e) {}
  try { registro.gain.disconnect(); } catch (e) {}
  try { registro.panner.disconnect(); } catch (e) {}
  registro.fragmento.src = '';
}

document.addEventListener('DOMContentLoaded', prepararExpansion);
