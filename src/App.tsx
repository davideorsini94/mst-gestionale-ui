import { useEffect, useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import { App as AntApp, ConfigProvider } from 'antd';
import itIT from 'antd/locale/it_IT';
import { authService } from './services/AuthService';
import { authenticatedRouter, unauthenticatedRouter } from './routes/Routes';
import { useThemePrefs } from './theme/ThemeProvider';
import { buildAntdTheme } from './theme/antdTheme';
import { setMessageApi } from './services/notify';

/** Collega `message` di App.useApp() all'helper services/notify (toast a tema). */
function NotifyBridge() {
  const { message } = AntApp.useApp();
  useEffect(() => {
    setMessageApi(message);
    return () => setMessageApi(null);
  }, [message]);
  return null;
}

function App() {
  const isAuthenticated = authService.isAuthenticated();
  const { resolved, highContrast, reduceMotion } = useThemePrefs();

  const theme = useMemo(
    () => buildAntdTheme(resolved, { highContrast, reduceMotion }),
    [resolved, highContrast, reduceMotion],
  );

  return (
    <ConfigProvider locale={itIT} theme={theme}>
      <AntApp className="mst-app">
        {/* prima del router: il suo effect gira prima di quelli delle pagine */}
        <NotifyBridge />
        <RouterProvider
          router={isAuthenticated ? authenticatedRouter : unauthenticatedRouter}
        />
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
