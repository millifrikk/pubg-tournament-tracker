# Dependency Updates for PUBG Tournament Tracker

## Server Dependencies Update

Run the following command in the `server` directory to install new dependencies:

```bash
npm install socket.io@4.7.2 d3@7.8.5 recharts@2.9.0 --save
```

## Client Dependencies Update

Run the following command in the `client` directory to install new dependencies:

```bash
npm install socket.io-client@4.7.2 d3@7.8.5 recharts@2.9.0 --save
```

## Package.json Modifications

### Server Package.json

Update the server's package.json with the following dependencies:

```json
"dependencies": {
  ...existing dependencies...,
  "socket.io": "^4.7.2",
  "d3": "^7.8.5",
  "recharts": "^2.9.0"
}
```

### Client Package.json

Update the client's package.json with the following dependencies:

```json
"dependencies": {
  ...existing dependencies...,
  "socket.io-client": "^4.7.2",
  "d3": "^7.8.5",
  "recharts": "^2.9.0"
}
```

## After Installing Dependencies

After installing the dependencies, restart both the server and client applications:

```bash
# In the server directory
npm run dev

# In the client directory
npm start
```

## Verify Socket.IO Connection

To verify that the WebSocket connection is working correctly, check the browser console for:

```
Socket connected
```

And the server console for:

```
User connected: [socket-id]
```

These log messages indicate that the real-time functionality has been successfully implemented.
