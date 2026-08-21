// ORGANISMO CUIR 001 — EXPANSIÓN VERBORRÁGICA DE VOZSEMILLA
// El carácter que antes aparecía al final se despliega mucho antes.

let contextoExpansion = null;
const satelitesVozsemilla = [];

// La multiplicación comienza pronto: el 40% ya entra en una zona claramente coral.
const UMBRALES_SATELITES = [0.14, 0.22, 0.30, 0.40, 0.55, 0.72];

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
  setInterval(actualizarSatelitesVozsemilla, 60);
}

function cantidadSatelitesDeseada(intensidad) {
  let cantidad = 0;
  for (const umbral of UMBRALES_SATELITES) {
    if (intensidad >= umbral) cantidad++;
  }
  return cantidad;
}

function actualizarSatelitesVozsemilla() {
  if (!organismoActivo || !tracks.vozsemilla || !tracks.vozsemilla.audio) return;

  const intensidad = intensidadExpansion('vozsemilla');
  const deseada = cantidadSatelitesDeseada(intensidad);

  while (satelitesVozsemilla.length < deseada) {
    crearSateliteVozsemilla(satelitesVozsemilla.length, intensidad);
  }
  while (satelitesVozsemilla.length > deseada) retirarUltimoSatelite();

  satelitesVozsemilla.forEach((satelite, indice) => actualizarSatelite(satelite, indice, intensidad));
}

function crearSateliteVozsemilla(indice, intensidad) {
  const ctx = asegurarContextoExpansion();
  const track = tracks.vozsemilla;
  if (!ctx || !track || !track.audio) return;

  const src = track.audio.currentSrc || track.audio.src;
  if (!src) return;

  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.loop = true;
  audio.volume = 1;
  if ('preservesPitch' in audio) audio.preservesPitch = false;
  if ('mozPreservesPitch' in audio) audio.mozPreservesPitch = false;
  if ('webkitPreservesPitch' in audio) audio.webkitPreservesPitch = false;

  const source = ctx.createMediaElementSource(audio);
  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  source.connect(gain);
  gain.connect(panner);
  panner.connect(ctx.destination);

  const posiciones = [-0.78, 0.74, -0.42, 0.46, -0.94, 0.92];
  const tonosBase = [0.982, 1.021, 0.958, 1.043, 0.925, 1.075];

  const satelite = {
    audio, source, gain, panner,
    panBase: posiciones[indice] ?? randomEntre(-1, 1),
    tonoBase: tonosBase[indice] ?? randomEntre(0.93, 1.07)
  };

  gain.gain.value = 0;
  panner.pan.value = satelite.panBase;
  audio.playbackRate = satelite.tonoBase;

  const comenzar = () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0.4) {
      audio.currentTime = Math.random() * Math.max(0.1, audio.duration - 0.2);
    }
    audio.play().catch(() => {});
  };

  if (audio.readyState >= 1) comenzar();
  else audio.addEventListener('loadedmetadata', comenzar, { once: true });

  satelitesVozsemilla.push(satelite);
  actualizarSatelite(satelite, indice, intensidad);
}

function actualizarSatelite(satelite, indice, intensidad) {
  const ctx = asegurarContextoExpansion();
  if (!ctx) return;

  const umbral = UMBRALES_SATELITES[indice] ?? 0.72;
  const desarrollo = limitar((intensidad - umbral) / Math.max(0.08, 1 - umbral), 0, 1);

  // Las voces nacen audibles. El extremo suma densidad, pero no monopoliza la multiplicación.
  const gananciaObjetivo = mezclar(0.058, 0.105, Math.pow(desarrollo, 0.55));
  satelite.gain.gain.setTargetAtTime(gananciaObjetivo, ctx.currentTime, 0.22);

  // Reposo y zona media: diferencias fijas, sin glissando.
  // La inestabilidad tímbrica fuerte se reserva para el tramo alto.
  let amplitudTono = 0.002;
  if (intensidad > 0.62) amplitudTono = mezclar(0.002, 0.09, (intensidad - 0.62) / 0.38);
  const objetivoTono = satelite.tonoBase * (1 + randomEntre(-amplitudTono, amplitudTono));
  satelite.audio.playbackRate = limitar(objetivoTono, 0.70, 1.38);

  const apertura = mezclar(0.72, 1.0, Math.min(1, intensidad / 0.65));
  satelite.panner.pan.setTargetAtTime(limitar(satelite.panBase * apertura, -1, 1), ctx.currentTime, 0.14);
}

function retirarUltimoSatelite() {
  const satelite = satelitesVozsemilla.pop();
  if (!satelite) return;
  const ctx = asegurarContextoExpansion();
  if (ctx) satelite.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.28);
  setTimeout(() => {
    try { satelite.audio.pause(); } catch (e) {}
    try { satelite.source.disconnect(); } catch (e) {}
    try { satelite.gain.disconnect(); } catch (e) {}
    try { satelite.panner.disconnect(); } catch (e) {}
    satelite.audio.src = '';
  }, 900);
}

document.addEventListener('DOMContentLoaded', prepararExpansion);
