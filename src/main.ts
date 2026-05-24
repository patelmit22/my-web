import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';
import { DashboardApp } from './app';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root');

void new DashboardApp(root).start();
