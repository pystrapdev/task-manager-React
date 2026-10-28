import {createRoot} from 'react-dom/client';
import './styles.css';

const root = createRoot(document.getElementById('root')!);
const path = window.location.pathname;

if (path === '/auth/callback') {
 import('./AuthCallback').then(({default: AuthCallback}) => root.render(<AuthCallback/>));
} else if (path === '/forge') {
 import('./ForgeRecords').then(({default: ForgeRecords}) => root.render(<ForgeRecords/>));
} else {
 import('./App').then(({default: App}) => root.render(<App/>));
}
