// Verification script for SOC cybersecurity threat alert audio lifecycle and Web Audio parameters
const assert = require('assert');

class MockOscillator {
  constructor() {
    this.type = 'sine';
    this.frequency = {
      value: 0,
      setValueAtTime(v) { this.startFreq = v; },
      exponentialRampToValueAtTime(v) { this.endFreq = v; },
      linearRampToValueAtTime(v) { this.endFreqLinear = v; }
    };
    this.started = false;
    this.stoppedAt = null;
  }
  connect(dest) { this.destination = dest; }
  start(t = 0) { this.started = true; this.startedAt = t; }
  stop(t = 0) { this.stoppedAt = t; }
}

class MockGain {
  constructor() {
    this.gain = {
      setValueAtTime(v) { this.startGain = v; },
      exponentialRampToValueAtTime(v) { this.endGain = v; },
      linearRampToValueAtTime(v) { this.linearGain = v; },
      cancelScheduledValues() { this.cancelled = true; }
    };
  }
  connect(dest) { this.destination = dest; }
}

class MockBiquadFilter {
  constructor() {
    this.type = 'lowpass';
    this.frequency = {
      value: 350,
      setValueAtTime(v) { this.filterFreq = v; }
    };
    this.Q = {
      value: 1,
      setValueAtTime(v) { this.qValue = v; }
    };
  }
  connect(dest) { this.destination = dest; }
}

class MockCompressor {
  constructor() {
    this.threshold = { setValueAtTime(v) { this.val = v; } };
    this.knee = { setValueAtTime(v) { this.val = v; } };
    this.ratio = { setValueAtTime(v) { this.val = v; } };
    this.attack = { setValueAtTime(v) { this.val = v; } };
    this.release = { setValueAtTime(v) { this.val = v; } };
  }
  connect(dest) { this.destination = dest; }
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = {};
  }
  createOscillator() { return new MockOscillator(); }
  createGain() { return new MockGain(); }
  createBiquadFilter() { return new MockBiquadFilter(); }
  createDynamicsCompressor() { return new MockCompressor(); }
}

class TestThreatSoundEngine {
  constructor() {
    this.isEnabled = true;
    this.ctx = new MockAudioContext();
    this.alarmInterval = null;
    this.alarmAutoStopTimeout = null;
    this.alarmStartTime = 0;
    this.alarmRiskLevel = 'CRITICAL';
    this.activeNodes = [];
    this.playCount = 0;
    this.lastCreatedLayers = {};
  }

  trackActiveNode(osc, gain) {
    const item = { osc, gain };
    this.activeNodes.push(item);
  }

