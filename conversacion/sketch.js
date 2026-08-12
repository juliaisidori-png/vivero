// ============================================================
// ORGANISMO CUIR 001 — LABORATORIO DE ESCUCHA
// versión estable para segundo plano + otras voces persistentes
// ============================================================

const tracks = {
  llama: { file: 'llama.wav', audio: null, phase: 0.0, gain: 1.0, activa: false, proximaAparicion: 0, ultimoMovimiento: -1 },
  intenta: { file: 'intenta.wav', audio: null, phase: 2.8, gain: 2.0 },
  resopla: { file: 'resopla.wav', audio: null, phase: 1.3, gain: 0.5, activa: false, timer: null, proximoResoplidoReal: 0 },
  cruje: { file: 'cruje.wav', audio: null, phase: -0.6, gain: 3.5 },
  vozsemilla: { file: 'vozsemilla.wav', audio: null, phase: 1.1, gain: 3.0, currentRate: 1.0 }
};

let organismoActivo = false;
let tiempoInicio = 0;
let contactoActivo = false;
let tiempoInicioContacto = 0;
let nivelContacto = 0;

const TIEMPO_MINIMO_CONTACTO = 1.5;
const VELOCIDAD_EXPANSION = 0.12;
const VELOCIDAD_RETORNO = 0.04;
const CLAVE_MEMORIA = 'viveroConversacionControles';

let motorSonoro = null;
let ultimoTick = performance.now();
const INTERVALO_MOTOR = 40;

// ============================================================
// OTRAS VOCES — GRABACIÓN + MEMORIA LOCAL
// ============================================================

const DB_NAME = 'organismoCuir001';
const DB_VERSION = 1;
const STORE_VOCES = 'voces';

let mediaRecorder = null;
let recordingStream = null;
let recordingChunks = [];
let grabando = false;
let contadorOtrasVoces = 0;

// ============================================================
// INICIO
// ============================================================

document.addEventListener('DOMContentLoaded', async function () {
  cargarControles();

  document.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.addEventListener('input', guardarControles);
  });

  for (const nombre in tracks) {
    const track = tracks[nombre];
    track.audio = new Audio('voces/' + track.file);
    track.audio.preload = 'auto';
    track.audio.volume = 0;
    track.audio.loop = nombre !== 'llama' && nombre !== 'resopla';

    if (nombre === 'resopla') {
      if ('preservesPitch' in track.audio) track.audio.preservesPitch = true;
      if ('mozPreservesPitch' in track.audio) track.audio.mozPreservesPitch = true;
      if ('webkitPreservesPitch' in track.audio) track.audio.webkitPreservesPitch = true;
    }

    if (nombre === 'vozsemilla') {
      if ('preservesPitch' in track.audio) track.audio.preservesPitch = false;
      if ('mozPreservesPitch' in track.audio) track.audio.mozPreservesPitch = false;
      if ('webkitPreservesPitch' in track.audio) track.audio.webkitPreservesPitch = false;
    }
  }

  tracks.llama.audio.addEventListener('ended', finalizarLlamada);
  tracks.resopla.audio.addEventListener('ended', finalizarResoplido);

  document.getElementById('startButton').addEventListener('click', iniciarOrganismo);

  const botonIntegrar = document.getElementById('integrateVoiceButton');
  if (botonIntegrar) botonIntegrar.addEventListener('click', alternarGrabacion);

  document.addEventListener('mousedown', function (event) {
    if (!organismoActivo) return;
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON') return;
    contactoActivo = true;
    tiempoInicioContacto = performance.now();
  });

  document.addEventListener('mouseup', () => contactoActivo = false);

  document.addEventListener('keydown', function (event) {
    if (event.key.toLowerCase() === 't' && organismoActivo && !contactoActivo) {
      contactoActivo = true;
      tiempoInicioContacto = performance.now();
    }
  });

  document.addEventListener('keyup', event => {
    if (event.key.toLowerCase() === 't') contactoActivo = false;
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && organismoActivo) resincronizarOrganismo();
  });

  window.addEventListener('focus', function () {
    if (organismoActivo) resincronizarOrganismo();
  });

  await cargarVocesGuardadas();
});

// ============================================================
// INICIAR ORGANISMO
// ============================================================

