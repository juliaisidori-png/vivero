// ORGANISMO CUIR 001 — EXPANSIÓN VERBORRÁGICA
// El contacto se vuelve perceptible casi inmediatamente:
// 2–3 s = expansión media / 5–6 s = expansión máxima.

let contextoExpansion = null;
const estadosExpansion = {};
const fragmentosExpansionActivos = new Set();
const MAX_FRAGMENTOS_EXPANSION = 22;

function asegurarContextoExpansion() {
  if (!contextoExpansion) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    contextoExpansion = new AudioContextClass();
  }
  if (contextoExpansion.state === 'suspended') contextoExpansion.resume().catch(() => {});
  return contextoExpansion;
}

function nivelContactoRapido() {
  if (!contactoActivo) return 0;
  const segundos = Math.max(0, (performance.now() - tiempoInicioContacto) / 1000);
  // Empieza desde el primer instante y alcanza 1 aproximadamente a los 5.5 s.
  return limitar(segundos / 5.5, 0, 1);
}

function intensidadExpansion(nombre) {
  const expansion = valor(nombre + 'Expansion');
  const contacto = valor(nombre + 'Contact');
  return limitar(expansion * contacto * nivelContactoRapido(), 0, 1);
}

function prepararExpansion() {
  const start = document.getElementById('startButton');
  if (start) start.addEventListener('click', asegurarContextoExpansion);
  document.addEventListener('mousedown', asegurarContextoExpansion, { once: true });
  document.addEventListener('keydown', asegurarContextoExpansion, { once: true });
  setInterval(actualizarExpansionVerborragica, 55);
}

function actualizarExpansionVerborragica() {
  if (!organismoActivo) return;
  const ahora = performance.now();

  for (const nombre in tracks) {
    const track = tracks[nombre];
    if (!track || !track.audio) continue;
    const intensidad = intensidadExpansion(nombre);

    if (!estadosExpansion[nombre]) estadosExpansion[nombre] = { proximo: 0 };
    const estado = estadosExpansion[nombre];

    if (intensidad < 0.015) {
      estado.proximo = ahora + 120;
      continue;
    }
    if (ahora < estado.proximo) continue;

    // El intervalo se comprime muy rápido al sostener el contacto.
    const intervaloBase = mezclar(820, 75, Math.pow(intensidad, 0.72));
    estado.proximo = ahora + intervaloBase * randomEntre(0.52, 1.18);

    let cantidad = 1;
    if (intensidad > 0.28 && Math.random() < intensidad) cantidad++;
    if (intensidad > 0.58 && Math.random() < intensidad) cantidad++;
    if (intensidad > 0.82 && Math.random() < intensidad * 0.8) cantidad++;

    for (let i = 0; i < cantidad; i++) {
      setTimeout(() => lanzarFragmentoExpansion(nombre, track, intensidad), i * randomEntre(20, 75));
    }
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

  const baseRate = Number.isFinite(track.audio.playbackRate) ? track.audio.playbackRate : 1;
  const aceleracion = mezclar(1.0, 1.9, intensidad);
  const rangoTono = mezclar(0.025, 0.48, intensidad);
  const desvio = randomEntre(1 - rangoTono, 1 + rangoTono);
  fragmento.playbackRate = limitar(baseRate * aceleracion * desvio, 0.48, 2.8);

  const source = ctx.createMediaElementSource(fragmento);
  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  source.connect(gain);
  gain.connect(panner);
  panner.connect(ctx.destination);

  const volumenBase = valor(nombre + 'Volume');
  const gananciaTrack = Number.isFinite(track.gain) ? track.gain : 1;
  gain.gain.value = limitar(
    volumenBase * gananciaTrack * mezclar(0.18, 0.50, intensidad) * randomEntre(0.68, 1.08),
    0, 0.48
  );

  panner.pan.value = randomEntre(-1, 1) * intensidad;

  const registro = { fragmento, source, gain, panner };
  fragmentosExpansionActivos.add(registro);

  function comenzar() {
    const duracionAudio = fragmento.duration;
    if (Number.isFinite(duracionAudio) && duracionAudio > 0.3) {
      const margen = Math.min(0.2, duracionAudio * 0.06);
      const maxInicio = Math.max(margen, duracionAudio - 0.3);
      fragmento.currentTime = randomEntre(margen, maxInicio);
    }

    fragmento.play().catch(() => limpiarFragmentoExpansion(registro));

    const duracionFragmento = mezclar(
      randomEntre(1.0, 2.0),
      randomEntre(0.12, 0.48),
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
