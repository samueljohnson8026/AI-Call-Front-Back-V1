import { TwilioWebSocketServer } from '@tw2gem/twilio-server';

const twilioServer = () => {
    const wsServer = new TwilioWebSocketServer({
        port: parseInt(process.env.PORT || '12001', 10),
        handlers: {
            onConnected: (socket, event) => {
                console.log(`Twlilio onConnected: ${JSON.stringify(event)}`);
            },
            onStart: (socket, event) => {
                console.log(`Twlilio onStart: ${JSON.stringify(event)}`);
            },
            onMedia: (socket, event) => {
                console.log(`Twlilio onMedia: ${JSON.stringify(event)}`);
            },
            onStop: (socket, event) => {
                console.log(`Twlilio onStop: ${JSON.stringify(event)}`);
            },
            onDtmf: (socket, event) => {
                console.log(`Twlilio onDtmf: ${JSON.stringify(event)}`);
            },
            onMark: (socket, event) => {
                console.log(`Twlilio onMark: ${JSON.stringify(event)}`);
            },
        }
    });

    console.log(`WebSocket server is running in ${wsServer.options.port}`);
};

twilioServer();