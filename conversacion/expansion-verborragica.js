// ORGANISMO CUIR 001 — EXPANSIÓN VERBORRÁGICA DE VOZSEMILLA
// La expansión no es sólo más volumen: es proliferación de voces.
// Usa el nivel de contacto progresivo del organismo para crecer y retirarse.

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

  if (contextoExpansion.state === 'suspended') {
    contextoExpansion.resume().catch(() => {});
  }

  return contextoExpansion;
}

function intensidadExpansion(nombre) {
  // Por ahora sólo VOZSEMILLA responde al contacto.
  if (nombre !== 'vozsemilla') return 0;

  const expansion = valor('vozsemillaExpansion');
  const contacto = valor('vozsemillaContact');

  return limitar(expansion * contacto * nivelContacto, 0, 1);
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

  if (!estadosExpansion[nombre]) {
    estadosExpansion[nombre] = { proximo: 0 };
  }

  const estado = estadosExpansion[nombre];

  // Por debajo de este umbral la voz permanece prácticamente sola.
  if (intensidad < 0.16) {
    estado.proximo = ahora + 180;
    return;
  }

  if (ahora < estado.proximo) return;

  // Cerca del máximo las nuevas voces aparecen muy próximas unas de otras.
  const curva = Math.pow((intensidad - 0.16) / 0.84, 0.78);
  const intervaloBase = mezclar(720, 55, curva);
  estado.proximo = ahora + intervaloBase * randomEntre(0.72, 1.18);

  // La cantidad deja de ser puramente probabilística para que la proliferación
  // sea claramente audible en la escucha.
  let cantidad = 1;
  if (intensidad >= 0.38) cantidad = 2;
  if (intensidad >= 0.62) cantidad = 3;
  if (intensidad >= 0.80) cantidad = 4;
  if (intensidad >= 0.93) cantidad = 5;

  // Pequeña respiración del número de voces, sin perder el crecimiento general.
  if (cantidad > 2 && Math.random() < 0.28) cantidad -= 1;

  for (let i = 0; i < cantidad; i++) {
    setTimeout(
      () => lanzarFragmentoExpansion(nombre, track, intensidad),
      i * randomEntre(24, 82)
    );
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

  // No hay glissando: cada fragmento nace con un tono fijo distinto.
  // La apertura fuerte ocurre recién en expansión alta.
  let rangoTono = 0.012;
  if (intensidad >= 0.55 && intensidad < 0.82) {
    rangoTono = mezclar(0.012, 0.12, (intensidad - 0.55) / 0.27);
  } else if (intensidad >= 0.82) {
    rangoTono = mezclar(0.12, 0.42, (intensidad - 0.82) / 0.18);
  }

  const desvioTono = randomEntre(1 - rangoTono, 1 + rangoTono);
  const aceleracion = mezclar(0.98, 1.48, Math.pow(intensidad, 1.4));

  fragmento.playbackRate = limitar(
    aceleracion * desvioTono,
    0.62,
    2.05
  );

  const source = ctx.createMediaElementSource(fragmento);
  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner();

  source.connect(gain);
  gain.connect(panner);
  panner.connect(ctx.destination);

  const volumenBase = valor('vozsemillaVolume');
  const gananciaTrack = Number.isFinite(track.gain) ? track.gain : 1;

  // Las voces secundarias ganan presencia especialmente en el último tramo.
  const presenciaCoro = mezclar(0.34, 0.82, Math.pow(intensidad, 1.5));

  gain.gain.value = limitar(
    volumenBase * gananciaTrack * presenciaCoro * randomEntre(0.82, 1.18),
    0,
    0.65
  );

  // Cada voz ocupa un lugar diferente; la apertura crece con la expansión.
  const aperturaStereo = intensidad < 0.35
    ? 0
    : mezclar(0.18, 1, (intensidad - 0.35) / 0.65);

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

    // Más duración que antes: permite que las voces se solapen de verdad.
    const duracionFragmento = mezclar(
      randomEntre(0.75, 1.45),
      randomEntre(0.34, 0.92),
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
