import { defineClient } from '../../../platform/client/types';
import type { View } from '../server';
import CategoriesPanel from './CategoriesPanel';
import Host from './Host';
import HowToPlay from './HowToPlay';
import Player from './Player';
import './guess-the.css';

export default defineClient<View>({ Host, Player, HowToPlay, HostLobbyPanel: CategoriesPanel });
