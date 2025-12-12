import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown, theme } from 'antd';
import {
  HomeOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  DollarOutlined,
  BarChartOutlined,
  CarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { authService } from '../services/AuthService';

const { Header, Sider, Content } = Layout;

// Mappa menu items con le capabilities richieste
const allMenuItems = [
  { key: '/', icon: <HomeOutlined />, label: 'Dashboard', capability: 'CAN_VIEW_DASHBOARD' },
  { key: '/users', icon: <UserOutlined />, label: 'Utenti', capability: 'CAN_VIEW_USERS' },
  { key: '/roles', icon: <SafetyCertificateOutlined />, label: 'Ruoli', capability: 'CAN_MANAGE_ROLES' },
  { key: '/staff', icon: <TeamOutlined />, label: 'Staff', capability: 'CAN_VIEW_STAFF' },
  { key: '/members', icon: <IdcardOutlined />, label: 'Tesserati', capability: 'CAN_VIEW_MEMBERS' },
  { key: '/transactions', icon: <DollarOutlined />, label: 'Movimenti', capability: 'CAN_VIEW_TRANSACTIONS' },
  { key: '/statistics', icon: <BarChartOutlined />, label: 'Statistiche', capability: 'CAN_VIEW_STATISTICS' },
  { key: '/vehicles', icon: <CarOutlined />, label: 'Veicoli', capability: 'CAN_VIEW_VEHICLES' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Impostazioni', capability: 'CAN_VIEW_SETTINGS' },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const user = authService.getUser();

  // Filtra menu items in base alle capabilities dell'utente
  const menuItems = allMenuItems.filter((item) =>
    authService.hasCapability(item.capability)
  );

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = () => {
    authService.logout();
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Esci',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{ background: token.colorBgContainer }}
      >
        <div className="p-4 text-center font-bold text-lg border-b border-gray-200">
          {collapsed ? 'MST' : 'MST Gestionale'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div className="flex items-center gap-2 cursor-pointer">
              <Avatar icon={<UserOutlined />} />
              <span>{user?.firstName || user?.username}</span>
            </div>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: 24,
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
