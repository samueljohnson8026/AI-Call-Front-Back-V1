import { ServerOptions, WebSocket } from 'ws';

export interface TwilioEvent {
    event: string;
}

export interface TwilioSequentialMessage extends TwilioEvent {
    sequenceNumber: number;
    streamSid: string;
}

export interface TwilioConnectedEvent extends TwilioEvent {
    event: 'connected';
    protocol: string;
    version: string;
}

export interface TwilioStartEvent extends TwilioSequentialMessage {
    event: 'start';
    start: {
        streamSid: string;
        accountSid: string;
        callSid: string;
        tracks: string[];
        customParameters: Record<string, unknown>;
        mediaFormat: {
            encoding: string;
            sampleRate: number;
            channels: number;
        }
    };
}

export interface TwilioMediaEvent extends TwilioSequentialMessage {
    event: 'media';
    media: {
        track: 'inbound' | 'outbound';
        chunk: number;
        timestamp: string;
        payload: string;
    }
}

export interface TwilioSendMedia {
    streamSid: string;
    media: {
        payload: string;
    }
}

export interface TwilioStopEvent extends TwilioSequentialMessage {
    event: 'stop';
    stop: {
        accountSid: string;
        callSid: string;
    }
}

export interface TwilioDtmfEvent extends TwilioSequentialMessage {
    event: 'dtmf';
    dtmf: {
        track: string;
        digit: string;
    }
}

export interface TwilioMarkEvent extends TwilioSequentialMessage {
    event: 'mark';
    mark: {
        name: string;
    }
}

export interface TwilioMessageHandlers {
    onConnected?: (socket: TwilioWebSocket, event: TwilioConnectedEvent) => void;
    onStart?: (socket: TwilioWebSocket, event: TwilioStartEvent) => void;
    onMedia?: (socket: TwilioWebSocket, event: TwilioMediaEvent) => void;
    onStop?: (socket: TwilioWebSocket, event: TwilioStopEvent) => void;
    onDtmf?: (socket: TwilioWebSocket, event: TwilioDtmfEvent) => void;
    onMark?: (socket: TwilioWebSocket, event: TwilioMarkEvent) => void;
}

export interface TwilioServerOptions extends ServerOptions {
    handlers?: TwilioMessageHandlers;
}

export class TwilioWebSocket extends WebSocket {

    sendMedia(media: TwilioSendMedia) {
        this.sendEvent({
            event: 'media',
            ...media
        });
    }

    sendEvent(event: TwilioEvent) {
        const json = JSON.stringify(event);
        this.send(json);
    }
}