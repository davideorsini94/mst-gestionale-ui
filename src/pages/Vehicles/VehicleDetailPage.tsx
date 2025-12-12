import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  message,
  Row,
  Col,
  Spin,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiService } from '../../services/ApiService';

interface Vehicle {
  uuid?: string;
  name: string;
  type: string;
  brand?: string;
  model?: string;
  licensePlate: string;
  seats?: number;
  year?: number;
  status: string;
  insuranceExpiry?: string;
  inspectionExpiry?: string;
  taxExpiry?: string;
  currentKm?: number;
  lastMaintenanceDate?: string;
  nextMaintenanceKm?: number;
  fuelConsumption?: number;
  fuelType?: string;
  notes?: string;
  assignedStaffUuid?: string;
}

interface Staff {
  uuid: string;
  firstName: string;
  lastName: string;
}

export default function VehicleDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const isNew = uuid === 'new';

  useEffect(() => {
    loadStaffList();
    if (!isNew && uuid) {
      loadVehicle();
    }
  }, [uuid]);

  const loadStaffList = async () => {
    try {
      const data = await apiService.get<[Staff[], number]>('/staff');
      setStaffList(data[0]);
    } catch (error) {
      console.error('Error loading staff list:', error);
    }
  };

  const loadVehicle = async () => {
    setLoading(true);
    try {
      const data = await apiService.get<Vehicle>(`/vehicles/${uuid}`);
      form.setFieldsValue({
        ...data,
        insuranceExpiry: data.insuranceExpiry ? dayjs(data.insuranceExpiry) : null,
        inspectionExpiry: data.inspectionExpiry ? dayjs(data.inspectionExpiry) : null,
        taxExpiry: data.taxExpiry ? dayjs(data.taxExpiry) : null,
        lastMaintenanceDate: data.lastMaintenanceDate ? dayjs(data.lastMaintenanceDate) : null,
      });
    } catch (error) {
      message.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        insuranceExpiry: values.insuranceExpiry
          ? (values.insuranceExpiry as dayjs.Dayjs).format('YYYY-MM-DD')
          : null,
        inspectionExpiry: values.inspectionExpiry
          ? (values.inspectionExpiry as dayjs.Dayjs).format('YYYY-MM-DD')
          : null,
        taxExpiry: values.taxExpiry
          ? (values.taxExpiry as dayjs.Dayjs).format('YYYY-MM-DD')
          : null,
        lastMaintenanceDate: values.lastMaintenanceDate
          ? (values.lastMaintenanceDate as dayjs.Dayjs).format('YYYY-MM-DD')
          : null,
      };

      if (isNew) {
        await apiService.post('/vehicles', payload);
        message.success('Veicolo creato');
      } else {
        await apiService.put(`/vehicles/${uuid}`, payload);
        message.success('Veicolo aggiornato');
      }
      navigate('/vehicles');
    } catch (error) {
      message.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vehicles')}>
          Indietro
        </Button>
        <h1 className="text-2xl font-bold">
          {isNew ? 'Nuovo Veicolo' : 'Dettaglio Veicolo'}
        </h1>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Card title="Informazioni Generali" className="mb-4">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="MINIBUS">Pulmino</Select.Option>
                  <Select.Option value="BUS">Bus</Select.Option>
                  <Select.Option value="VAN">Furgone</Select.Option>
                  <Select.Option value="CAR">Auto</Select.Option>
                  <Select.Option value="OTHER">Altro</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="licensePlate" label="Targa" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="brand" label="Marca">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="model" label="Modello">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="year" label="Anno">
                <InputNumber min={1900} max={2100} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="seats" label="Posti">
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="status" label="Stato" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="AVAILABLE">Disponibile</Select.Option>
                  <Select.Option value="IN_USE">In uso</Select.Option>
                  <Select.Option value="MAINTENANCE">Manutenzione</Select.Option>
                  <Select.Option value="OUT_OF_SERVICE">Fuori servizio</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="fuelType" label="Carburante">
                <Select>
                  <Select.Option value="DIESEL">Diesel</Select.Option>
                  <Select.Option value="PETROL">Benzina</Select.Option>
                  <Select.Option value="LPG">GPL</Select.Option>
                  <Select.Option value="ELECTRIC">Elettrico</Select.Option>
                  <Select.Option value="HYBRID">Ibrido</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="fuelConsumption" label="Consumo (L/100km)">
                <InputNumber min={0} precision={1} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="assignedStaffUuid" label="Assegnato a">
                <Select allowClear placeholder="Seleziona membro staff">
                  {staffList.map((staff) => (
                    <Select.Option key={staff.uuid} value={staff.uuid}>
                      {staff.firstName} {staff.lastName}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Scadenze Documenti" className="mb-4">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="insuranceExpiry" label="Scadenza Assicurazione">
                <DatePicker className="w-full" format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="inspectionExpiry" label="Scadenza Revisione">
                <DatePicker className="w-full" format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="taxExpiry" label="Scadenza Bollo">
                <DatePicker className="w-full" format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Manutenzione" className="mb-4">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="currentKm" label="Km Attuali">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="lastMaintenanceDate" label="Ultima Manutenzione">
                <DatePicker className="w-full" format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nextMaintenanceKm" label="Prossima Manutenzione (Km)">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Note" className="mb-4">
          <Form.Item name="notes">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Card>

        <div className="flex justify-end">
          <Button
            type="primary"
            icon={<SaveOutlined />}
            htmlType="submit"
            loading={saving}
          >
            Salva
          </Button>
        </div>
      </Form>
    </div>
  );
}
