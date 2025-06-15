export class AudioConverter {

    private static base64ToUint8Array(base64: string): Uint8Array {
        const binary = Buffer.from(base64, 'base64');
        return new Uint8Array(binary);
    }

    private static base64ToInt16Array(base64: string): Int16Array {
        const buffer = Buffer.from(base64, 'base64');
        return new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
    }

    private static muLawToPCM(muLawSample: number): number {
        const BIAS = 0x84;
        muLawSample = ~muLawSample;

        const sign = muLawSample & 0x80;
        const exponent = (muLawSample >> 4) & 0x07;
        const mantissa = muLawSample & 0x0F;

        let sample = ((mantissa << 3) + BIAS) << exponent;
        if (sign !== 0) sample = -sample;

        return sample;
    }

    static pcmToMuLaw(sample: number): number {
        const BIAS = 0x84;
        const CLIP = 32635;

        const sign = (sample >> 8) & 0x80;
        if (sign !== 0) sample = -sample;
        if (sample > CLIP) sample = CLIP;

        sample += BIAS;

        let exponent = 7;
        for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; expMask >>= 1) {
            exponent--;
        }

        const mantissa = (sample >> (exponent + 3)) & 0x0F;
        const muLawByte = ~(sign | (exponent << 4) | mantissa);

        return muLawByte & 0xFF;
    }

    static convertBase64MuLawToBase64PCM16k(base64: string): string {
        const muLawBytes = this.base64ToUint8Array(base64);
        const pcm8000 = new Int16Array(muLawBytes.length);

        for (let i = 0; i < muLawBytes.length; i++) {
            pcm8000[i] = this.muLawToPCM(muLawBytes[i]);
        }

        const pcm16000 = new Int16Array(pcm8000.length * 2);
        for (let i = 0; i < pcm8000.length; i++) {
            const sample = pcm8000[i];
            pcm16000[2 * i] = sample;
            pcm16000[2 * i + 1] = sample;
        }

        const buffer = Buffer.from(pcm16000.buffer);
        return buffer.toString('base64');
    }

    static convertBase64PCM24kToBase64MuLaw8k(base64: string): string {
        const pcm24k = this.base64ToInt16Array(base64);

        const samples8k = Math.floor(pcm24k.length / 3);
        const interpolated = new Int16Array(samples8k);

        for (let i = 0; i < samples8k; i++) {
            const a = pcm24k[i * 3];
            const b = pcm24k[i * 3 + 1] ?? a;
            const c = pcm24k[i * 3 + 2] ?? b;

            interpolated[i] = Math.round((a + b + c) / 3);
        }

        const muLaw = new Uint8Array(samples8k);
        for (let i = 0; i < samples8k; i++) {
            muLaw[i] = this.pcmToMuLaw(interpolated[i]);
        }

        return Buffer.from(muLaw).toString('base64');
    }

}