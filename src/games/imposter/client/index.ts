import { defineClient } from '../../../platform/client/types';
import type { ImposterView } from '../server';
import CategoriesPanel from './CategoriesPanel';
import Host from './Host';
import HowToPlay from './HowToPlay';
import Player from './Player';
import './imposter.css';

export default defineClient<ImposterView>({ Host, Player, HowToPlay, HostLobbyPanel: CategoriesPanel });
