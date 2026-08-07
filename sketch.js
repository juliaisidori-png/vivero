let sounds = [];
let semillaOsc, semillaEnv, semillaModOsc;
let semillaPhase = 0;
const soundFiles = ['llama.wav', 'intenta.wav', 'resopla.wav', 'cruje.wav'];
const baseVolumes = [0.048, 0.032, 0.014, 0.120];
const breathAmp = [0.020, 0.036, 0.014, 0.088];
const periods = [28.6, 22.8, 18.4, 20.5];
const phases = [0.0, 2.8, 1.3, -0.6];
const intentaPulse = { strength: 0.024, period: 43.7, phase: 1.8 };
const semillaBaseFreq = 285;
const semillaParams = { strength: 0.18, modRate: 7.2, modDepth: 45, grainRate: 12.4, grainPhase: 0 };
const llamaInitialDelay = 34.0;
const llamaGateMin = 14.0;
const llamaGateMax = 18.0;
const llamaGateDuration = 6.4;
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
  
  // Inicializar síntesis de vozsemilla
  semillaOsc = new p5.Oscillator('sine');
  semillaModOsc = new p5.Oscillator('sine');
  semillaEnv = new p5.Envelope();
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
    semillaPhase = t % 100;
    
    // Síntesis de vozsemilla: FM modulation para textura granular
    const modFreq = semillaParams.modRate + 3.2 * sin(TWO_PI * (t / 19.4));
    const modAmount = semillaParams.modDepth * (0.6 + 0.4 * sin(TWO_PI * (t / 15.8)));
    const baseSemillaFreq = semillaBaseFreq + modAmount * sin(TWO_PI * (t / (1.0 / modFreq)));
    const grainEffect = 0.7 + 0.3 * sin(TWO_PI * semillaParams.grainRate * t + semillaParams.grainPhase);
    const semillaDensity = 0.4 + 0.3 * sin(TWO_PI * (t / 8.6));
    const semillaVol = semillaParams.strength * semillaDensity * grainEffect;
    
    semillaOsc.freq(baseSemillaFreq * grainEffect);
    semillaOsc.amp(semillaVol, 0.02);
    
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
        if (i === 0) {
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
  
  // Iniciar síntesis de vozsemilla
  semillaOsc.connect();
  semillaOsc.start();

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