async function iniciarOrganismo() {
  if (organismoActivo) return;

  tiempoInicio = performance.now();
  organismoActivo = true;

  tracks.llama.activa = false;
  tracks.llama.ultimoMovimiento = valor('llamaMovement');
  programarProximaLlamada(0, tracks.llama.ultimoMovimiento);
  actualizarEstadoLlama(false);

  tracks.resopla.activa = false;
  programarResoplidoEn(700);
  actualizarTestigo('resopla', true);

  for (const nombre in tracks) {
    if (nombre === 'llama' || nombre === 'resopla') continue;

    const track = tracks[nombre];

    try {
      track.audio.currentTime = 0;
      await track.audio.play();
      actualizarTestigo(nombre, true);
    } catch (error) {
      actualizarTestigo(nombre, false);
    }
  }

  document.getElementById('startButton').textContent = '● ORGANISMO ACTIVO';

  ultimoTick = performance.now();
  if (motorSonoro) clearInterval(motorSonoro);
  motorSonoro = setInterval(actualizarOrganismo, INTERVALO_MOTOR);
}

// ============================================================
// MOTOR GENERAL
// ============================================================

function actualizarOrganismo() {
  if (!organismoActivo) return;

  const ahora = performance.now();
  const dt = Math.min((ahora - ultimoTick) / 1000, 0.25);
  ultimoTick = ahora;

  const tiempo = (ahora - tiempoInicio) / 1000;

  actualizarContacto(ahora, dt);

  for (const nombre in tracks) {
    actualizarTrack(nombre, tracks[nombre], tiempo);
  }
}

// ============================================================
// ACTUALIZAR PISTA
// ============================================================

