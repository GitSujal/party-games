import { defineClient } from '../../../platform/client/types';
import CastingPanel from './CastingPanel';
import Host from './Host';
import HowToPlay from './HowToPlay';
import Player from './Player';
import './momo.css';
import type { View } from './shared';

export default defineClient<View>({ Host, Player, HowToPlay, HostLobbyPanel: CastingPanel });
