/**
 * Web Audio API synthesizer for realistic audio previews and audio recording helpers.
 * Generates genuine audible audio for riffs, bass lines, chord progressions, and full song sketches.
 */

// Generate 40-60 waveform sample bars from an audio buffer or synthetic curve
export function generateWaveformSamples(seed: number = 42, count: number = 50): number[] {
  const samples: number[] = [];
  let prev = 0.4;
  for (let i = 0; i < count; i++) {
    // Generate organic musical waveform heights
    const sin1 = Math.sin((i / count) * Math.PI * 4 + seed);
    const sin2 = Math.cos((i / count) * Math.PI * 8 + seed * 2);
    const noise = (Math.sin(i * 999 + seed) * 0.5 + 0.5) * 0.4;
    const base = (Math.abs(sin1 * 0.6 + sin2 * 0.3) + noise) * 0.8 + 0.15;
    const smoothed = prev * 0.3 + base * 0.7;
    prev = smoothed;
    samples.push(Math.min(1, Math.max(0.12, smoothed)));
  }
  return samples;
}

// Synthesize a WAV audio file buffer in browser memory using Web Audio OfflineAudioContext
export async function createSynthesizedAudioDemo(
  type: 'bass' | 'riff' | 'chorus' | 'idea',
  durationSec: number = 12
): Promise<{ blobUrl: string; duration: number; samples: number[] }> {
  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, sampleRate * durationSec, sampleRate);

  const now = offlineCtx.currentTime;

  if (type === 'bass') {
    // Punchy funk/rock bassline: E1 (41.2Hz), G1 (49.0Hz), A1 (55.0Hz), D2 (73.4Hz)
    const notes = [41.2, 41.2, 49.0, 55.0, 55.0, 73.4, 65.4, 49.0];
    const noteDuration = 0.5;
    const totalBars = Math.floor(durationSec / (notes.length * noteDuration));

    for (let bar = 0; bar <= totalBars; bar++) {
      notes.forEach((freq, idx) => {
        const startTime = now + (bar * notes.length + idx) * noteDuration;
        if (startTime + noteDuration > durationSec) return;

        // Sub oscillator (sine)
        const osc1 = offlineCtx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, startTime);

        const sub = offlineCtx.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(freq / 2, startTime);

        // Lowpass filter for warm bass tone
        const filter = offlineCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, startTime);
        filter.frequency.exponentialRampToValueAtTime(140, startTime + 0.3);

        const gain = offlineCtx.createGain();
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.45, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration * 0.9);

        osc1.connect(filter);
        sub.connect(filter);
        filter.connect(gain);
        gain.connect(offlineCtx.destination);

        osc1.start(startTime);
        osc1.stop(startTime + noteDuration);
        sub.start(startTime);
        sub.stop(startTime + noteDuration);
      });
    }
  } else if (type === 'riff') {
    // Electric Rock Guitar Riff: A minor pentatonic rock riff with drive
    const riffNotes = [
      { f: 110.0, d: 0.35 }, // A2
      { f: 110.0, d: 0.2 },  // A2
      { f: 130.8, d: 0.35 }, // C3
      { f: 146.8, d: 0.35 }, // D3
      { f: 155.6, d: 0.2 },  // D#3
      { f: 146.8, d: 0.35 }, // D3
      { f: 130.8, d: 0.35 }, // C3
      { f: 98.0,  d: 0.4 },  // G2
    ];

    let t = now;
    while (t < durationSec - 0.5) {
      for (const note of riffNotes) {
        if (t >= durationSec - 0.2) break;
        const osc = offlineCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note.f, t);

        // Distortion / overdrive wave shaper
        const drive = offlineCtx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; ++i) {
          const x = (i * 2) / 256 - 1;
          curve[i] = ((Math.PI + 4) * x) / (Math.PI + 4 * Math.abs(x));
        }
        drive.curve = curve;

        const filter = offlineCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, t);
        filter.Q.setValueAtTime(2, t);

        const gain = offlineCtx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + note.d * 0.95);

        osc.connect(drive);
        drive.connect(filter);
        filter.connect(gain);
        gain.connect(offlineCtx.destination);

        osc.start(t);
        osc.stop(t + note.d);
        t += note.d;
      }
    }
  } else if (type === 'chorus') {
    // Chorus Idea: Rich 4-chord progression (C - G - Am - F) with vocal-like lead
    const chords = [
      [261.6, 329.6, 392.0], // C major
      [196.0, 246.9, 293.7], // G major
      [220.0, 261.6, 329.6], // A minor
      [174.6, 220.0, 261.6], // F major
    ];

    let t = now;
    const chordDuration = 2.0;

    chords.forEach((chord, chordIdx) => {
      const chordStart = t + chordIdx * chordDuration;
      if (chordStart >= durationSec) return;

      chord.forEach(freq => {
        const osc = offlineCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, chordStart);

        const filter = offlineCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, chordStart);

        const gain = offlineCtx.createGain();
        gain.gain.setValueAtTime(0.01, chordStart);
        gain.gain.linearRampToValueAtTime(0.2, chordStart + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, chordStart + chordDuration - 0.05);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(offlineCtx.destination);

        osc.start(chordStart);
        osc.stop(chordStart + chordDuration);
      });

      // Melody lead note on top of each chord
      const melodyFreq = chord[1] * 2;
      const leadOsc = offlineCtx.createOscillator();
      leadOsc.type = 'sine';
      leadOsc.frequency.setValueAtTime(melodyFreq, chordStart + 0.2);

      const leadGain = offlineCtx.createGain();
      leadGain.gain.setValueAtTime(0, chordStart + 0.2);
      leadGain.gain.linearRampToValueAtTime(0.25, chordStart + 0.3);
      leadGain.gain.exponentialRampToValueAtTime(0.001, chordStart + 1.6);

      leadOsc.connect(leadGain);
      leadGain.connect(offlineCtx.destination);

      leadOsc.start(chordStart + 0.2);
      leadOsc.stop(chordStart + 1.8);
    });
  } else {
    // "Song Idea": Full acoustic groove with kick, snare pop, and acoustic guitar strums
    const bpm = 110;
    const beat = 60 / bpm;
    const totalBeats = Math.floor(durationSec / beat);

    for (let b = 0; b < totalBeats; b++) {
      const beatTime = now + b * beat;
      if (beatTime >= durationSec) break;

      // Kick drum on beats 0, 2
      if (b % 4 === 0 || b % 4 === 2) {
        const kickOsc = offlineCtx.createOscillator();
        kickOsc.frequency.setValueAtTime(120, beatTime);
        kickOsc.frequency.exponentialRampToValueAtTime(35, beatTime + 0.12);

        const kickGain = offlineCtx.createGain();
        kickGain.gain.setValueAtTime(0.6, beatTime);
        kickGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.2);

        kickOsc.connect(kickGain);
        kickGain.connect(offlineCtx.destination);
        kickOsc.start(beatTime);
        kickOsc.stop(beatTime + 0.25);
      }

      // Snare on beats 1, 3
      if (b % 4 === 1 || b % 4 === 3) {
        // Noise buffer for snare crack
        const bufferSize = offlineCtx.sampleRate * 0.15;
        const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, offlineCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = offlineCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = offlineCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(800, beatTime);

        const snareGain = offlineCtx.createGain();
        snareGain.gain.setValueAtTime(0.3, beatTime);
        snareGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.15);

        whiteNoise.connect(filter);
        filter.connect(snareGain);
        snareGain.connect(offlineCtx.destination);
        whiteNoise.start(beatTime);
        whiteNoise.stop(beatTime + 0.15);
      }

      // Acoustic strum pattern (Em - G)
      const isEm = Math.floor(b / 8) % 2 === 0;
      const chordFreqs = isEm ? [164.8, 196.0, 246.9, 329.6] : [196.0, 246.9, 293.7, 392.0];

      chordFreqs.forEach((freq, idx) => {
        const strumDelay = idx * 0.015;
        const strumTime = beatTime + strumDelay;
        const osc = offlineCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, strumTime);

        const gain = offlineCtx.createGain();
        gain.gain.setValueAtTime(0.18, strumTime);
        gain.gain.exponentialRampToValueAtTime(0.001, strumTime + beat * 0.85);

        osc.connect(gain);
        gain.connect(offlineCtx.destination);
        osc.start(strumTime);
        osc.stop(strumTime + beat * 0.9);
      });
    }
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWav(renderedBuffer);
  const blobUrl = URL.createObjectURL(wavBlob);
  const samples = generateWaveformSamples(type.charCodeAt(0), 48);

  return { blobUrl, duration: durationSec, samples };
}

// Convert AudioBuffer to standard WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const resultBuffers: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    resultBuffers.push(buffer.getChannelData(i));
  }

  const numSamples = buffer.length;
  const blockAlign = numChannels * (bitDepth / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write interleaved PCM audio data
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = resultBuffers[channel][i];
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