function actualizarTrack(nombre, track, tiempo) {
  const volumen = valor(nombre + 'Volume');
  const movimiento = valor(nombre + 'Movement');
  const presenciaInicial = valor(nombre + 'Presence');
  const expansion = valor(nombre + 'Expansion');
  const latente = valor(nombre + 'Latent');
  const entrada = valor(nombre + 'Entry');
  const duracion = valor(nombre + 'Duration');
  const irregularidad = valor(nombre + 'Irregularity');
  const contacto = valor(nombre + 'Contact');

  let factorEntrada = 0;

  if (tiempo >= entrada) {
    factorEntrada = Math.min(1, (tiempo - entrada) / Math.max(0.1, duracion));
  }

  const factorPresencia = presenciaInicial + (1 - presenciaInicial) * factorEntrada;
  let factorMovimiento = 1;

  // LLAMA
  if (nombre === 'llama') {
    if (!track.activa && Math.abs(movimiento - track.ultimoMovimiento) > 0.02) {
      track.ultimoMovimiento = movimiento;
      programarProximaLlamada(tiempo, movimiento);
    }

    if (!track.activa && tiempo >= track.proximaAparicion) iniciarLlamada();

    if (track.activa) {
      const posicion = track.audio.currentTime;
      const duracionAudio = track.audio.duration;
      let entradaSuave = 1;
      let salidaSuave = 1;

      if (Number.isFinite(duracionAudio)) {
        entradaSuave = limitar(posicion / 0.35, 0, 1);
        salidaSuave = limitar((duracionAudio - posicion) / 0.80, 0, 1);
      }

      factorMovimiento = Math.min(entradaSuave, salidaSuave);
    } else {
      factorMovimiento = 0;
    }
  }

  // INTENTA
  else if (nombre === 'intenta') {
    const velocidad = 0.75 + movimiento * 7.0;
    const onda = (Math.sin(tiempo * velocidad + track.phase) + 1) / 2;
    const espasmo = Math.pow(onda, 12);
    const comportamiento = 0.58 + espasmo * 0.82;
    factorMovimiento = mezclar(1, comportamiento, movimiento);
  }

  // RESOPLA
  else if (nombre === 'resopla') {
    if (track.activa) {
      const posicion = track.audio.currentTime;
      const duracionAudio = track.audio.duration;
      let entradaSuave = 1;
      let salidaSuave = 1;

      if (Number.isFinite(duracionAudio)) {
        entradaSuave = limitar(posicion / 0.08, 0, 1);
        salidaSuave = limitar((duracionAudio - posicion) / 0.08, 0, 1);
      }

      factorMovimiento = Math.min(entradaSuave, salidaSuave);
    } else {
      factorMovimiento = 0;
    }
  }

  // CRUJE
  else if (nombre === 'cruje') {
    const velocidad = 1.3 + movimiento * 10;
    const fragmento1 = Math.sin(tiempo * velocidad + track.phase);
    const fragmento2 = Math.sin(tiempo * velocidad * 1.73 + 2.1);
    const fragmento3 = Math.sin(tiempo * velocidad * 0.61 + 4.3);
    const textura = (fragmento1 + fragmento2 + fragmento3 + 3) / 6;
    const umbral = movimiento * (0.45 + irregularidad * 0.35);
    const fragmentacion = textura < umbral ? 0.03 : 0.38 + textura * 0.62;
    factorMovimiento = mezclar(1, fragmentacion, movimiento);
  }

  // VOZSEMILLA
  else if (nombre === 'vozsemilla') {
    const derivaLenta = Math.sin(tiempo * 0.37 + track.phase);
    const derivaMedia = Math.sin(tiempo * 0.83 + 2.1);
    const textura = Math.sin(tiempo * 2.31 + Math.sin(tiempo * 0.17) * 2.4);

    const desviacion = (
      derivaLenta * 0.035 +
      derivaMedia * 0.018 +
      textura * irregularidad * 0.012
    ) * movimiento;

    const velocidadObjetivo = 1 + desviacion;

    track.currentRate += (velocidadObjetivo - track.currentRate) * 0.025;
    track.audio.playbackRate = track.currentRate;

    const baile = 1 + movimiento * (
      derivaMedia * 0.055 +
      textura * irregularidad * 0.035
    );

    factorMovimiento = limitar(baile, 0.82, 1.12);
  }

  // OTRAS VOCES
  else if (track.dynamic) {
    const deriva = Math.sin(tiempo * (0.55 + movimiento * 2.8) + track.phase);
    const textura = Math.sin(tiempo * 1.71 + track.phase * 0.7);

    const rateObjetivo = limitar(
      mezclar(0.92, 1.30, movimiento) + textura * irregularidad * 0.035,
      0.82,
      1.42
    );

    track.currentRate += (rateObjetivo - track.currentRate) * 0.035;
    track.audio.playbackRate = track.currentRate;

    factorMovimiento = limitar(
      1 + movimiento * deriva * 0.18,
      0.72,
      1.18
    );
  }

  const aporteContacto = nivelContacto * contacto * expansion;

  let volumenFinal = latente + (
    volumen * factorPresencia * factorMovimiento
  ) + aporteContacto;

  if (nombre === 'llama' && !track.activa) volumenFinal = 0;
  if (nombre === 'resopla' && !track.activa) volumenFinal = 0;

  volumenFinal *= track.gain;
  track.audio.volume = limitar(volumenFinal, 0, 1);
}

// ============================================================
// RESOPLA
// ============================================================

function iniciarResoplido() {
  const track = tracks.resopla;
  if (!organismoActivo || track.activa) return;

  const movimiento = valor('resoplaMovement');
  const irregularidad = valor('resoplaIrregularity');

  track.activa = true;

  const velocidadBase = mezclar(0.62, 2.40, movimiento);
  const desvio = randomEntre(-0.05, 0.05) * irregularidad;

  track.audio.playbackRate = limitar(velocidadBase + desvio, 0.58, 2.5);
  track.audio.currentTime = 0;

  const volumen = valor('resoplaVolume');
  const latente = valor('resoplaLatent');
  track.audio.volume = limitar((volumen + latente) * track.gain, 0, 1);

  track.audio.play().catch(error => {
    console.warn('No se pudo reproducir RESOPLA:', error);
    track.activa = false;
    programarSiguienteResoplido();
  });
}

function finalizarResoplido() {
  const track = tracks.resopla;
  track.activa = false;
  track.audio.volume = 0;
  programarSiguienteResoplido();
}

function programarSiguienteResoplido() {
  if (!organismoActivo) return;

  const movimiento = valor('resoplaMovement');
  const irregularidad = valor('resoplaIrregularity');

  const pausaBase = mezclarPorTresPuntos(
    movimiento,
    2.8,
    0.35,
    0.015
  );

  const variacion = randomEntre(-0.08, 0.08) * irregularidad;
  const pausa = limitar(pausaBase * (1 + variacion), 0.008, 3.0);

  programarResoplidoEn(pausa * 1000);
}

