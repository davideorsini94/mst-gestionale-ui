import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown, Drawer, Grid, type MenuProps } from 'antd';
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
  SunOutlined,
  MoonOutlined,
  DesktopOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { authService } from '../services/AuthService';
import { useThemePrefs } from '../theme/ThemeProvider';
import type { ThemeMode } from '../theme/preferences';
import clubLogo from '../assets/logo-milano-ski-team.png';

const { Sider, Content } = Layout;
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

const themeOptions: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'light', label: 'Chiaro', icon: <SunOutlined /> },
  { mode: 'dark', label: 'Scuro', icon: <MoonOutlined /> },
  { mode: 'system', label: 'Automatico', icon: <DesktopOutlined /> },
];

/** Stemma del club in fondo alla navigazione (contenuto della sidebar, non un controllo: nessun vetro). */
function ClubLogo({ compact }: { compact: boolean }) {
  return (
    <div className={`mst-club-logo${compact ? ' mst-club-logo--compact' : ''}`}>
      <img src={clubLogo} alt="Milano Ski Team" draggable={false} />
    </div>
  );
}

function BrandMark({ compact }: { compact: boolean }) {
  return (
    <div className={`mst-brand ${compact ? 'mst-brand--compact' : ''}`}>
      <img className="mst-brand-icon" src="/icon.svg" alt="" aria-hidden="true" draggable={false} />
      {!compact && <span className="mst-brand-name">MST Gestionale</span>}
    </div>
  );
}

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getUser();
  const screens = useBreakpoint();
  const { mode, setMode } = useThemePrefs();

  // Determina se siamo su mobile (< md breakpoint)
  const isMobile = !screens.md;

  // Chiudi drawer quando cambia la route
  useEffect(() => {
    setDrawerVisible(false);
  }, [location.pathname]);

  // Filtra menu items in base alle capabilities dell'utente (null = accessibile a tutti)
  const menuItems = allMenuItems
    .filter((item) => item.capability === null || authService.hasCapability(item.capability))
    .map(({ key, icon, label }) => ({ key, icon, label }));

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile) {
      setDrawerVisible(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
  };

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'Utente';

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'theme',
      type: 'group',
      label: 'Tema',
      children: themeOptions.map((opt) => ({
        key: `theme:${opt.mode}`,
        icon: opt.icon,
        label: (
          <span className="mst-menu-check">
            {opt.label}
            {mode === opt.mode && <CheckOutlined aria-hidden="true" />}
          </span>
        ),
      })),
    },
    { type: 'divider' },
    { key: 'profile', icon: <UserOutlined />, label: 'Profilo' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Esci', danger: true },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key.startsWith('theme:')) {
      setMode(key.slice('theme:'.length) as ThemeMode);
    } else if (key === 'profile') {
      navigate('/profile');
    } else if (key === 'logout') {
      handleLogout();
    }
  };

  const navMenu = (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={handleMenuClick}
      className="mst-nav-menu"
    />
  );

  return (
    <Layout className="mst-shell" hasSider={!isMobile}>
      {/* Desktop Sidebar — vetro flottante staccato dai bordi */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={232}
          collapsedWidth={80}
          theme="light"
          className="mst-sider"
          aria-label="Navigazione principale"
        >
          <BrandMark compact={collapsed} />
          <nav className="mst-sider-nav">{navMenu}</nav>
          <ClubLogo compact={collapsed} />
        </Sider>
      )}

      {/* Mobile Drawer — pannello vetro */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          width={280}
          rootClassName="mst-nav-drawer"
          styles={{ body: { padding: 0 } }}
          title={<BrandMark compact={false} />}
          closable={{ 'aria-label': 'Chiudi menu' }}
          footer={<ClubLogo compact={false} />}
        >
          <nav aria-label="Navigazione principale">{navMenu}</nav>
        </Drawer>
      )}

      <Layout className="mst-main">
        {/* Barra superiore flottante (capsula) + scroll-edge effect */}
        <div className="mst-header-wrap">
          <header className="mst-toolbar">
            <Button
              type="text"
              shape="circle"
              className="mst-nav-btn"
              icon={isMobile ? <MenuOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
              onClick={() => (isMobile ? setDrawerVisible(true) : setCollapsed(!collapsed))}
              aria-label={isMobile ? 'Apri menu di navigazione' : (collapsed ? 'Espandi barra laterale' : 'Comprimi barra laterale')}
              aria-expanded={isMobile ? drawerVisible : !collapsed}
            />
            {isMobile && <span className="mst-toolbar-title">MST Gestionale</span>}
            <div className="mst-toolbar-spacer" />
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button
                type="text"
                className="mst-nav-btn mst-user-btn"
                aria-label={`Menu utente: ${displayName}`}
              >
                <Avatar icon={<UserOutlined />} size={isMobile ? 28 : 32} />
                {!isMobile && <span className="mst-user-name">{user?.firstName || user?.username}</span>}
              </Button>
            </Dropdown>
          </header>
        </div>
        <Content className="mst-content">
          <div className="mst-content-surface">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
