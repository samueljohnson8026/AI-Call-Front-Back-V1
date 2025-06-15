import { WebSocketServer, CloseEvent, Event, ErrorEvent } from 'ws';
import { TwilioConnectedEvent, TwilioDtmfEvent, TwilioEvent, TwilioMarkEvent, TwilioMediaEvent, TwilioServerOptions, TwilioStartEvent, TwilioStopEvent, TwilioWebSocket } from './twilio-server.dto';

export class TwilioWebSocketServer extends WebSocketServer {

    public onOpen?: (socket: TwilioWebSocket, event: Event) => void;
    public onError?: (socket: TwilioWebSocket, event: ErrorEvent) => void;
    public onClose?: (socket: TwilioWebSocket, event: CloseEvent) => void;

    constructor(options?: TwilioServerOptions) {
        options = options || {};
        options.WebSocket = TwilioWebSocket;
        super(options);

        this.addListener('connection', (socket: TwilioWebSocket) => {
            socket.onopen = (event) => { this.onOpen?.(socket, event); };
            socket.onerror = (event) => { this.onError?.(socket, event); };
            socket.onclose = (event) => { this.onClose?.(socket, event); };

            socket.onmessage = (message) => {
                try {
                    if (!options?.handlers)
                        return;

                    const dataString = message.data?.toString();
                    if (!dataString)
                        return;

                    const twilioObject = <TwilioEvent>JSON.parse(dataString);
                    const eventName = twilioObject.event;
                    switch (eventName) {
                        case 'connected':
                            return options.handlers.onConnected?.(socket, <TwilioConnectedEvent>twilioObject);
                        case 'start':
                            return options.handlers.onStart?.(socket, <TwilioStartEvent>twilioObject);
                        case 'media':
                            return options.handlers.onMedia?.(socket, <TwilioMediaEvent>twilioObject);
                        case 'stop':
                            return options.handlers.onStop?.(socket, <TwilioStopEvent>twilioObject);
                        case 'dtmf':
                            return options.handlers.onDtmf?.(socket, <TwilioDtmfEvent>twilioObject);
                        case 'mark':
                            return options.handlers.onMark?.(socket, <TwilioMarkEvent>twilioObject);
                    }
                } catch (error) {
                    socket.emit('error', error);
                }
            };
        });
    }
}