function programarResoplidoEn(milisegundos) {
  const track = tracks.resopla;

  if (track.timer) clearTimeout(track.timer);

  track.proximoResoplidoReal = performance.now() + milisegundos;

  track.timer = setTimeout(function () {
    track.timer = null;
    iniciarResoplido();
  }, milisegundos);
}

function resincronizarOrganismo() {
  ultimoTick = performance.now();

  const track = tracks.resopla;

  if (!track.activa && organismoActivo) {
    const restante = track.proximoResoplidoReal - performance.now();

    if (restante <= 0) {
      if (track.timer) clearTimeout(track.timer);
      track.timer = null;
      iniciarResoplido();
    } else {
      programarResoplidoEn(restante);
    }
  }
}

// ============================================================
// LLAMA
// ============================================================

function iniciarLlamada() {
  const track = tracks.llama;
  if (track.activa) return;

  track.activa = true;
  track.audio.currentTime = 0;
  track.audio.volume = 0;

  actualizarEstadoLlama(true);

  track.audio.play().catch(() => {
    track.activa = false;
    actualizarEstadoLlama(false);
  });
}

function finalizarLlamada() {
  const track = tracks.llama;

  track.activa = false;
  track.audio.volume = 0;

  actualizarEstadoLlama(false);

  const tiempo = tiempoActual();
  const movimiento = valor('llamaMovement');

  track.ultimoMovimiento = movimiento;
  programarProximaLlamada(tiempo, movimiento);
}

function programarProximaLlamada(tiempo, movimiento) {
  const esperaMinima = mezclar(60, 7, movimiento);
  const esperaMaxima = mezclar(120, 18, movimiento);

  tracks.llama.proximaAparicion = tiempo + randomEntre(esperaMinima, esperaMaxima);
}

function actualizarEstadoLlama(activa) {
  const testigo = document.getElementById('llamaStatus');
  if (!testigo) return;

  testigo.textContent = activa ? '● llamando' : '○ esperando';
  testigo.style.color = activa ? '#fff' : '#555';
}

// ============================================================
// CONTACTO
// ============================================================

function actualizarContacto(ahora, dt) {
  if (contactoActivo) {
    const sostenido = (ahora - tiempoInicioContacto) / 1000;

    if (sostenido >= TIEMPO_MINIMO_CONTACTO) {
      nivelContacto += VELOCIDAD_EXPANSION * dt;
    }
  } else {
    nivelContacto -= VELOCIDAD_RETORNO * dt;
  }

  nivelContacto = limitar(nivelContacto, 0, 1);
  actualizarInterfazContacto();
}

function actualizarInterfazContacto() {
  const estado = document.getElementById('contactStatus');
  const barra = document.getElementById('contactFill');

  if (!estado || !barra) return;

  barra.style.width = (nivelContacto * 100) + '%';
  estado.textContent = contactoActivo
    ? 'contacto — expansión ' + Math.round(nivelContacto * 100) + '%'
    : 'mantené presionado el mouse o la tecla T';
}

// ============================================================
// GRABAR / INTEGRAR OTRA VOZ
// ============================================================

async function alternarGrabacion() {
  if (grabando) {
    detenerGrabacion();
    return;
  }

  await iniciarGrabacion();
}

async function iniciarGrabacion() {
  const boton = document.getElementById('integrateVoiceButton');
  const estado = document.getElementById('recordingStatus');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
    if (estado) estado.textContent = 'este navegador no permite grabar aquí';
    return;
  }

  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    recordingChunks = [];
    mediaRecorder = new MediaRecorder(recordingStream);

    mediaRecorder.addEventListener('dataavailable', event => {
      if (event.data && event.data.size > 0) recordingChunks.push(event.data);
    });

    mediaRecorder.addEventListener('stop', finalizarGrabacion);

    mediaRecorder.start();
    grabando = true;

    if (boton) {
      boton.textContent = 'detener e integrar';
      boton.classList.add('recording');
    }

    if (estado) estado.textContent = '● grabando';
  } catch (error) {
    console.warn('No se pudo abrir el micrófono:', error);
    if (estado) estado.textContent = 'no se pudo acceder al micrófono';
  }
}

