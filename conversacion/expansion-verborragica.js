// ORGANISMO CUIR 001 — EXPANSIÓN VERBORRÁGICA
// Expansión + Contacto sostenido = proliferación de fragmentos,
// solapamiento, aceleración y apertura estéreo.

let contextoExpansion = null;
const estadosExpansion = {};
const fragmentosExpansionActivos = new Set();
const MAX_FRAGMENTOS_EXPANSION = 18;

function asegurarContextoExpansion() {
  if (!contextoExpansion) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    contextoExpansion = new AudioContextClass();
  }

  if (contextoExpansion.state === 'suspended') {
    contextoExpansion.resume().catch(() => {});
  }

  return contextoExpansion;
}

function intensidadExpansion(nombre) {
  const expansion = valor(nombre + 'Expansion');
  const contacto = valor(nombre + 'Contact');

  return limitar(
    expansion * contacto * nivelContacto,
    0,
    1
  );
}

function prepararExpansion() {
  const start = document.getElementById('startButton');

  if (start) {
    start.addEventListener('click', asegurarContextoExpansion);
  }

  document.addEventListener('mousedown', asegurarContextoExpansion, { once: true });
  document.addEventListener('keydown', asegurarContextoExpansion, { once: true });

  setInterval(actualizarExpansionVerborragica, 70);
}

function actualizarExpansionVerborragica() {
  if (!organismoActivo) return;

  const ahora = performance.now();

  for (const nombre in tracks) {
    const track = tracks[nombre];
    if (!track || !track.audio) continue;

    const intensidad = intensidadExpansion(nombre);

    if (!estadosExpansion[nombre]) {
      estadosExpansion[nombre] = { proximo: 0 };
    }

    const estado = estadosExpansion[nombre];

    if (intensidad < 0.045) {
      estado.proximo = ahora + 500;
      continue;
    }

    if (ahora < estado.proximo) continue;

    // Cuanto más se expande, menos respira entre fragmentos.
    const intervaloBase = mezclar(1450, 115, intensidad);
    estado.proximo = ahora + intervaloBase * randomEntre(0.60, 1.28);

    let cantidad = 1;
    if (intensidad > 0.55 && Math.random() < intensidad) cantidad += 1;
    if (intensidad > 0.82 && Math.random() < intensidad * 0.72) cantidad += 1;

    for (let i = 0; i < cantidad; i++) {
      setTimeout(
        () => lanzarFragmentoExpansion(nombre, track, intensidad),
        i * randomEntre(35, 105)
      );
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

  const baseRate = Number.isFinite(track.audio.playbackRate)
    ? track.audio.playbackRate
    : 1;

  // Con mucha expansión la dicción se acelera y se vuelve más nerviosa.
  const aceleracion = mezclar(1.0, 1.65, intensidad);
  const desvio = randomEntre(0.82, 1.22);

  fragmento.playbackRate = limitar(
    baseRate * aceleracion * desvio,
    0.55,
    2.45
  );

  const source = ctx.createMediaElementSource(fragmento);
  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner();

  source.connect(gain);
  gain.connect(panner);
  panner.connect(ctx.destination);

  const volumenBase = valor(nombre + 'Volume');
  const gananciaTrack = Number.isFinite(track.gain) ? track.gain : 1;

  gain.gain.value = limitar(
    volumenBase * gananciaTrack * mezclar(0.22, 0.62, intensidad) * randomEntre(0.72, 1.12),
    0,
    0.55
  );

  // La expansión también ocupa el espacio: cada fragmento aparece desde otro lugar.
  panner.pan.value = randomEntre(-1, 1) * intensidad;

  const registro = { fragmento, source, gain, panner };
  fragmentosExpansionActivos.add(registro);

  function comenzar() {
    const duracionAudio = fragmento.duration;

    if (Number.isFinite(duracionAudio) && duracionAudio > 0.3) {
      const margen = Math.min(0.25, duracionAudio * 0.08);
      const maxInicio = Math.max(margen, duracionAudio - 0.35);
      fragmento.currentTime = randomEntre(margen, maxInicio);
    }

    fragmento.play().catch(() => limpiarFragmentoExpansion(registro));

    // En máxima expansión: frases pequeñas, apretadas y superpuestas.
    const duracionFragmento = mezclar(
      randomEntre(0.85, 1.65),
      randomEntre(0.20, 0.62),
      intensidad
    );

    setTimeout(() => {
      try { fragmento.pause(); } catch (e) {}
      limpiarFragmentoExpansion(registro);
    }, duracionFragmento * 1000);
  }

  if (fragmento.readyState >= 1) {
    comenzar();
  } else {
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
