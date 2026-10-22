import '@ant-design/v5-patch-for-react-19';
import React from 'react';
import ReactDOM from 'react-dom/client';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ThemeProvider } from './theme/ThemeProvider';
import { registerServiceWorker } from './services/appUpdate';
import './index.css';

// calendari, mesi e giorni in italiano (settimana da lunedì); antd usa questo locale tramite ConfigProvider itIT
dayjs.locale('it');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

// Service worker PWA: cache solo /assets/*, update on focus, reload singolo su nuovo SW
registerServiceWorker();
