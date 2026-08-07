let sounds = [];
const soundFiles = ['llama.wav', 'intenta.wav', 'resopla.wav', 'cruje.wav', 'vozsemilla.wav'];
const baseVolumes = [0.048, 0.032, 0.014, 0.120, 0.022];
const breathAmp    = [0.020, 0.036, 0.014, 0.088, 0.010];
const periods      = [28.6, 22.8, 18.4, 20.5, 31.2];
const phases       = [0.0, 2.8, 1.3, -0.6, 1.1];
const intentaPulse = { strength: 0.024, period: 43.7, phase: 1.8 };
const llamaInitialDelay = 50.0;
const llamaGateMin = 45.0;
const llamaGateMax = 65.0;
const llamaGateDuration = 6.4;
let nextLlamaGate = llamaInitialDelay;
let llamaActiveUntil = 0;
let llamaDistancePhase = 0;
let llamaPulsePhase = 0;
let llamaReturnTime = 120.0;
let llamaReturnTriggered = false;
let started = false;
let loadedCount = 0;

let semillaLayers = [];
let touchActive = false;
let touchStartTime = -1;
let expansionLevel = 0;

// reemplazar isPressed en updateTouchState() por sensor físico cuando esté disponible
const TOUCH = {
  minHold:       2.8,
  expansionRate: 0.038,
  decayRate:     0.016,
  layerRates:    [0.50,  0.72,  0.91],
  layerMaxVols:  [0.018, 0.015, 0.020],
  layerThresh:   [0.15,  0.40,  0.70],
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Roboto');
  textAlign(CENTER, CENTER);
  noStroke();
  fill(255);
}

function draw() {
  background(0);
  const scale = min(width, height);
  textSize(scale * 0.09);
  text('Conversación', width / 2, height / 2 - scale * 0.08);
  textSize(scale * 0.032);
  text('Organismo 01', width / 2, height / 2 + scale * 0.03);
  textSize(scale * 0.018);
  text('(hacé clic para escuchar)', width / 2, height / 2 + scale * 0.12);

  if (started) {
    const t = millis() * 0.001;
    updateTouchState();
    
    if (t > nextLlamaGate) {
      nextLlamaGate = t + random(llamaGateMin, llamaGateMax);
      llamaActiveUntil = t + llamaGateDuration;
      llamaDistancePhase = random(TWO_PI);
      llamaPulsePhase = random(TWO_PI);
    }
    const llamaActive = t < llamaActiveUntil;
    const llamaEnvelope = llamaActive ? sin(PI * ((t - (llamaActiveUntil - llamaGateDuration)) / llamaGateDuration)) : 0;
    const llamaRhythm = llamaActive ? (0.45 + 0.35 * sin(TWO_PI * (t / 3.6) + llamaPulsePhase)) : 0;
    const llamaPresence = max(llamaEnvelope, 0) * max(llamaRhythm, 0.14);

    let llamaReturnPresence = 0;
    if (!llamaReturnTriggered && t >= llamaReturnTime) {
      llamaReturnTriggered = true;
      llamaDistancePhase = random(TWO_PI);
      llamaPulsePhase = random(TWO_PI);
    }
    if (llamaReturnTriggered && t < llamaReturnTime + 6.0) {
      const returnProgress = (t - llamaReturnTime) / 6.0;
      const returnEnvelope = sin(PI * constrain(returnProgress, 0, 1));
      const returnRhythm = 0.6 + 0.24 * sin(TWO_PI * ((t - llamaReturnTime) / 2.8) + llamaPulsePhase);
      llamaReturnPresence = returnEnvelope * max(returnRhythm, 0.22);
    }
    let totalStrength = 0;
    for (let i = 0; i < sounds.length; i++) {
      const snd = sounds[i];
      if (snd && snd.isLoaded()) {
        let target = baseVolumes[i] + breathAmp[i] * sin(TWO_PI * (t / periods[i]) + phases[i]);
        if (i === 4) {
          // vozsemilla base: casi inaudible; crece levemente con expansión
          snd.setVolume(0.003 + expansionLevel * 0.010, 2.0);
          continue;
        }
        if (i === 0) {
          // llama solo suena durante el gate; forzar 0 cuando no está activa
          if (llamaPresence + llamaReturnPresence <= 0) {
            snd.setVolume(0);
            continue;
          }
          const distanceFactor = 0.54 + 0.34 * sin(llamaDistancePhase + t * 0.08);
          const arrivalBoost = constrain(1.0 + 0.22 * (1.0 - min((t - 34.0) / 6.0, 1.0)), 1.0, 1.22);
          const proximityBoost = constrain(1.0 + 0.16 * (llamaPresence + llamaReturnPresence), 1.0, 1.18);
          target *= (llamaPresence + llamaReturnPresence) * distanceFactor * arrivalBoost * proximityBoost;
        }
        if (i === 2) {
          const resoplaRamp = constrain((t - 7.0) / 22.0, 0, 1);
          const resoplaPresence = 0.42 + 0.28 * sin(TWO_PI * (t / 11.2) + 0.9);
          target *= resoplaRamp * resoplaPresence;
        }
        if (i === 1) {
          const pulse = intentaPulse.strength * sin(TWO_PI * (t / intentaPulse.period) + intentaPulse.phase);
          target += max(pulse, 0);
        }
        if (i === 3) {
          const crujeBoost = constrain(1.0 + 1.05 * (1.0 - min(t / 1.5, 1.0)), 1.0, 2.05);
          const earlyPresence = constrain(1.0 + 0.75 * (1.0 - min(t / 1.2, 1.0)), 1.0, 1.75);
          const lateCue = constrain(1.0 + 0.18 * max(0, 1.0 - abs(t - 40.0) / 16.0), 1.0, 1.18);
          target *= crujeBoost * earlyPresence * lateCue;
        }
        totalStrength += max(target, 0);
        snd.setVolume(max(target, 0), 0.5);
      }
    }
    updateSemillaLayers();
  }
}

