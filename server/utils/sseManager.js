// Central SSE connection registry.
// Usage:
//   addClient(channelKey, res)   — register a response stream for a channel
//   broadcast(channelKey, eventName, data) — push to all clients on that channel

const channels = new Map(); // channelKey → Set<res>

export function addClient(channelKey, res) {
  if (!channels.has(channelKey)) channels.set(channelKey, new Set());
  channels.get(channelKey).add(res);
  res.on('close', () => channels.get(channelKey)?.delete(res));
}

export function broadcast(channelKey, eventName, data) {
  const clients = channels.get(channelKey);
  if (!clients?.size) return;
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
}