  playCyberThreatAlert(level = 'CRITICAL') {
    if (!this.isEnabled) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const isCritical = level === 'CRITICAL' || level === 'BLOCKED';

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.65, now);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, now);
    compressor.knee.setValueAtTime(4, now);
    compressor.ratio.setValueAtTime(6, now);
    compressor.attack.setValueAtTime(0.002, now);
    compressor.release.setValueAtTime(0.09, now);

    masterGain.connect(compressor);
    compressor.connect(ctx.destination);

    // Layer 1A: Heavy Sub Drop Impact Body (240Hz -> 38Hz)
    const oscBody = ctx.createOscillator();
    const gainBody = ctx.createGain();
    oscBody.type = 'triangle';
    oscBody.frequency.setValueAtTime(isCritical ? 240 : 200, now);
    oscBody.frequency.exponentialRampToValueAtTime(38, now + 0.20);
    gainBody.gain.setValueAtTime(0.95, now);
    gainBody.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    oscBody.connect(gainBody);
    gainBody.connect(masterGain);
    oscBody.start(now);
    oscBody.stop(now + 0.22);
    this.trackActiveNode(oscBody, gainBody);

    // Layer 1B: Digital Attack Snap Transient (2400Hz -> 350Hz)
    const oscSnap = ctx.createOscillator();
    const filterSnap = ctx.createBiquadFilter();
    const gainSnap = ctx.createGain();
    oscSnap.type = 'sawtooth';
    oscSnap.frequency.setValueAtTime(isCritical ? 2400 : 1900, now);
    oscSnap.frequency.exponentialRampToValueAtTime(350, now + 0.035);
    filterSnap.type = 'bandpass';
    filterSnap.frequency.setValueAtTime(1800, now);
    filterSnap.Q.setValueAtTime(4.0, now);
    gainSnap.gain.setValueAtTime(0.65, now);
    gainSnap.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    oscSnap.connect(filterSnap);
    filterSnap.connect(gainSnap);
    gainSnap.connect(masterGain);
    oscSnap.start(now);
    oscSnap.stop(now + 0.035);
    this.trackActiveNode(oscSnap, gainSnap);

    // Layer 1C: High-impact Mid Punch
    const oscPunch = ctx.createOscillator();
    const gainPunch = ctx.createGain();
    oscPunch.type = 'sawtooth';
    oscPunch.frequency.setValueAtTime(isCritical ? 520 : 420, now);
    oscPunch.frequency.exponentialRampToValueAtTime(80, now + 0.06);
    gainPunch.gain.setValueAtTime(0.55, now);
    gainPunch.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    oscPunch.connect(gainPunch);
    gainPunch.connect(masterGain);
    oscPunch.start(now);
    oscPunch.stop(now + 0.06);
    this.trackActiveNode(oscPunch, gainPunch);

    // Layer 2A: Electronic Emergency Pulse 1 (620Hz -> 420Hz)
    const p1Start = now + 0.20;
    const oscP1 = ctx.createOscillator();
    const filterP1 = ctx.createBiquadFilter();
    const gainP1 = ctx.createGain();
    oscP1.type = 'sawtooth';
    oscP1.frequency.setValueAtTime(isCritical ? 620 : 520, p1Start);
    oscP1.frequency.exponentialRampToValueAtTime(isCritical ? 420 : 360, p1Start + 0.16);
    filterP1.type = 'lowpass';
    filterP1.frequency.setValueAtTime(1600, p1Start);
    filterP1.Q.setValueAtTime(4.5, p1Start);
    gainP1.gain.setValueAtTime(0.001, p1Start);
    gainP1.gain.linearRampToValueAtTime(0.75, p1Start + 0.008);
    gainP1.gain.exponentialRampToValueAtTime(0.002, p1Start + 0.16);
    oscP1.connect(filterP1);
    filterP1.connect(gainP1);
    gainP1.connect(masterGain);
    oscP1.start(p1Start);
    oscP1.stop(p1Start + 0.16);
    this.trackActiveNode(oscP1, gainP1);

    // Layer 2B: Electronic Emergency Pulse 2 (740Hz -> 480Hz)
    const p2Start = now + 0.42;
    const oscP2 = ctx.createOscillator();
    const filterP2 = ctx.createBiquadFilter();
    const gainP2 = ctx.createGain();
    oscP2.type = 'sawtooth';
    oscP2.frequency.setValueAtTime(isCritical ? 740 : 620, p2Start);
    oscP2.frequency.exponentialRampToValueAtTime(isCritical ? 480 : 420, p2Start + 0.18);
    filterP2.type = 'lowpass';
    filterP2.frequency.setValueAtTime(1800, p2Start);
    filterP2.Q.setValueAtTime(5.0, p2Start);
    gainP2.gain.setValueAtTime(0.001, p2Start);
    gainP2.gain.linearRampToValueAtTime(0.85, p2Start + 0.008);
    gainP2.gain.exponentialRampToValueAtTime(0.002, p2Start + 0.18);
    oscP2.connect(filterP2);
    filterP2.connect(gainP2);
    gainP2.connect(masterGain);
    oscP2.start(p2Start);
    oscP2.stop(p2Start + 0.18);
    this.trackActiveNode(oscP2, gainP2);

    // Layer 3: Sinister Control Room Sub Rumble
    const texStart = now + 0.04;
    const oscTex = ctx.createOscillator();
    const filterTex = ctx.createBiquadFilter();
    const gainTex = ctx.createGain();
    oscTex.type = 'sawtooth';
    oscTex.frequency.setValueAtTime(isCritical ? 85 : 75, texStart);
    oscTex.frequency.linearRampToValueAtTime(isCritical ? 60 : 52, texStart + 0.90);
    filterTex.type = 'bandpass';
    filterTex.frequency.setValueAtTime(260, texStart);
    filterTex.Q.setValueAtTime(4.5, texStart);
    gainTex.gain.setValueAtTime(0.001, texStart);
    gainTex.gain.linearRampToValueAtTime(0.40, texStart + 0.08);
    gainTex.gain.exponentialRampToValueAtTime(0.001, texStart + 0.92);
    oscTex.connect(filterTex);
    filterTex.connect(gainTex);
    gainTex.connect(masterGain);
    oscTex.start(texStart);
    oscTex.stop(texStart + 0.92);
    this.trackActiveNode(oscTex, gainTex);

    this.lastCreatedLayers = {
      masterGain,
      compressor,
      oscBody,
      oscSnap,
      oscPunch,
      oscP1,
      oscP2,
      oscTex
    };
    this.playCount++;
  }

  startEmergencyAlarm(level = 'CRITICAL') {
    this.stopEmergencyAlarm();
    if (!this.isEnabled) return;

    this.alarmStartTime = Date.now();
    this.alarmRiskLevel = level;

    this.playCyberThreatAlert(level);

    this.alarmInterval = setTimeout(() => {
      if (!this.isEnabled || Date.now() - this.alarmStartTime >= 2800) {
        this.stopEmergencyAlarm();
        return;
      }
      this.playCyberThreatAlert(this.alarmRiskLevel);
    }, 1400);

    this.alarmAutoStopTimeout = setTimeout(() => {
      this.stopEmergencyAlarm();
    }, 3000);
  }

  stopEmergencyAlarm() {
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    if (this.alarmAutoStopTimeout) {
      clearTimeout(this.alarmAutoStopTimeout);
      this.alarmAutoStopTimeout = null;
    }
    if (this.activeNodes && this.activeNodes.length > 0) {
      this.activeNodes.forEach(({ osc, gain }) => {
        try {
          gain.gain.cancelScheduledValues();
          gain.gain.setValueAtTime(0, 0);
          osc.stop();
        } catch {}
      });
      this.activeNodes = [];
    }
  }
}

