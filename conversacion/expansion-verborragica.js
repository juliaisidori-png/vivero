// ORGANISMO CUIR 001 — EXPANSIÓN VERBORRÁGICA DE VOZSEMILLA
// La proliferación tiene una ganancia propia: no depende del volumen casi imperceptible
// de la voz estable. Así puede empezar a oírse mucho antes del 90%.

let contextoExpansion = null;
const estadosExpansion = {};
const fragmentosExpansionActivos = new Set();
const MAX_FRAGMENTOS_EXPANSION = 40;

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

  // Desde 18% ya puede nacer una voz secundaria audible.
  if (intensidad < 0.18) {
    estado.proximo = ahora + 120;
    return;
  }
  if (ahora < estado.proximo) return;

  const normalizada = limitar((intensidad - 0.18) / 0.82, 0, 1);
  const curva = Math.pow(normalizada, 0.42);
  const intervaloBase = mezclar(470, 52, curva);
  estado.proximo = ahora + intervaloBase * randomEntre(0.70, 1.08);

  // Cantidad deliberadamente temprana y claramente perceptible.
  let cantidad = 1;
  if (intensidad >= 0.24) cantidad = 2;
  if (intensidad >= 0.38) cantidad = 3;
  if (intensidad >= 0.52) cantidad = 4;
  if (intensidad >= 0.68) cantidad = 5;
  if (intensidad >= 0.82) cantidad = 6;
  if (intensidad >= 0.93) cantidad = 7;

  for (let i = 0; i < cantidad; i++) {
    setTimeout(() => lanzarFragmentoExpansion(nombre, track, intensidad), i * randomEntre(16, 58));
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

  // Tono casi estable al comienzo; diversidad creciente sin glissando.
  let rangoTono = 0.006;
  if (intensidad >= 0.34 && intensidad < 0.68) {
    rangoTono = mezclar(0.006, 0.10, (intensidad - 0.34) / 0.34);
  } else if (intensidad >= 0.68) {
    rangoTono = mezclar(0.10, 0.42, (intensidad - 0.68) / 0.32);
  }

  const desvioTono = randomEntre(1 - rangoTono, 1 + rangoTono);
  const aceleracion = mezclar(0.995, 1.46, Math.pow(intensidad, 1.18));
  fragmento.playbackRate = limitar(aceleracion * desvioTono, 0.62, 2.05);

  const source = ctx.createMediaElementSource(fragmento);
  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  source.connect(gain);
  gain.connect(panner);
  panner.connect(ctx.destination);

  // IMPORTANTE: las copias ya no dependen del slider de volumen de VOZSEMILLA.
  // Tienen una presencia propia que nace baja pero audible y crece con la expansión.
  const presenciaPropia = mezclar(0.032, 0.115, Math.pow(intensidad, 0.9));
  gain.gain.value = limitar(
    presenciaPropia * randomEntre(0.86, 1.14),
    0,
    0.16
  );

  const aperturaStereo = intensidad < 0.22
    ? 0
    : mezclar(0.10, 1, (intensidad - 0.22) / 0.78);
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

    // Más largas en la zona media para que realmente se solapen.
    const duracionFragmento = mezclar(
      randomEntre(1.20, 1.95),
      randomEntre(0.55, 1.05),
      intensidad
    );

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
