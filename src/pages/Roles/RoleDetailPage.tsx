import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Checkbox,
  Button,
  Space,
  Spin,
  Alert,
  Tag,
} from 'antd';
import { message } from '../../services/notify';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { apiService } from '../../services/ApiService';
import { useCapability } from '../../hooks/useAuth';
import { getErrorMessage } from '../../helpers/errors';

interface Capability {
  uuid: string;
  capability: string;
  roleCode: string;
}

interface Role {
  code: string;
  description?: string;
  capabilities?: Capability[];
}

// Lista delle capabilities disponibili con descrizioni
const CAPABILITY_DESCRIPTIONS: Record<string, string> = {
  CAN_MANAGE_USERS: 'Gestione utenti',
  CAN_VIEW_USERS: 'Visualizza utenti',
  CAN_MANAGE_ROLES: 'Gestione ruoli',
  CAN_MANAGE_CAPABILITIES: 'Gestione capabilities',
  CAN_MANAGE_MEMBERS: 'Gestione tesserati',
  CAN_VIEW_MEMBERS: 'Visualizza tesserati',
  CAN_MANAGE_STAFF: 'Gestione staff',
  CAN_VIEW_STAFF: 'Visualizza staff',
  CAN_MANAGE_TRANSACTIONS: 'Gestione transazioni',
  CAN_VIEW_TRANSACTIONS: 'Visualizza transazioni',
  CAN_VIEW_STATISTICS: 'Visualizza statistiche',
  CAN_MANAGE_VEHICLES: 'Gestione veicoli',
  CAN_VIEW_VEHICLES: 'Visualizza veicoli',
  CAN_MANAGE_CATEGORIES: 'Gestione categorie',
  CAN_VIEW_CATEGORIES: 'Visualizza categorie',
  CAN_MANAGE_SETTINGS: 'Gestione impostazioni',
  CAN_VIEW_SETTINGS: 'Visualizza impostazioni',
  // senza questa voce, salvando il ruolo il backup veniva tolto anche a chi lo aveva
  CAN_MANAGE_BACKUP: 'Backup e ripristino',
  CAN_VIEW_DASHBOARD: 'Visualizza dashboard',
};

const ALL_CAPABILITIES = Object.keys(CAPABILITY_DESCRIPTIONS);

/** Permessi sul denaro e sui backup: solo il ruolo admin (il server rifiuta di assegnarli ad altri ruoli). */
const ADMIN_ONLY = new Set([
  'CAN_VIEW_TRANSACTIONS',
  'CAN_MANAGE_TRANSACTIONS',
  'CAN_VIEW_STATISTICS',
  'CAN_VIEW_CATEGORIES',
  'CAN_MANAGE_CATEGORIES',
  'CAN_MANAGE_BACKUP',
]);

export default function RoleDetailPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  // salvare le capability di un ruolo richiede CAN_MANAGE_CAPABILITIES (oltre a CAN_MANAGE_ROLES per la pagina)
  const canManageCapabilities = useCapability('CAN_MANAGE_CAPABILITIES');

  useEffect(() => {
    if (code) {
      loadRole();
    }
  }, [code]);

  const loadRole = async () => {
    setLoading(true);
    try {
      const data = await apiService.get<Role>(`/roles/${code}`);
      setRole(data);
      // permessi riservati all'admin rimasti su un altro ruolo: non valgono e non si risalvano
      setSelectedCapabilities(
        (data.capabilities?.map((c) => c.capability) || []).filter((c) => data.code === 'admin' || !ADMIN_ONLY.has(c)),
      );
    } catch (error) {
      message.error('Errore nel caricamento del ruolo');
      navigate('/roles');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!role) return;
    setSaving(true);
    try {
      await apiService.post(`/capabilities/roles/${role.code}`, {
        capabilities: selectedCapabilities,
      });
      message.success('Capabilities salvate con successo');
      navigate('/roles');
    } catch (error) {
      message.error(getErrorMessage(error, 'Errore nel salvataggio delle capability'));
    } finally {
      setSaving(false);
    }
  };

  const handleCheckboxChange = (capability: string, checked: boolean) => {
    if (checked) {
      setSelectedCapabilities([...selectedCapabilities, capability]);
    } else {
      setSelectedCapabilities(selectedCapabilities.filter((c) => c !== capability));
    }
  };

  const isAdminRole = role?.code === 'admin';
  const assignable = (cap: string) => isAdminRole || !ADMIN_ONLY.has(cap);

  const selectAll = () => {
    setSelectedCapabilities(ALL_CAPABILITIES.filter(assignable));
  };

  const deselectAll = () => {
    setSelectedCapabilities([]);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const columns = [
    {
      title: 'Codice',
      dataIndex: 'code',
      key: 'code',
      width: 300,
    },
    {
      title: 'Descrizione',
      dataIndex: 'description',
      key: 'description',
      render: (description: string, record: { code: string }) => (
        <span>
          {description}
          {ADMIN_ONLY.has(record.code) && (
            <Tag className="ml-2" color="gold">
              Solo admin
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: 'Abilitato',
      key: 'enabled',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: { code: string }) => (
        <Checkbox
          disabled={!canManageCapabilities || !assignable(record.code)}
          aria-label={CAPABILITY_DESCRIPTIONS[record.code] || record.code}
          checked={selectedCapabilities.includes(record.code)}
          onChange={(e) => handleCheckboxChange(record.code, e.target.checked)}
        />
      ),
    },
  ];

  const dataSource = ALL_CAPABILITIES.map((cap) => ({
    key: cap,
    code: cap,
    description: CAPABILITY_DESCRIPTIONS[cap] || cap,
  }));

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/roles')}>
            Indietro
          </Button>
          <h1 className="text-2xl font-bold m-0">
            Ruolo: {role?.code}
          </h1>
        </div>
        {canManageCapabilities && (
          <Space wrap>
            <Button onClick={selectAll}>Seleziona tutti</Button>
            <Button onClick={deselectAll}>Deseleziona tutti</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
            >
              Salva
            </Button>
          </Space>
        )}
      </div>

      {role?.description && (
        <p className="text-gray-500 mb-4">{role.description}</p>
      )}

      {!isAdminRole && (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message="I permessi su movimenti, statistiche, voci di bilancio e backup sono riservati al ruolo admin"
          description="Tutto ciò che riguarda i soldi è visibile solo agli amministratori: questi permessi non si possono dare ad altri ruoli."
        />
      )}

      <Card>
        <Table
          columns={columns}
          dataSource={dataSource}
          scroll={{ x: 'max-content' }}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