// =========================================================================
// RUN TEST SUITE
// =========================================================================

const engine = new TestThreatSoundEngine();

// Test 1: Verify Critical Cyber Threat Alert architecture & parameters
engine.playCyberThreatAlert('CRITICAL');
assert.strictEqual(engine.playCount, 1, 'Threat alert must have played once');
const layers = engine.lastCreatedLayers;

// Check Master Gain & Compressor
assert.strictEqual(layers.masterGain.gain.startGain, 0.65, 'Master gain must be calibrated to punchy 0.65');
assert.strictEqual(layers.compressor.threshold.val, -14, 'Compressor threshold must be -14dB');

// Check Layer 1: Digital Impact Body, Snap, and Punch
assert.strictEqual(layers.oscBody.type, 'triangle', 'Sub impact body must be triangle for deep sub punch');
assert.strictEqual(layers.oscBody.frequency.startFreq, 240, 'Critical body frequency starts at 240Hz');
assert.strictEqual(layers.oscBody.frequency.endFreq, 38, 'Critical body sweeps down to 38Hz sub bass');
assert.strictEqual(layers.oscSnap.type, 'sawtooth', 'Attack snap must be sharp sawtooth transient');
assert.strictEqual(layers.oscSnap.frequency.startFreq, 2400, 'Attack snap transient starts at 2400Hz');
assert.strictEqual(layers.oscPunch.type, 'sawtooth', 'Mid punch must be sawtooth');
assert.strictEqual(layers.oscPunch.frequency.startFreq, 520, 'Mid punch starts at 520Hz');

// Check Layer 2: Rapid Double Emergency Warning Pulses
assert.strictEqual(layers.oscP1.type, 'sawtooth', 'Pulse 1 must be aggressive sawtooth');
assert.strictEqual(layers.oscP1.frequency.startFreq, 620, 'Pulse 1 starts at 620Hz');
assert.strictEqual(layers.oscP1.frequency.endFreq, 420, 'Pulse 1 sweeps to 420Hz');
assert.strictEqual(layers.oscP2.type, 'sawtooth', 'Pulse 2 must be aggressive sawtooth');
assert.strictEqual(layers.oscP2.frequency.startFreq, 740, 'Pulse 2 starts at 740Hz');
assert.strictEqual(layers.oscP2.frequency.endFreq, 480, 'Pulse 2 sweeps to 480Hz');

// Check Layer 3: Control Room Sub Threat Texture
assert.strictEqual(layers.oscTex.frequency.startFreq, 85, 'Threat texture starts at deep 85Hz');
assert.strictEqual(layers.oscTex.frequency.endFreqLinear, 60, 'Threat texture sweeps to 60Hz sub rumble');

// Check tracking of active nodes (6 oscillators across 3 layers)
assert(engine.activeNodes.length >= 6, 'Must track all 6 in-flight oscillator nodes');

// Test 2: Emergency alarm lifecycle & 3s auto-stop
engine.startEmergencyAlarm('CRITICAL');
assert(engine.alarmInterval !== null, 'Alarm interval must be active');
assert(engine.alarmAutoStopTimeout !== null, 'Alarm 3s auto-stop timeout must be scheduled');

// Test 3: Instant stop on dismissal silences all nodes
engine.stopEmergencyAlarm();
assert.strictEqual(engine.alarmInterval, null, 'Alarm interval must be cleared on dismissal');
assert.strictEqual(engine.alarmAutoStopTimeout, null, 'Auto-stop timeout must be cleared on dismissal');
assert.strictEqual(engine.activeNodes.length, 0, 'Active nodes must be cleared and stopped immediately');

console.log('✓ All Cybersecurity SOC Threat Alert sound lifecycle tests passed successfully!');

