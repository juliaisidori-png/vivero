let sounds = [];
const soundFiles = ['llama.wav', 'intenta.wav', 'resopla.wav', 'cruje.wav'];
const baseVolumes = [0.046, 0.040, 0.028, 0.128];
const breathAmp = [0.024, 0.048, 0.032, 0.104];
const periods = [28.6, 22.8, 18.4, 20.5];
const phases = [0.0, 2.8, 1.3, -0.6];
const intentaPulse = { strength: 0.018, period: 43.7, phase: 1.8 };
const llamaInitialDelay = 30.0;
const llamaGateMin = 12.0;
const llamaGateMax = 16.0;
const llamaGateDuration = 7.0;
let nextLlamaGate = llamaInitialDelay;
let llamaActiveUntil = 0;
let llamaDistancePhase = 0;
let llamaPulsePhase = 0;
let llamaReturnTime = 56.0;
let llamaReturnTriggered = false;
let started = false;
let loadedCount = 0;

function preload() {
  soundFormats('wav');
  for (let i = 0; i < soundFiles.length; i++) {
    const path = './voces/' + soundFiles[i];
    sounds[i] = loadSound(path,
      () => { loadedCount += 1; },
      (err) => { console.warn('No se pudo cargar:', path, err); }
    );
  }
}

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
  text('Vivero', width / 2, height / 2 - scale * 0.08);
  textSize(scale * 0.032);
  text('Organismo 01', width / 2, height / 2 + scale * 0.03);
  textSize(scale * 0.018);
  text('(hacé clic para escuchar)', width / 2, height / 2 + scale * 0.12);

  if (started) {
    const t = millis() * 0.001;
    if (t > nextLlamaGate) {
      nextLlamaGate = t + random(llamaGateMin, llamaGateMax);
      llamaActiveUntil = t + llamaGateDuration;
      llamaDistancePhase = random(TWO_PI);
      llamaPulsePhase = random(TWO_PI);
    }
    const llamaActive = t < llamaActiveUntil;
    const llamaEnvelope = llamaActive ? sin(PI * ((t - (llamaActiveUntil - llamaGateDuration)) / llamaGateDuration)) : 0;
    const llamaRhythm = llamaActive ? (0.55 + 0.45 * sin(TWO_PI * (t / 3.2) + llamaPulsePhase)) : 0;
    const llamaPresence = max(llamaEnvelope, 0) * max(llamaRhythm, 0.18);

    let llamaReturnPresence = 0;
    if (!llamaReturnTriggered && t >= llamaReturnTime) {
      llamaReturnTriggered = true;
      llamaDistancePhase = random(TWO_PI);
      llamaPulsePhase = random(TWO_PI);
    }
    if (llamaReturnTriggered && t < llamaReturnTime + 7.5) {
      const returnProgress = (t - llamaReturnTime) / 7.5;
      const returnEnvelope = sin(PI * constrain(returnProgress, 0, 1));
      const returnRhythm = 0.7 + 0.3 * sin(TWO_PI * ((t - llamaReturnTime) / 2.6) + llamaPulsePhase);
      llamaReturnPresence = returnEnvelope * max(returnRhythm, 0.25);
    }
    let totalStrength = 0;
    for (let i = 0; i < sounds.length; i++) {
      const snd = sounds[i];
      if (snd && snd.isLoaded()) {
        let target = baseVolumes[i] + breathAmp[i] * sin(TWO_PI * (t / periods[i]) + phases[i]);
        if (i === 0) {
          const distanceFactor = 0.58 + 0.42 * sin(llamaDistancePhase + t * 0.09);
          const lateArrivalBoost = constrain(1.0 + 0.4 * (1.0 - min((t - 2.8) / 4.0, 1.0)), 1.0, 1.4);
          const proximityBoost = constrain(1.0 + 0.28 * (llamaPresence + llamaReturnPresence), 1.0, 1.3);
          target *= (llamaPresence + llamaReturnPresence) * distanceFactor * lateArrivalBoost * proximityBoost;
        }
        if (i === 2) {
          const resoplaRamp = constrain((t - 2.2) / 14.0, 0, 1);
          const resoplaPresence = 0.6 + 0.4 * sin(TWO_PI * (t / 9.2) + 0.8);
          target *= resoplaRamp * resoplaPresence;
        }
        if (i === 1) {
          const pulse = intentaPulse.strength * sin(TWO_PI * (t / intentaPulse.period) + intentaPulse.phase);
          target += max(pulse, 0);
        }
        if (i === 3) {
          const crujeBoost = constrain(0.95 + 1.05 * (1.0 - min(t / 1.4, 1.0)), 0.95, 2.0);
          const earlyPresence = constrain(1.0 + 0.8 * (1.0 - min(t / 1.0, 1.0)), 1.0, 1.8);
          const lateCue = constrain(1.0 + 0.35 * max(0, 1.0 - abs(t - 40.0) / 14.0), 1.0, 1.35);
          target *= crujeBoost * earlyPresence * lateCue;
        }
        totalStrength += max(target, 0);
        snd.setVolume(max(target, 0), 0.5);
      }
    }
  }
}

function startAudio() {
  if (started) return;

  userStartAudio();

  for (let i = 0; i < sounds.length; i++) {
    const snd = sounds[i];
    if (snd && snd.isLoaded()) {
      snd.setVolume(baseVolumes[i]);
      snd.loop();
    }
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
