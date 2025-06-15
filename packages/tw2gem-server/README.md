# @tw2gem/server

A WebSocket server for receiving real-time audio streams from Twilio calls and sending them to the Gemini Live API for processing.

## Description

This package serves as the main server component of the tw2gem ecosystem. It receives audio streams from Twilio calls, processes them, and forwards them to the Gemini Live API for AI processing. It integrates multiple components including the Twilio server, audio converter, and Gemini Live client.

## Installation

```bash
npm install @tw2gem/server
```

## Usage

For detailed usage examples and code samples, please visit our [examples repository](https://github.com/TianMaster93/tw2gem/tree/master/packages/examples).

## Features

- WebSocket server implementation
- Integration with Twilio media streams
- Audio processing and conversion
- Gemini Live API integration
- TypeScript support
- Real-time audio streaming

## Dependencies

- @tw2gem/twilio-server: 1.0.1
- @tw2gem/audio-converter: 1.0.1
- @tw2gem/gemini-live-client: 1.0.1
- ws: ^8.18.2

## License

MIT

## Author

Sebastian Morales Lorca (seba.morales.lorca@gmail.com) 