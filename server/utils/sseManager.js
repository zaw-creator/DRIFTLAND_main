// Central SSE connection registry.
// Usage:
//   addClient(channelKey, res)   — register a response stream for a channel
//   broadcast(channelKey, eventName, data) — push to all clients on that channel

const channels = new Map(); // channelKey → Set<res>

export function addClient(channelKey, res) {
  if (!channels.has(channelKey)) channels.set(channelKey, new Set());
  channels.get(channelKey).add(res);

  // Cleanup when the user closes the tab or connection drops
  res.on("close", () => channels.get(channelKey)?.delete(res));
}

export function broadcast(channelKey, eventName, data) {
  const clients = channels.get(channelKey);
  if (!clients?.size) return;
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
}

// 🫀 THE HEARTBEAT: Runs continuously in the background
// Sends a standard SSE comment (starting with a colon) every 20 seconds.
// The frontend browser ignores comments, but it keeps the TCP connection alive!
setInterval(() => {
  channels.forEach((clients) => {
    for (const res of clients) {
      // The payload must end with \n\n to be a valid SSE message
      res.write(": ping\n\n");
    }
  });
}, 20000);
