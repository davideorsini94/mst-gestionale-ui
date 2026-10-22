import { createHashRouter } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import RouteErrorPage from '../components/RouteErrorPage';
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
          { index: true, element: <HomePage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'roles', element: <RolesPage /> },
          { path: 'roles/:code', element: <RoleDetailPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'staff', element: <StaffPage /> },
          { path: 'staff/:uuid', element: <StaffDetailPage /> },
          { path: 'members', element: <MembersPage /> },
          { path: 'members/:uuid', element: <MemberDetailPage /> },
          { path: 'transactions', element: <TransactionsPage /> },
          { path: 'transactions/maintenance', element: <TransactionsMaintenancePage /> },
          { path: 'statistics', element: <StatisticsPage /> },
          { path: 'vehicles', element: <VehiclesPage /> },
          { path: 'vehicles/:uuid', element: <VehicleDetailPage /> },
          { path: 'reminders', element: <RemindersPage /> },
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