function detenerGrabacion() {
  if (!mediaRecorder || !grabando) return;

  grabando = false;

  if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();

  if (recordingStream) {
    recordingStream.getTracks().forEach(track => track.stop());
    recordingStream = null;
  }
}

async function finalizarGrabacion() {
  const boton = document.getElementById('integrateVoiceButton');
  const estado = document.getElementById('recordingStatus');

  const tipo = mediaRecorder && mediaRecorder.mimeType
    ? mediaRecorder.mimeType
    : 'audio/webm';

  const blob = new Blob(recordingChunks, { type: tipo });

  recordingChunks = [];
  mediaRecorder = null;

  if (boton) {
    boton.textContent = 'integrar otra voz';
    boton.classList.remove('recording');
  }

  if (blob.size < 1000) {
    if (estado) estado.textContent = 'la grabación fue demasiado breve';
    return;
  }

  contadorOtrasVoces += 1;

  const registro = {
    id: Date.now(),
    orden: contadorOtrasVoces,
    nombre: 'OTRA VOZ ' + String(contadorOtrasVoces).padStart(2, '0'),
    creado: new Date().toISOString(),
    blob
  };

  try {
    await guardarVozDB(registro);
    await integrarRegistroDeVoz(registro);
    if (estado) estado.textContent = 'voz integrada';
  } catch (error) {
    console.warn('No se pudo guardar la nueva voz:', error);
    if (estado) estado.textContent = 'se grabó, pero no pudo guardarse';
  }
}

// ============================================================
// CONSTRUIR UNA PISTA NUEVA
// ============================================================

async function integrarRegistroDeVoz(registro) {
  const nombre = 'otra' + registro.id;

  if (tracks[nombre]) return;

  const url = URL.createObjectURL(registro.blob);
  const audio = new Audio(url);

  audio.preload = 'auto';
  audio.loop = true;
  audio.volume = 0;

  if ('preservesPitch' in audio) audio.preservesPitch = true;
  if ('mozPreservesPitch' in audio) audio.mozPreservesPitch = true;
  if ('webkitPreservesPitch' in audio) audio.webkitPreservesPitch = true;

  tracks[nombre] = {
    dynamic: true,
    dbId: registro.id,
    objectUrl: url,
    audio,
    gain: 1.0,
    phase: Math.random() * Math.PI * 2,
    currentRate: 1.0
  };

  crearInterfazOtraVoz(nombre, registro);

  if (organismoActivo) {
    try {
      audio.currentTime = 0;
      await audio.play();
      actualizarTestigo(nombre, true);
    } catch (error) {
      actualizarTestigo(nombre, false);
    }
  }
}

function crearInterfazOtraVoz(nombre, registro) {
  const mixer = document.getElementById('mixer');
  if (!mixer) return;

  const section = document.createElement('section');
  section.className = 'track dynamic-track';
  section.dataset.track = nombre;
  section.id = nombre + 'Section';

  section.innerHTML = `
    <h2>
      ${registro.nombre}
      <span class="track-status" id="${nombre}Status">${organismoActivo ? '● sonando' : '○ esperando'}</span>
      <button class="remove-voice" type="button" data-remove-voice="${nombre}">retirar esta voz</button>
    </h2>
    <div class="controls">
      <label>Volumen<input id="${nombre}Volume" type="range" min="0" max="0.5" step="0.001" value="0.055"></label>
      <label>Descanso ↔ Movimiento<input id="${nombre}Movement" type="range" min="0" max="1" step="0.01" value="0"></label>
      <label>Presencia inicial<input id="${nombre}Presence" type="range" min="0" max="1" step="0.01" value="1"></label>
      <label>Expansión<input id="${nombre}Expansion" type="range" min="0" max="1" step="0.01" value="0"></label>
      <label>Volumen latente<input id="${nombre}Latent" type="range" min="0" max="0.3" step="0.001" value="0"></label>
      <label>Entrada<input id="${nombre}Entry" type="range" min="0" max="120" step="0.1" value="0"></label>
      <label>Duración<input id="${nombre}Duration" type="range" min="0.5" max="30" step="0.1" value="6"></label>
      <label>Irregularidad<input id="${nombre}Irregularity" type="range" min="0" max="1" step="0.01" value="0.3"></label>
      <label>Contacto<input id="${nombre}Contact" type="range" min="0" max="1" step="0.01" value="0"></label>
    </div>
  `;

  mixer.appendChild(section);

  aplicarMemoriaASeccion(section);

  section.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.addEventListener('input', guardarControles);
  });

  const botonRetirar = section.querySelector('[data-remove-voice]');
  if (botonRetirar) {
    botonRetirar.addEventListener('click', () => retirarOtraVoz(nombre));
  }
}

