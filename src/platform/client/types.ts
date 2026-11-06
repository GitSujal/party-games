import type { ComponentType } from 'react';
import type { GameMeta, Role, RoomView } from '../sdk';
import type { SendAction } from './useRoom';

/** Props every game screen receives from the platform shell. */
export interface GameScreenProps<G = unknown> {
    room: RoomView;
    /** This viewer's game view (whatever the server's view() returned). */
    game: G;
    meta: GameMeta;
    /** Send a game action; resolves on ack, rejects with the server's message. */
    send: SendAction;
}

/** A game's client module — the default export of games/<id>/client/index.ts. */
export interface GameClient<G = any> {
    /** Host display while playing (usually the TV / laptop). */
    Host: ComponentType<GameScreenProps<G>>;
    /** Player phone while playing. */
    Player: ComponentType<GameScreenProps<G>>;
    /** Rules, shown from the shell's "How to play" button. */
    HowToPlay?: ComponentType<{ role: Role; game: G | null }>;
    /** Extra host controls rendered next to the lobby (e.g. character casting). */
    HostLobbyPanel?: ComponentType<GameScreenProps<G>>;
    /** Replaces the default "you're in" screen on phones while in the lobby. */
    PlayerLobby?: ComponentType<GameScreenProps<G>>;
}

export function defineClient<G>(client: GameClient<G>): GameClient<G> {
    return client;
}
