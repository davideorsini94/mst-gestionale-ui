import type { ReactNode } from 'react';
import { createHashRouter } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import RouteErrorPage from '../components/RouteErrorPage';
import { NotFoundPage, RequireCapability } from '../components/StatusPages';
import LoginPage from '../pages/Login/LoginPage';
import ResetPasswordPage from '../pages/Login/ResetPasswordPage';
import HomePage from '../pages/Home/HomePage';
import ProfilePage from '../pages/Profile/ProfilePage';
import UsersPage from '../pages/Users/UsersPage';
import RolesPage from '../pages/Roles/RolesPage';
import RoleDetailPage from '../pages/Roles/RoleDetailPage';
import SettingsPage from '../pages/Settings/SettingsPage';
import StaffPage from '../pages/Staff/StaffPage';
import StaffDetailPage from '../pages/Staff/StaffDetailPage';
import MembersPage from '../pages/Members/MembersPage';
import MemberDetailPage from '../pages/Members/MemberDetailPage';
import TransactionsPage from '../pages/Transactions/TransactionsPage';
import TransactionsMaintenancePage from '../pages/Transactions/TransactionsMaintenancePage';
import StatisticsPage from '../pages/Statistics/StatisticsPage';
import VehiclesPage from '../pages/Vehicles/VehiclesPage';
import VehicleDetailPage from '../pages/Vehicles/VehicleDetailPage';
import RemindersPage from '../pages/Reminders/RemindersPage';

// Capability richieste dalle API che ciascuna pagina usa (vedi i controller del backend)
const guard = (capability: string, element: ReactNode) => (
  <RequireCapability capability={capability}>{element}</RequireCapability>
);

export const authenticatedRouter = createHashRouter([
  // link dell'email di recupero aperto mentre si è già dentro l'app
  { path: '/reset-password', element: <ResetPasswordPage />, errorElement: <RouteErrorPage /> },
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        // errori nelle pagine: mostrati dentro il layout (la navigazione resta usabile)
        errorElement: <RouteErrorPage />,
        children: [
          // la Dashboard senza CAN_VIEW_DASHBOARD mostra solo il benvenuto (gestito nella pagina)
          { index: true, element: <HomePage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'users', element: guard('CAN_VIEW_USERS', <UsersPage />) },
          { path: 'roles', element: guard('CAN_MANAGE_ROLES', <RolesPage />) },
          { path: 'roles/:code', element: guard('CAN_MANAGE_ROLES', <RoleDetailPage />) },
          { path: 'settings', element: guard('CAN_MANAGE_SETTINGS', <SettingsPage />) },
          { path: 'staff', element: guard('CAN_VIEW_STAFF', <StaffPage />) },
          // il proprio profilo staff è accessibile anche senza CAN_VIEW_STAFF (controllo nella pagina)
          { path: 'staff/:uuid', element: <StaffDetailPage /> },
          { path: 'members', element: guard('CAN_VIEW_MEMBERS', <MembersPage />) },
          { path: 'members/:uuid', element: guard('CAN_VIEW_MEMBERS', <MemberDetailPage />) },
          { path: 'transactions', element: guard('CAN_VIEW_TRANSACTIONS', <TransactionsPage />) },
          {
            path: 'transactions/maintenance',
            element: guard('CAN_MANAGE_TRANSACTIONS', <TransactionsMaintenancePage />),
          },
          { path: 'statistics', element: guard('CAN_VIEW_STATISTICS', <StatisticsPage />) },
          { path: 'vehicles', element: guard('CAN_VIEW_VEHICLES', <VehiclesPage />) },
          { path: 'vehicles/:uuid', element: guard('CAN_VIEW_VEHICLES', <VehicleDetailPage />) },
          { path: 'reminders', element: guard('CAN_MANAGE_SETTINGS', <RemindersPage />) },
          // indirizzo inesistente: 404 dentro il layout (non la pagina "nuova versione disponibile")
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

export const unauthenticatedRouter = createHashRouter([
  { path: '/reset-password', element: <ResetPasswordPage />, errorElement: <RouteErrorPage /> },
  {
    path: '*',
    element: <LoginPage />,
    errorElement: <RouteErrorPage />,
  },
]);
