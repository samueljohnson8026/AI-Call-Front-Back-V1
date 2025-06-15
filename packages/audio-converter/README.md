# Audio Converter

A package for handling audio format conversion and processing in the TW2GEM project.

## Features

- Audio format conversion between μ-law and PCM
- Sample rate conversion (8kHz to 16kHz, 24kHz to 8kHz)
- Base64 encoding/decoding support
- Audio quality optimization

## Installation

```bash
npm install @tw2gem/audio-converter
```

## Usage

```typescript
import { AudioConverter } from '@tw2gem/audio-converter';

// Convert μ-law audio to PCM 16kHz
const pcmBase64 = AudioConverter.convertBase64MuLawToBase64PCM16k(muLawBase64);

// Convert PCM 24kHz to μ-law 8kHz
const muLawBase64 = AudioConverter.convertBase64PCM24kToBase64MuLaw8k(pcmBase64);
```

## API Reference

### AudioConverter

Static class for handling audio conversions.

#### Methods

- `static convertBase64MuLawToBase64PCM16k(base64: string): string`
  - Converts μ-law encoded audio at 8kHz to PCM encoded audio at 16kHz
  - Input: Base64 string of μ-law audio
  - Output: Base64 string of PCM audio

- `static convertBase64PCM24kToBase64MuLaw8k(base64: string): string`
  - Converts PCM encoded audio at 24kHz to μ-law encoded audio at 8kHz
  - Input: Base64 string of PCM audio
  - Output: Base64 string of μ-law audio

## License

This package is licensed under the MIT License - see the LICENSE file for details. 