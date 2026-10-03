type Listener = () => void

const listeners = new Map<string, Set<Listener>>()
let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!channel) {
    channel = new BroadcastChannel('lifeos')
    channel.onmessage = () => {
      for (const set of listeners.values()) for (const l of set) l()
    }
  }
  return channel
}

export function subscribe(scope: string, cb: Listener): () => void {
  if (!listeners.has(scope)) listeners.set(scope, new Set())
  listeners.get(scope)!.add(cb)
  return () => listeners.get(scope)!.delete(cb)
}

export function publish(scope = 'data'): void {
  getChannel()?.postMessage({ scope })
  for (const set of listeners.values()) for (const l of set) l()
}
