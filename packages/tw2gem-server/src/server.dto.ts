import { GeminiLiveClient, GeminiLiveClientOptions } from '@tw2gem/gemini-live-client';
import { TwilioWebSocket } from '@tw2gem/twilio-server';
import { ServerOptions } from 'ws';

export class Tw2GemSocket extends TwilioWebSocket {
    twilioStreamSid?: string;
    geminiClient?: GeminiLiveClient;
    
    // Call tracking properties
    callId?: string;
    callStartTime?: string;
    callEnded?: boolean;
    userId?: string;
    agentId?: string;
    phoneNumberFrom?: string;
    phoneNumberTo?: string;
    direction?: 'inbound' | 'outbound';
    transcript?: string;
    functionCalls?: any[];
    customerSatisfaction?: number;
}

export class Tw2GemServerOptions {
    serverOptions: ServerOptions;
    geminiOptions: GeminiLiveClientOptions;
    supabaseUrl?: string;
    supabaseKey?: string;
}

export class Tw2GemGeminiEvents {
    onReady?: (socket: Tw2GemSocket) => void;
    onClose?: (socket: Tw2GemSocket) => void;
}