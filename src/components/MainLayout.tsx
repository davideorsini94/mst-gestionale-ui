import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown, theme, Drawer, Grid } from 'antd';
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
  BellOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { authService } from '../services/AuthService';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

// Mappa menu items con le capabilities richieste (null = accessibile a tutti)
const allMenuItems = [
  { key: '/', icon: <HomeOutlined />, label: 'Dashboard', capability: 'CAN_VIEW_DASHBOARD' },
  { key: '/profile', icon: <UserOutlined />, label: 'Profilo', capability: null },
  { key: '/users', icon: <TeamOutlined />, label: 'Utenti', capability: 'CAN_VIEW_USERS' },
  { key: '/roles', icon: <SafetyCertificateOutlined />, label: 'Ruoli', capability: 'CAN_MANAGE_ROLES' },
  { key: '/staff', icon: <TeamOutlined />, label: 'Staff', capability: 'CAN_VIEW_STAFF' },
  { key: '/members', icon: <IdcardOutlined />, label: 'Tesserati', capability: 'CAN_VIEW_MEMBERS' },
  { key: '/transactions', icon: <DollarOutlined />, label: 'Movimenti', capability: 'CAN_VIEW_TRANSACTIONS' },
  { key: '/statistics', icon: <BarChartOutlined />, label: 'Statistiche', capability: 'CAN_VIEW_STATISTICS' },
  { key: '/vehicles', icon: <CarOutlined />, label: 'Veicoli', capability: 'CAN_VIEW_VEHICLES' },
  { key: '/reminders', icon: <BellOutlined />, label: 'Reminder', capability: 'CAN_MANAGE_SETTINGS' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Impostazioni', capability: 'CAN_MANAGE_SETTINGS' },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const user = authService.getUser();
  const screens = useBreakpoint();

  // Determina se siamo su mobile (< md breakpoint)
  const isMobile = !screens.md;

  // Chiudi drawer quando cambia la route
  useEffect(() => {
    setDrawerVisible(false);
  }, [location.pathname]);

  // Filtra menu items in base alle capabilities dell'utente (null = accessibile a tutti)
  const menuItems = allMenuItems.filter((item) =>
    item.capability === null || authService.hasCapability(item.capability)
  );

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile) {
      setDrawerVisible(false);
    }
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

  const siderContent = (
    <>
      <div className="p-4 text-center font-bold text-lg border-b border-gray-200">
        {collapsed && !isMobile ? 'MST' : 'MST Gestionale'}
      </div>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ borderRight: 0 }}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100dvh' }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{ background: token.colorBgContainer }}
          width={220}
          collapsedWidth={80}
        >
          {siderContent}
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          width={280}
          styles={{ body: { padding: 0 } }}
          title="MST Gestionale"
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderRight: 0 }}
          />
        </Drawer>
      )}

      <Layout>
        <Header
          style={{
            padding: isMobile ? '0 12px' : '0 24px',
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: isMobile ? 'sticky' : 'relative',
            top: 0,
            zIndex: 10,
            boxShadow: isMobile ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <Button
            type="text"
            icon={isMobile ? <MenuOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
            onClick={() => isMobile ? setDrawerVisible(true) : setCollapsed(!collapsed)}
            style={{ fontSize: 18 }}
          />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div className="flex items-center gap-2 cursor-pointer">
              <Avatar icon={<UserOutlined />} size={isMobile ? 'small' : 'default'} />
              {!isMobile && <span>{user?.firstName || user?.username}</span>}
            </div>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: isMobile ? '12px' : '24px',
            padding: isMobile ? 12 : 24,
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            minHeight: 280,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
