// Audio engine for banking notifications and cybernetic UI feedback
class CyberSoundEngine {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = true;
  private alarmInterval: any = null;
  private alarmAutoStopTimeout: any = null;
  private alarmStartTime: number = 0;
  private alarmRiskLevel: string = 'CRITICAL';
  private activeNodes: Array<{ osc: OscillatorNode; gain: GainNode }> = [];

  constructor() {
    // AudioContext will be unlocked upon first legitimate user interaction
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlockAudio();
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('pointerdown', unlock);
      };
      window.addEventListener('click', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
      window.addEventListener('pointerdown', unlock, { passive: true });
    }
  }

  private trackActiveNode(osc: OscillatorNode, gain: GainNode) {
    const item = { osc, gain };
    this.activeNodes.push(item);
    osc.onended = () => {
      const idx = this.activeNodes.indexOf(item);
      if (idx !== -1) {
        this.activeNodes.splice(idx, 1);
      }
    };
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopEmergencyAlarm();
    }
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public unlockAudio() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private getContext(): AudioContext | null {
    if (!this.isEnabled) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Quick cybernetic click / chirp
  public playClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Ignore audio failure
    }
  }

  // Bright energy ripple on button click
  public playEnergyRipple() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Ignore audio failure
    }
  }

  // Smooth tab switch sweep tone
  public playTabSweep() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // Ignore audio failure
    }
  }

  // Successful transaction chime (harmonic double chime)
  public playApprovedChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [587.33, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.05, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.15);
      });
    } catch {
      // Ignore
    }
  }

  // =========================================================================
  // EXTREMELY INTENSE CYBERSECURITY SOC FRAUD DETECTED THREAT ALERT
  // Sound Architecture (Duration ~1.2s - 1.4s, strictly capped under 3.0s):
  // 1. Sharp, Heavy Digital Impact (t = 0.00s - 0.22s):
  //    - Heavy Sub Drop (240Hz -> 38Hz) with saturated drive
  //    - Sharp Digital Transient Attack Snap (2.4kHz -> 320Hz bandpassed spike)
  //    - Cyber Distortion / Saturation bite layer
  // 2. Rapid Double Emergency Warning Pulse (t = 0.22s - 0.68s):
  //    - Pulse 1 (0.22s - 0.40s): 620Hz -> 420Hz aggressive resonant lowpass saw
  //    - Pulse 2 (0.44s - 0.66s): 740Hz -> 480Hz piercing high-security alarm saw
  // 3. Cyber Threat Drone & Sub Rumble (t = 0.05s - 1.10s):
  //    - Low 75Hz - 60Hz menacing resonant texture, giving high-security control room presence
  // 4. Dynamics Compressor & Limiter: High perceived loudness without clipping (0dB peak ceiling)
  // =========================================================================

  public playCyberThreatAlert(level: string = 'CRITICAL') {
    if (!this.isEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = this.getContext() || new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const isCritical = level === 'CRITICAL' || level === 'BLOCKED';

      // --- DYNAMICS COMPRESSOR & MASTER STAGING ---
      // Calibrated for high perceived loudness and punch without harsh clipping
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

      // --- LAYER 1: SHARP, HEAVY DIGITAL IMPACT (t = 0.00s to 0.22s) ---
      // 1A. Heavy Sub Drop Impact Body (240Hz -> 38Hz)
      const oscSub = ctx.createOscillator();
      const gainSub = ctx.createGain();
      oscSub.type = 'triangle';
      oscSub.frequency.setValueAtTime(isCritical ? 240 : 200, now);
      oscSub.frequency.exponentialRampToValueAtTime(38, now + 0.20);

      gainSub.gain.setValueAtTime(0.95, now);
      gainSub.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      oscSub.connect(gainSub);
      gainSub.connect(masterGain);
      oscSub.start(now);
      oscSub.stop(now + 0.22);
      this.trackActiveNode(oscSub, gainSub);

      // 1B. Sharp Digital Transient Snap (2400Hz -> 350Hz bandpass spike)
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

      // 1C. High-impact Mid Punch (Pitch drop 480Hz -> 90Hz in 60ms)
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

      // --- LAYER 2: RAPID DOUBLE EMERGENCY WARNING PULSE (t = 0.20s to 0.68s) ---
      // 2A. Emergency Pulse 1: Starts immediately after impact at now + 0.20s
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

      // 2B. Emergency Pulse 2: Rapid follow-up pulse at now + 0.42s
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

      // --- LAYER 3: DRAMATIC CYBER-SECURITY CONTROL ROOM SUB RUMBLE ---
      // Low sinister resonance (t = now + 0.04s to now + 0.95s)
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
    } catch {
      // Audio playback silently ignored if Web Audio is unsupported
    }
  }

  // Backwards-compatible alias for the warning alert
  public playOriginalBuzzer(level: string = 'CRITICAL') {
    this.playCyberThreatAlert(level);
  }

  // Start cybersecurity threat alert with maximum playback duration of 3 seconds per trigger
  public startEmergencyAlarm(level: string = 'CRITICAL') {
    this.stopEmergencyAlarm();
    if (!this.isEnabled) return;

    this.unlockAudio();
    this.alarmStartTime = Date.now();
    this.alarmRiskLevel = level;

    // 1. Play the intense, dramatic cybersecurity threat motif immediately (~1.1s total sonic event)
    this.playCyberThreatAlert(level);

    // 2. Play a second warning pulse sequence at 1.4s, strictly bounded within 3 seconds
    this.alarmInterval = setTimeout(() => {
      if (!this.isEnabled || Date.now() - this.alarmStartTime >= 2800) {
        this.stopEmergencyAlarm();
        return;
      }
      this.playCyberThreatAlert(this.alarmRiskLevel);
    }, 1400);

    // 3. Absolute cutoff: All audio stops automatically after a maximum of 3 seconds
    this.alarmAutoStopTimeout = setTimeout(() => {
      this.stopEmergencyAlarm();
    }, 3000);
  }

  // Instantly stop all alarm intervals, timeouts, and any active in-flight audio nodes when alert is dismissed
  public stopEmergencyAlarm() {
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }

    if (this.alarmAutoStopTimeout) {
      clearTimeout(this.alarmAutoStopTimeout);
      this.alarmAutoStopTimeout = null;
    }

    // Immediately stop in-flight oscillator nodes
    if (this.activeNodes && this.activeNodes.length > 0) {
      this.activeNodes.forEach(({ osc, gain }) => {
        try {
          gain.gain.cancelScheduledValues(0);
          gain.gain.setValueAtTime(0, 0);
          osc.stop();
        } catch {
          // ignore
        }
      });
      this.activeNodes = [];
    }
  }

  // Single-shot Threat Alert buzzer
  public playEmergencyKlaxon(level: string = 'CRITICAL') {
    if (!this.isEnabled) return;
    this.playCyberThreatAlert(level);
  }

  // Convenience aliases for module actions
  public playSuccessChime() {
    this.playApprovedChime();
  }

  public playWarningChime(level: string = 'CRITICAL') {
    this.playCyberThreatAlert(level);
  }
}

export const cyberSound = new CyberSoundEngine();
