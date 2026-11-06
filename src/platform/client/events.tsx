import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import type { GameEvent } from '../sdk';

type Listener = (event: GameEvent) => void;

export class EventBus {
    private listeners = new Set<Listener>();
    emit = (event: GameEvent) => this.listeners.forEach(l => l(event));
    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}

const EventContext = createContext<EventBus | null>(null);

export function EventProvider({ bus, children }: { bus: EventBus; children: ReactNode }) {
    return <EventContext.Provider value={bus}>{children}</EventContext.Provider>;
}

/** Run `handler` whenever the server emits an event of `type` (e.g. "confetti"). */
export function useGameEvent(type: string, handler: (event: GameEvent) => void): void {
    const bus = useContext(EventContext);
    const ref = useRef(handler);
    ref.current = handler;
    useEffect(() => bus?.subscribe(e => e.type === type && ref.current(e)), [bus, type]);
}
