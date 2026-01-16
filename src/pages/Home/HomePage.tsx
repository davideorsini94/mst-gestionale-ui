import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, List, Tag, Spin, Select, Alert, Button, Grid } from 'antd';
import {
  TeamOutlined,
  CarOutlined,
  WarningOutlined,
  UserOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/ApiService';
import { authService } from '../../services/AuthService';

const { useBreakpoint } = Grid;

interface VehicleExpiry {
  uuid: string;
  name: string;
  licensePlate: string;
}

interface VehicleExpiries {
  insurance: VehicleExpiry[];
  inspection: VehicleExpiry[];
  tax: VehicleExpiry[];
}

interface PersonalExpiry {
  field: string;
  label: string;
  date: string;
}

interface AdminDashboard {
  type: 'admin';
  stats: {
    totalStaff: number;
    totalMembers: number;
  };
  vehicleExpiries: VehicleExpiries;
}

interface StaffDashboard {
  type: 'staff';
  staff: {
    uuid: string;
    firstName: string;
    lastName: string;
  };
  personalExpiries: PersonalExpiry[];
  assignedVehicles: VehicleExpiry[];
  vehicleExpiries: VehicleExpiries;
  message?: string;
}

interface UserDashboard {
  type: 'user';
  message: string;
}

type DashboardData = AdminDashboard | StaffDashboard | UserDashboard;

export default function HomePage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [expiryDays, setExpiryDays] = useState(30);
  const user = authService.getUser();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [expiryDays]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiService.get<DashboardData>(`/dashboard?daysAhead=${expiryDays}`);
      setDashboard(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  // Dashboard Admin
  if (dashboard?.type === 'admin') {
    const expiring = dashboard.vehicleExpiries;
    const expiringItems = [
      ...(expiring?.insurance || []).map((v) => ({ ...v, type: 'Assicurazione', color: 'red' })),
      ...(expiring?.inspection || []).map((v) => ({ ...v, type: 'Revisione', color: 'orange' })),
      ...(expiring?.tax || []).map((v) => ({ ...v, type: 'Bollo', color: 'gold' })),
    ];

    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Dashboard Amministratore</h1>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Staff"
                value={dashboard.stats.totalStaff}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Tesserati"
                value={dashboard.stats.totalMembers}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Scadenze veicoli"
                value={expiringItems.length}
                prefix={<WarningOutlined style={{ color: '#faad14' }} />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="mt-4">
          <Col xs={24}>
            <Card
              title={
                <div className="flex justify-between items-center">
                  <span>
                    <WarningOutlined className="mr-2" style={{ color: '#faad14' }} />
                    Scadenze veicoli
                  </span>
                  <Select
                    value={expiryDays}
                    onChange={setExpiryDays}
                    size="small"
                    style={{ width: 120 }}
                  >
                    <Select.Option value={7}>7 giorni</Select.Option>
                    <Select.Option value={15}>15 giorni</Select.Option>
                    <Select.Option value={30}>30 giorni</Select.Option>
                    <Select.Option value={60}>60 giorni</Select.Option>
                    <Select.Option value={90}>90 giorni</Select.Option>
                  </Select>
                </div>
              }
            >
              {expiringItems.length > 0 ? (
                <List
                  size="small"
                  dataSource={expiringItems}
                  renderItem={(item) => (
                    <List.Item>
                      <span>
                        {item.name} ({item.licensePlate})
                      </span>
                      <Tag color={item.color}>{item.type}</Tag>
                    </List.Item>
                  )}
                />
              ) : (
                <p className="text-gray-500">Nessuna scadenza imminente</p>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // Dashboard Staff
  if (dashboard?.type === 'staff') {
    const expiring = dashboard.vehicleExpiries;
    const vehicleExpiringItems = [
      ...(expiring?.insurance || []).map((v) => ({ ...v, type: 'Assicurazione', color: 'red' })),
      ...(expiring?.inspection || []).map((v) => ({ ...v, type: 'Revisione', color: 'orange' })),
      ...(expiring?.tax || []).map((v) => ({ ...v, type: 'Bollo', color: 'gold' })),
    ];

    return (
      <div>
        <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between items-center'} mb-6`}>
          <h1 className="text-xl md:text-2xl font-bold">
            Ciao, {dashboard.staff.firstName} {dashboard.staff.lastName}
          </h1>
          {!dashboard.message && (
            <Button type="primary" size={isMobile ? 'middle' : 'large'} onClick={() => navigate(`/staff/${dashboard.staff.uuid}`)}>
              {isMobile ? 'Modifica profilo' : 'Modifica il mio profilo'}
            </Button>
          )}
        </div>

        {dashboard.message && (
          <Alert
            message="Profilo non collegato"
            description={dashboard.message}
            type="info"
            showIcon
            className="mb-4"
          />
        )}

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <span>
                  <CalendarOutlined className="mr-2" />
                  Le tue scadenze personali
                </span>
              }
            >
              {dashboard.personalExpiries.length > 0 ? (
                <List
                  size="small"
                  dataSource={dashboard.personalExpiries}
                  renderItem={(item) => (
                    <List.Item>
                      <span>{item.label}</span>
                      <Tag color="orange">
                        {new Date(item.date).toLocaleDateString('it-IT')}
                      </Tag>
                    </List.Item>
                  )}
                />
              ) : (
                <p className="text-gray-500">Nessuna scadenza personale imminente</p>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title={
                <span>
                  <CarOutlined className="mr-2" />
                  Veicoli assegnati ({dashboard.assignedVehicles.length})
                </span>
              }
            >
              {dashboard.assignedVehicles.length > 0 ? (
                <List
                  size="small"
                  dataSource={dashboard.assignedVehicles}
                  renderItem={(item) => (
                    <List.Item>
                      <span>{item.name}</span>
                      <Tag>{item.licensePlate}</Tag>
                    </List.Item>
                  )}
                />
              ) : (
                <p className="text-gray-500">Nessun veicolo assegnato</p>
              )}
            </Card>
          </Col>
        </Row>

        {vehicleExpiringItems.length > 0 && (
          <Row gutter={[16, 16]} className="mt-4">
            <Col xs={24}>
              <Card
                title={
                  <span>
                    <WarningOutlined className="mr-2" style={{ color: '#faad14' }} />
                    Scadenze veicoli assegnati
                  </span>
                }
              >
                <List
                  size="small"
                  dataSource={vehicleExpiringItems}
                  renderItem={(item) => (
                    <List.Item>
                      <span>
                        {item.name} ({item.licensePlate})
                      </span>
                      <Tag color={item.color}>{item.type}</Tag>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        )}
      </div>
    );
  }

  // Dashboard User base
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <Alert
        message="Benvenuto"
        description={`Ciao ${user?.firstName || user?.username}, sei connesso come utente base.`}
        type="info"
        showIcon
      />
    </div>
  );
}