function startAudio() {
  if (started) return;

  userStartAudio();
  soundFormats('wav');

  for (let i = 0; i < soundFiles.length; i++) {
    const idx = i;
    const path = './voces/' + soundFiles[idx];
    sounds[idx] = loadSound(path,
      () => {
        loadedCount += 1;
        // llama empieza en silencio; el gate controla su volumen
        sounds[idx].setVolume(idx === 0 ? 0 : baseVolumes[idx]);
        sounds[idx].loop();
      },
      (err) => { console.warn('No se pudo cargar:', path, err); }
    );
  }

  for (let j = 0; j < 3; j++) {
    const layerIdx = j;
    const sndLayer = loadSound('./voces/vozsemilla.wav',
      () => {
        sndLayer.rate(TOUCH.layerRates[layerIdx]);
        sndLayer.setVolume(0);
        sndLayer.loop();
        semillaLayers[layerIdx] = sndLayer;
      },
      err => console.warn('semillaLayer', layerIdx, err)
    );
  }

  started = true;
}

function mousePressed() {
  startAudio();
  return false;
}

function touchStarted() {
  startAudio();
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function stopAudio() {
  started = false;
}

function updateTouchState() {
  const dt = deltaTime / 1000.0;
  if (touchActive) {
    const holdTime = (touchStartTime >= 0) ? millis() * 0.001 - touchStartTime : 0;
    if (holdTime > TOUCH.minHold) {
      expansionLevel = constrain(expansionLevel + TOUCH.expansionRate * dt, 0, 1);
    }
  } else {
    expansionLevel = constrain(expansionLevel - TOUCH.decayRate * dt, 0, 1);
  }
}

function updateSemillaLayers() {
  for (let i = 0; i < 3; i++) {
    const layer = semillaLayers[i];
    if (!layer || !layer.isLoaded()) continue;
    const layerExp = constrain((expansionLevel - TOUCH.layerThresh[i]) / (1 - TOUCH.layerThresh[i]), 0, 1);
    layer.setVolume(TOUCH.layerMaxVols[i] * layerExp, 3.0);
  }
}

function keyPressed() {
  if (!started) return;
  if (key === 'T' || key === 't') {
    if (!touchActive) {
      touchActive = true;
      touchStartTime = millis() * 0.001;
    }
  }
}

function keyReleased() {
  if (key === 'T' || key === 't') touchActive = false;
}
