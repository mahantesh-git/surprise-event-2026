import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SocketProvider } from './contexts/SocketContext';
import './index.css';
import './styles/tactical-glass.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <SocketProvider>
      <App />
    </SocketProvider>
  </ErrorBoundary>,
);