async function retirarOtraVoz(nombre) {
  const track = tracks[nombre];
  if (!track || !track.dynamic) return;

  try {
    track.audio.pause();
    track.audio.src = '';
  } catch (error) {
    console.warn(error);
  }

  if (track.objectUrl) URL.revokeObjectURL(track.objectUrl);

  await eliminarVozDB(track.dbId);

  const section = document.getElementById(nombre + 'Section');
  if (section) section.remove();

  delete tracks[nombre];
  guardarControles();
}

// ============================================================
// INDEXEDDB
// ============================================================

function abrirDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_VOCES)) {
        db.createObjectStore(STORE_VOCES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function guardarVozDB(registro) {
  const db = await abrirDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VOCES, 'readwrite');
    tx.objectStore(STORE_VOCES).put(registro);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function listarVocesDB() {
  const db = await abrirDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VOCES, 'readonly');
    const request = tx.objectStore(STORE_VOCES).getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function eliminarVozDB(id) {
  const db = await abrirDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VOCES, 'readwrite');
    tx.objectStore(STORE_VOCES).delete(id);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function cargarVocesGuardadas() {
  try {
    const voces = await listarVocesDB();

    voces.sort((a, b) => (a.orden || 0) - (b.orden || 0));

    for (const registro of voces) {
      contadorOtrasVoces = Math.max(contadorOtrasVoces, registro.orden || 0);
      await integrarRegistroDeVoz(registro);
    }
  } catch (error) {
    console.warn('No se pudieron recuperar las otras voces:', error);
  }
}

// ============================================================
// MEMORIA DE CONTROLES
// ============================================================

function guardarControles() {
  const controles = {};

  document.querySelectorAll('input[type="range"]').forEach(slider => {
    controles[slider.id] = slider.value;
  });

  localStorage.setItem(CLAVE_MEMORIA, JSON.stringify(controles));
}

function cargarControles() {
  const guardado = localStorage.getItem(CLAVE_MEMORIA);
  if (!guardado) return;

  try {
    const controles = JSON.parse(guardado);

    for (const id in controles) {
      const slider = document.getElementById(id);
      if (slider) slider.value = controles[id];
    }
  } catch (error) {
    console.warn('No se pudo recuperar la configuración');
  }
}

function aplicarMemoriaASeccion(section) {
  const guardado = localStorage.getItem(CLAVE_MEMORIA);
  if (!guardado) return;

  try {
    const controles = JSON.parse(guardado);

    section.querySelectorAll('input[type="range"]').forEach(slider => {
      if (Object.prototype.hasOwnProperty.call(controles, slider.id)) {
        slider.value = controles[slider.id];
      }
    });
  } catch (error) {
    console.warn('No se pudo recuperar la memoria de esta voz');
  }
}

// ============================================================
// TESTIGOS Y UTILIDADES
// ============================================================

function actualizarTestigo(nombre, activo) {
  const testigo = document.getElementById(nombre + 'Status');
  if (!testigo) return;

  testigo.textContent = activo ? '● sonando' : '○ sin audio';
  testigo.style.color = activo ? '#fff' : '#555';
}

function valor(id) {
  const control = document.getElementById(id);
  return control ? parseFloat(control.value) : 0;
}

function tiempoActual() {
  return organismoActivo ? (performance.now() - tiempoInicio) / 1000 : 0;
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function mezclar(inicio, final, cantidad) {
  return inicio + (final - inicio) * cantidad;
}

function randomEntre(minimo, maximo) {
  return minimo + Math.random() * (maximo - minimo);
}

function mezclarPorTresPuntos(cantidad, inicio, medio, final) {
  return cantidad <= 0.5
    ? mezclar(inicio, medio, cantidad / 0.5)
    : mezclar(medio, final, (cantidad - 0.5) / 0.5);
}