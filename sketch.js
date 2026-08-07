let sounds = [];
let semillaOscillators = [];
let semillaGains = [];
let audioContext = null;
let semillaPhase = 0;
const soundFiles = ['llama.wav', 'intenta.wav', 'resopla.wav', 'cruje.wav'];
const baseVolumes = [0.048, 0.032, 0.014, 0.120];
const breathAmp = [0.020, 0.036, 0.014, 0.088];
const periods = [28.6, 22.8, 18.4, 20.5];
const phases = [0.0, 2.8, 1.3, -0.6];
const intentaPulse = { strength: 0.024, period: 43.7, phase: 1.8 };
const semillaBaseFreq = 520;
const semillaParams = { strength: 0.065, modRate: 7.2, modDepth: 60, grainRate: 12.4, grainPhase: 0 };
const llamaInitialDelay = 34.0;
const llamaGateMin = 28.0;
const llamaGateMax = 42.0;
const llamaGateDuration = 6.4;
let nextLlamaGate = llamaInitialDelay;
let llamaActiveUntil = 0;
let llamaDistancePhase = 0;
let llamaPulsePhase = 0;
let llamaReturnTime = 56.0;
let llamaReturnTriggered = false;
let started = false;
let loadedCount = 0;

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
    semillaPhase = t % 100;
    
    // Síntesis aditiva: modular múltiples osciladores
    if (semillaOscillators.length > 0) {
      const modFreq = semillaParams.modRate + 3.2 * sin(TWO_PI * (t / 19.4));
      const modAmount = semillaParams.modDepth * (0.6 + 0.4 * sin(TWO_PI * (t / 15.8)));
      const grainEffect = 0.7 + 0.3 * sin(TWO_PI * semillaParams.grainRate * t + semillaParams.grainPhase);
      const semillaDensity = 0.4 + 0.3 * sin(TWO_PI * (t / 8.6));
      // modFactor nunca baja de 0.6 para que la síntesis siempre sea audible
      const modFactor = 0.6 + 0.4 * (semillaDensity * grainEffect);

      for (let i = 0; i < semillaOscillators.length; i++) {
        const osc = semillaOscillators[i];
        const gainData = semillaGains[i];
        const harmonicFreq = semillaBaseFreq + modAmount * sin(TWO_PI * (t / (1.0 / modFreq)));
        osc.frequency.setValueAtTime(harmonicFreq * gainData.harmonic.freq * grainEffect, audioContext.currentTime);
        gainData.gain.gain.setValueAtTime(gainData.harmonic.baseGain * modFactor, audioContext.currentTime);
      }
    }
    
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
  soundFormats('wav');

  let pending = soundFiles.length;
  for (let i = 0; i < soundFiles.length; i++) {
    const idx = i;
    const path = './voces/' + soundFiles[idx];
    sounds[idx] = loadSound(path,
      () => {
        loadedCount += 1;
        sounds[idx].setVolume(baseVolumes[idx]);
        sounds[idx].loop();
      },
      (err) => { console.warn('No se pudo cargar:', path, err); }
    );
  }
  
  // Acceder al contexto de audio de p5.sound
  audioContext = p5.soundOut.context;
  
  // amplitudes base audibles en Web Audio API
  const harmonics = [
    { freq: 1.0,  baseGain: 0.08 },
    { freq: 2.1,  baseGain: 0.06 },
    { freq: 3.2,  baseGain: 0.04 },
    { freq: 4.9,  baseGain: 0.025 },
    { freq: 6.1,  baseGain: 0.015 }
  ];
  
  for (let i = 0; i < harmonics.length; i++) {
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = semillaBaseFreq * harmonics[i].freq;
    
    const gain = audioContext.createGain();
    gain.gain.value = harmonics[i].baseGain;
    
    osc.connect(gain);
    gain.connect(p5.soundOut.destination);
    osc.start(audioContext.currentTime);
    
    semillaOscillators.push(osc);
    semillaGains.push({ gain, harmonic: harmonics[i] });
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
  for (let i = 0; i < semillaOscillators.length; i++) {
    semillaOscillators[i].stop();
    semillaOscillators[i].disconnect();
    semillaGains[i].gain.disconnect();
  }
  semillaOscillators = [];
  semillaGains = [];
  started = false;
}

function stopAudio() {
  for (let i = 0; i < semillaOscillators.length; i++) {
    semillaOscillators[i].stop();
    semillaOscillators[i].disconnect();
    semillaGains[i].gain.disconnect();
  }
  semillaOscillators = [];
  semillaGains = [];
  started = false;
}
