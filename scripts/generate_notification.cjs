const fs = require('fs');
const path = require('path');

// Generate a pristine 44.1kHz 16-bit mono WAV file for a modern, clean banking app notification
function generateNotificationWav() {
  const sampleRate = 44100;
  const duration = 0.38; // 380 milliseconds
  const totalSamples = Math.floor(sampleRate * duration);

  const samples = new Float32Array(totalSamples);

  // Tone 1: Soft, crisp neutral first tone (784 Hz - G5)
  const f1 = 784.0;
  const t1_start = 0.0;
  const t1_decay = 24.0; // natural acoustic decay rate

  // Tone 2: Clear, pleasant second tone (1046.5 Hz - C6, classic neutral chime)
  const f2 = 1046.5;
  const t2_start = 0.070; // starts 70ms later
  const t2_decay = 14.0; // gentle natural tail

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let s = 0;

    // Tone 1 contribution
    if (t >= t1_start) {
      const dt1 = t - t1_start;
      // 5ms smooth attack to prevent any pop/click
      const attack1 = Math.min(1.0, dt1 / 0.005);
      const env1 = attack1 * Math.exp(-t1_decay * dt1);
      const wave1 = 0.95 * Math.sin(2 * Math.PI * f1 * dt1) + 
                    0.05 * Math.sin(2 * Math.PI * f1 * 2 * dt1);
      s += wave1 * env1 * 0.70;
    }

    // Tone 2 contribution
    if (t >= t2_start) {
      const dt2 = t - t2_start;
      // 5ms smooth attack
      const attack2 = Math.min(1.0, dt2 / 0.005);
      const env2 = attack2 * Math.exp(-t2_decay * dt2);
      const wave2 = 0.96 * Math.sin(2 * Math.PI * f2 * dt2) + 
                    0.04 * Math.sin(2 * Math.PI * f2 * 2 * dt2);
      s += wave2 * env2 * 0.85;
    }

    samples[i] = s;
  }

  // Normalize to comfortable medium volume (peak around 0.48 = -6.4 dBFS)
  let maxAmp = 0;
  for (let i = 0; i < totalSamples; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  const targetPeak = 0.48;
  const gain = maxAmp > 0 ? targetPeak / maxAmp : 1.0;
  for (let i = 0; i < totalSamples; i++) {
    samples[i] *= gain;
  }

  // Build standard PCM WAV buffer (16-bit Mono, 44100 Hz)
  const bytesPerSample = 2;
  const dataSize = totalSamples * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // ChunkID "RIFF"
  buffer.write('RIFF', 0);
  // ChunkSize (36 + dataSize)
  buffer.writeUInt32LE(36 + dataSize, 4);
  // Format "WAVE"
  buffer.write('WAVE', 8);

  // Subchunk1ID "fmt "
  buffer.write('fmt ', 12);
  // Subchunk1Size 16 (PCM)
  buffer.writeUInt32LE(16, 16);
  // AudioFormat 1 (PCM)
  buffer.writeUInt16LE(1, 20);
  // NumChannels 1 (Mono)
  buffer.writeUInt16LE(1, 22);
  // SampleRate 44100
  buffer.writeUInt32LE(sampleRate, 24);
  // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  buffer.writeUInt32LE(sampleRate * 1 * 2, 28);
  // BlockAlign (NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(2, 32);
  // BitsPerSample 16
  buffer.writeUInt16LE(16, 34);

  // Subchunk2ID "data"
  buffer.write('data', 36);
  // Subchunk2Size
  buffer.writeUInt32LE(dataSize, 40);

  // Write PCM 16-bit samples
  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    let val = Math.max(-1.0, Math.min(1.0, samples[i]));
    let intVal = Math.floor(val * 32767);
    buffer.writeInt16LE(intVal, offset);
    offset += 2;
  }

  return buffer;
}

const wavBuffer = generateNotificationWav();
const outputDir = path.join(__dirname, '..', 'public', 'sounds');
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, 'notification.wav');
fs.writeFileSync(outputPath, wavBuffer);

console.log(`Generated WAV at ${outputPath} (${wavBuffer.length} bytes)`);

// Also generate a TypeScript constants file with the base64 URI for instant zero-latency playback
const base64Wav = `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
const tsContent = `// Natural, clean electronic app notification audio file (16-bit 44.1kHz PCM)
// Pre-encoded data URI for zero-latency, 100% reliable offline playback
export const NOTIFICATION_SOUND_DATA_URI = "${base64Wav}";
export const NOTIFICATION_SOUND_URL = "/sounds/notification.wav";
`;
fs.writeFileSync(path.join(__dirname, '..', 'src', 'utils', 'notificationSoundAsset.ts'), tsContent);
console.log(`Generated asset TS at src/utils/notificationSoundAsset.ts`);
