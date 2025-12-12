import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import itIT from 'antd/locale/it_IT';
import { authService } from './services/AuthService';
import { authenticatedRouter, unauthenticatedRouter } from './routes/Routes';

function App() {
  const isAuthenticated = authService.isAuthenticated();

  return (
    <ConfigProvider
      locale={itIT}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <RouterProvider
        router={isAuthenticated ? authenticatedRouter : unauthenticatedRouter}
      />
    </ConfigProvider>
  );
}

export default App;
