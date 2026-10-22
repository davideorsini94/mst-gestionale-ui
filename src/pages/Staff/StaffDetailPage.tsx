import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Row,
  Col,
  Divider,
  Spin,
  Switch,
  Upload,
  List,
  Popconfirm,
  Avatar,
  Result,
} from 'antd';
import { message } from '../../services/notify';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  UploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UserOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiService } from '../../services/ApiService';
import ImageCropModal from '../../components/ImageCropModal';
import { ForbiddenPage, NotFoundPage } from '../../components/StatusPages';
import { useCapability } from '../../hooks/useAuth';
import { emptyToNull, getErrorMessage, getErrorStatus } from '../../helpers/errors';
import { isUuid } from '../../helpers/uuid';

interface FileEntity {
  uuid: string;
  originalName: string;
  minioPath: string;
  mimeType: string;
  size: number;
  fileType: string;
}

interface StaffDocument {
  uuid: string;
  documentType: string;
  description?: string;
  createdAt: string;
  file: FileEntity;
  fileUuid: string;
}

interface Staff {
  uuid?: string;
  firstName: string;
  lastName: string;
  gender?: string;
  fiscalCode?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  birthDate?: string;
  birthPlace?: string;
  staffRole: string;
  status: string;
  hireDate?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
  profileImageUuid?: string;
  profileImage?: FileEntity;
  linkedUserUuid?: string;
  drivingLicense?: string;
  drivingLicenseExpiry?: string;
  skiInstructorLicense?: string;
  skiInstructorLicenseExpiry?: string;
  firstAidCertificate?: string;
  firstAidCertificateExpiry?: string;
  isCoach?: boolean;
  coachLevel?: string;
  coachLicenseExpiry?: string;
  medicalExamExpiry?: string;
  documents?: StaffDocument[];
}

interface User {
  uuid: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

const documentTypeLabels: Record<string, string> = {
  MEDICAL_EXAM: 'Visita Medica',
  COACH_LICENSE: 'Patentino Allenatore',
  DRIVING_LICENSE: 'Patente',
  FIRST_AID: 'Primo Soccorso',
  OTHER: 'Altro',
};

export default function StaffDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [documents, setDocuments] = useState<StaffDocument[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>('MEDICAL_EXAM');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [profileImageBlobUrl, setProfileImageBlobUrl] = useState<string | null>(null);
  const isNew = uuid === 'new';
  const canManageStaff = useCapability('CAN_MANAGE_STAFF');
  const canViewStaff = useCapability('CAN_VIEW_STAFF');
  // Senza CAN_MANAGE_STAFF si può modificare solo il proprio profilo (PUT /staff/me): salvare la scheda di un
  // collega sovrascriverebbe il proprio profilo con i suoi dati
  const [ownStaffUuid, setOwnStaffUuid] = useState<string | null>(null);
  const canSave = canManageStaff || (!!ownStaffUuid && ownStaffUuid === uuid);
  /** 'forbidden': scheda di un altro senza CAN_VIEW_STAFF; 'notFound': uuid inesistente; 'error': "Riprova" */
  const [loadState, setLoadState] = useState<'ok' | 'forbidden' | 'notFound' | 'error'>('ok');

  useEffect(() => {
    if (canManageStaff) {
      loadUsers();
    } else if (canViewStaff) {
      apiService
        .get<{ uuid?: string }>('/staff/me')
        .then((me) => setOwnStaffUuid(me?.uuid ?? null))
        .catch(() => setOwnStaffUuid(null));
    }
    if (!isNew && !isUuid(uuid)) {
      setLoadState('notFound');
    } else if (!isNew && uuid) {
      loadStaff();
    }
    // Cleanup blob URL on unmount
    return () => {
      if (profileImageBlobUrl) {
        URL.revokeObjectURL(profileImageBlobUrl);
      }
    };
  }, [uuid]);

  const loadUsers = async () => {
    try {
      const data = await apiService.get<[User[], number]>('/users');
      setUsers(data[0]);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadStaff = async () => {
    setLoading(true);
    try {
      let data: Staff | null;
      if (canViewStaff) {
        data = await apiService.get<Staff>(`/staff/${uuid}`);
      } else {
        // senza CAN_VIEW_STAFF si apre solo il proprio profilo, letto da /staff/me
        const own = await apiService.get<Staff & { found?: boolean }>('/staff/me');
        if (!own?.uuid || own.uuid !== uuid) {
          setLoadState('forbidden');
          return;
        }
        setOwnStaffUuid(own.uuid);
        data = own;
      }
      if (!data) {
        setLoadState('notFound');
        return;
      }
      setLoadState('ok');
      setStaff(data);
      setDocuments(data.documents || []);
      form.setFieldsValue({
        ...data,
        birthDate: data.birthDate ? dayjs(data.birthDate) : null,
        hireDate: data.hireDate ? dayjs(data.hireDate) : null,
        drivingLicenseExpiry: data.drivingLicenseExpiry
          ? dayjs(data.drivingLicenseExpiry)
          : null,
        skiInstructorLicenseExpiry: data.skiInstructorLicenseExpiry
          ? dayjs(data.skiInstructorLicenseExpiry)
          : null,
        firstAidCertificateExpiry: data.firstAidCertificateExpiry
          ? dayjs(data.firstAidCertificateExpiry)
          : null,
        coachLicenseExpiry: data.coachLicenseExpiry
          ? dayjs(data.coachLicenseExpiry)
          : null,
        medicalExamExpiry: data.medicalExamExpiry
          ? dayjs(data.medicalExamExpiry)
          : null,
      });
      // Carica immagine profilo se presente
      if (data.profileImageUuid) {
        loadProfileImage();
      }
    } catch (error) {
      setLoadState(getErrorStatus(error) === 404 ? 'notFound' : 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadProfileImage = async () => {
    try {
      const blob = await apiService.getBlob(`/staff/${uuid}/profile-image`);
      // Revoca URL precedente se esiste
      if (profileImageBlobUrl) {
        URL.revokeObjectURL(profileImageBlobUrl);
      }
      const blobUrl = URL.createObjectURL(blob);
      setProfileImageBlobUrl(blobUrl);
    } catch (error) {
      console.error('Errore nel caricamento immagine profilo:', error);
    }
  };

  const handleSave = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const formatDate = (val: unknown) =>
        val ? (val as dayjs.Dayjs).format('YYYY-MM-DD') : null;

      const payload = {
        ...values,
        // email vuota → null (una stringa vuota non è un'email valida per il backend)
        email: emptyToNull(values.email),
        // select svuotate con la ✕: il valore diventa undefined e sparirebbe dal JSON (il backend terrebbe il vecchio)
        ...(canManageStaff ? { linkedUserUuid: values.linkedUserUuid ?? null } : {}),
        coachLevel: values.coachLevel ?? null,
        birthDate: formatDate(values.birthDate),
        hireDate: formatDate(values.hireDate),
        drivingLicenseExpiry: formatDate(values.drivingLicenseExpiry),
        skiInstructorLicenseExpiry: formatDate(values.skiInstructorLicenseExpiry),
        firstAidCertificateExpiry: formatDate(values.firstAidCertificateExpiry),
        coachLicenseExpiry: formatDate(values.coachLicenseExpiry),
        medicalExamExpiry: formatDate(values.medicalExamExpiry),
      };

      if (isNew) {
        await apiService.post('/staff', payload);
        message.success('Membro staff creato');
      } else {
        // Se l'utente non ha CAN_MANAGE_STAFF, usa l'endpoint /staff/me (solo sul proprio profilo)
        if (!canSave) {
          message.error('Puoi modificare solo il tuo profilo staff');
          return;
        }
        if (canManageStaff) {
          await apiService.put(`/staff/${uuid}`, payload);
        } else {
          await apiService.put('/staff/me', payload);
        }
        message.success('Membro staff aggiornato');
      }
      navigate(canViewStaff ? '/staff' : '/');
    } catch (error) {
      message.error(getErrorMessage(error, 'Errore nel salvataggio del membro staff'));
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPhoto = (file: File) => {
    setSelectedImageFile(file);
    setCropModalOpen(true);
    return false;
  };

  const handleUserChange = (userUuid: string | undefined) => {
    if (!userUuid) {
      return;
    }
    const selectedUser = users.find((u) => u.uuid === userUuid);
    if (selectedUser) {
      form.setFieldsValue({
        firstName: selectedUser.firstName || form.getFieldValue('firstName'),
        lastName: selectedUser.lastName || form.getFieldValue('lastName'),
        email: selectedUser.email || form.getFieldValue('email'),
        phone: selectedUser.phone || form.getFieldValue('phone'),
      });
    }
  };

  const handleCropComplete = async (croppedBlob: Blob, filename: string) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', new File([croppedBlob], filename, { type: 'image/jpeg' }));

      await apiService.post(`/staff/${uuid}/profile-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('Foto caricata');
      loadStaff();
    } catch (error: any) {
      const errorMsg = getErrorMessage(error, 'Errore nel caricamento della foto');
      message.error(errorMsg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeleteProfileImage = async () => {
    try {
      await apiService.delete(`/staff/${uuid}/profile-image`);
      message.success('Foto eliminata');
      setProfileImageBlobUrl(null);
      loadStaff();
    } catch (error: any) {
      const errorMsg = getErrorMessage(error, 'Errore eliminazione foto');
      message.error(errorMsg);
    }
  };

  const handleUploadDocument = async (file: File) => {
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', selectedDocType);

      await apiService.post(`/staff/${uuid}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('Documento caricato');
      loadStaff();
    } catch (error: any) {
      const errorMsg = getErrorMessage(error, 'Errore nel caricamento del documento');
      message.error(errorMsg);
    } finally {
      setUploadingDoc(false);
    }
    return false;
  };

  const handleDownloadDocument = async (doc: StaffDocument) => {
    try {
      // Usa l'endpoint generico /files/:uuid per il download
      const blob = await apiService.getBlob(`/files/${doc.fileUuid}/download`);
      const fileName = doc.file?.originalName || 'documento';
      
      // Crea link temporaneo per download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      const errorMsg = getErrorMessage(error, 'Errore nel download');
      message.error(errorMsg);
    }
  };

  const handleDeleteDocument = async (documentUuid: string) => {
    try {
      await apiService.delete(`/staff/documents/${documentUuid}`);
      message.success('Documento eliminato');
      loadStaff();
    } catch (error: any) {
      const errorMsg = getErrorMessage(error, 'Errore nella eliminazione');
      message.error(errorMsg);
    }
  };

  if ((isNew && !canManageStaff) || loadState === 'forbidden') {
    return <ForbiddenPage />;
  }

  if (loadState === 'notFound') {
    return (
      <NotFoundPage
        title="Membro staff non trovato"
        subTitle="La scheda non esiste o è stata eliminata."
        backTo={canViewStaff ? '/staff' : '/'}
        backLabel={canViewStaff ? 'Torna allo staff' : 'Torna alla Dashboard'}
      />
    );
  }

  if (loadState === 'error' && !loading) {
    return (
      <Result
        status="error"
        title="Impossibile caricare la scheda"
        subTitle="Controlla la connessione e riprova."
        extra={[
          <Button key="retry" type="primary" onClick={loadStaff}>
            Riprova
          </Button>,
          <Button key="back" onClick={() => navigate(canViewStaff ? '/staff' : '/')}>
            Indietro
          </Button>,
        ]}
      />
    );
  }

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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(canViewStaff ? '/staff' : '/')}>
          Indietro
        </Button>
        <h1 className="text-2xl font-bold">
          {isNew ? 'Nuovo Membro Staff' : 'Dettaglio Staff'}
        </h1>
      </div>

      {/* chi non può salvare (scheda di un collega senza CAN_MANAGE_STAFF) la vede in sola lettura */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        disabled={!isNew && !canSave}
        // porta in vista il primo campo con errore (scorrimento immediato: rispetta "riduci movimento")
        scrollToFirstError={{ block: 'center', focus: true }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={24} md={18}>
            {/* Dati Anagrafici */}
            <Card title="Dati Anagrafici" className="mb-4">
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="firstName" label="Nome" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="lastName" label="Cognome" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="gender" label="Sesso">
                    <Select>
                      <Select.Option value="M">Maschio</Select.Option>
                      <Select.Option value="F">Femmina</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="fiscalCode" label="Codice Fiscale">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="birthDate" label="Data di Nascita">
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="birthPlace" label="Luogo di Nascita">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Contatti */}
            <Card title="Contatti" className="mb-4">
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="email" label="Email">
                    <Input type="email" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="phone" label="Telefono">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} sm={24} md={12}>
                  <Form.Item name="address" label="Indirizzo">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={12} md={4}>
                  <Form.Item name="city" label="Città">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={12} md={4}>
                  <Form.Item name="postalCode" label="CAP">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Divider>Contatto di Emergenza</Divider>
              <Row gutter={16}>
                <Col xs={24} sm={24} md={12}>
                  <Form.Item name="emergencyContact" label="Nome">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={24} md={12}>
                  <Form.Item name="emergencyPhone" label="Telefono">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Ruolo e Stato */}
            <Card title="Ruolo e Stato" className="mb-4">
              <Row gutter={16}>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item name="staffRole" label="Ruolo" rules={[{ required: true }]}>
                    <Select>
                      <Select.Option value="INSTRUCTOR">Istruttore</Select.Option>
                      <Select.Option value="DRIVER">Autista</Select.Option>
                      <Select.Option value="ADMIN">Amministrativo</Select.Option>
                      <Select.Option value="VOLUNTEER">Volontario</Select.Option>
                      <Select.Option value="OTHER">Altro</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item name="status" label="Stato" rules={[{ required: true }]}>
                    <Select>
                      <Select.Option value="ACTIVE">Attivo</Select.Option>
                      <Select.Option value="INACTIVE">Inattivo</Select.Option>
                      <Select.Option value="ON_LEAVE">In Congedo</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item name="hireDate" label="Data Assunzione">
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                {canManageStaff && (
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="linkedUserUuid" label="Utente collegato">
                      <Select allowClear placeholder="Seleziona utente" showSearch optionFilterProp="children" onChange={handleUserChange}>
                        {users.map((user) => (
                          <Select.Option key={user.uuid} value={user.uuid}>
                            {user.username} {user.firstName && `(${user.firstName} ${user.lastName || ''})`}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                )}
              </Row>
            </Card>

            {/* Abilitazione Allenatore */}
            <Card title="Abilitazione Allenatore" className="mb-4">
              <Row gutter={16}>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item name="isCoach" label="Allenatore" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={9}>
                  <Form.Item name="coachLevel" label="Livello">
                    <Select allowClear>
                      <Select.Option value="I">I° Livello</Select.Option>
                      <Select.Option value="II">II° Livello</Select.Option>
                      <Select.Option value="III">III° Livello</Select.Option>
                      <Select.Option value="IV">IV° Livello</Select.Option>
                      <Select.Option value="NAZIONALE">Nazionale</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={9}>
                  <Form.Item name="coachLicenseExpiry" label="Scadenza Patentino">
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Visita Medica */}
            <Card title="Visita Medica Sportiva" className="mb-4">
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="medicalExamExpiry" label="Scadenza Visita Medica">
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Qualifiche e Certificazioni */}
            <Card title="Altre Qualifiche e Certificazioni" className="mb-4">
              <Row gutter={16}>
                <Col xs={24} sm={24} md={12}>
                  <Form.Item name="drivingLicense" label="Patente">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={24} md={12}>
                  <Form.Item name="drivingLicenseExpiry" label="Scadenza Patente">
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} sm={24} md={12}>
                  <Form.Item name="skiInstructorLicense" label="Abilitazione Maestro Sci">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={24} md={12}>
                  <Form.Item name="skiInstructorLicenseExpiry" label="Scadenza Abilitazione">
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} sm={24} md={12}>
                  <Form.Item name="firstAidCertificate" label="Certificato Primo Soccorso">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={24} md={12}>
                  <Form.Item name="firstAidCertificateExpiry" label="Scadenza Certificato">
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Note */}
            <Card title="Note" className="mb-4">
              <Form.Item name="notes">
                <Input.TextArea rows={4} />
              </Form.Item>
            </Card>
          </Col>

          {/* Sidebar - Foto e Documenti */}
          <Col xs={24} sm={12} md={6}>
            {/* Foto Profilo */}
            <Card title="Foto Profilo" className="mb-4">
              <div className="flex flex-col items-center">
                <Avatar
                  size={120}
                  icon={<UserOutlined />}
                  src={profileImageBlobUrl || undefined}
                  className="mb-4"
                />
                {!isNew && canSave && (
                  <div className="flex gap-2">
                    <Upload
                      showUploadList={false}
                      beforeUpload={handleSelectPhoto}
                      accept="image/*"
                    >
                      <Button icon={<CameraOutlined />} loading={uploadingPhoto}>
                        Carica
                      </Button>
                    </Upload>
                    {profileImageBlobUrl && (
                      <Popconfirm
                        title="Eliminare la foto?"
                        onConfirm={handleDeleteProfileImage}
                      >
                        <Button danger icon={<DeleteOutlined />}>
                          Elimina
                        </Button>
                      </Popconfirm>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <ImageCropModal
              open={cropModalOpen}
              imageFile={selectedImageFile}
              onClose={() => {
                setCropModalOpen(false);
                setSelectedImageFile(null);
              }}
              onCropComplete={handleCropComplete}
              aspectRatio={1}
            />

            {/* Documenti */}
            {!isNew && (
              <Card title="Documenti" className="mb-4">
                {canSave && (
                  <div className="mb-4">
                    <Select
                      value={selectedDocType}
                      onChange={setSelectedDocType}
                      className="w-full mb-2"
                    >
                      <Select.Option value="MEDICAL_EXAM">Visita Medica</Select.Option>
                      <Select.Option value="COACH_LICENSE">Patentino Allenatore</Select.Option>
                      <Select.Option value="DRIVING_LICENSE">Patente</Select.Option>
                      <Select.Option value="FIRST_AID">Primo Soccorso</Select.Option>
                      <Select.Option value="OTHER">Altro</Select.Option>
                    </Select>
                    <Upload
                      showUploadList={false}
                      beforeUpload={(file) => {
                        handleUploadDocument(file);
                        return false;
                      }}
                    >
                      <Button
                        icon={<UploadOutlined />}
                        loading={uploadingDoc}
                        className="w-full"
                      >
                        Carica Documento
                      </Button>
                    </Upload>
                  </div>
                )}

                <List
                  size="small"
                  dataSource={documents}
                  pagination={{ pageSize: 5, size: 'small', hideOnSinglePage: true, align: 'center' }}
                  locale={{ emptyText: 'Nessun documento' }}
                  renderItem={(doc) => (
                    <List.Item
                      actions={[
                        <Button
                          key="download"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownloadDocument(doc)}
                          aria-label="Scarica documento"
                          // il form è disabilitato in sola lettura, ma scaricare resta consentito
                          disabled={false}
                        />,
                        ...(canSave
                          ? [
                              <Popconfirm
                                key="delete"
                                title="Eliminare il documento?"
                                onConfirm={() => handleDeleteDocument(doc.uuid)}
                              >
                                <Button size="small" danger icon={<DeleteOutlined />} aria-label="Elimina documento" />
                              </Popconfirm>,
                            ]
                          : []),
                      ]}
                    >
                      <List.Item.Meta
                        title={doc.file?.originalName || 'Documento'}
                        description={documentTypeLabels[doc.documentType] || doc.documentType}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}
          </Col>
        </Row>

        {(isNew || canSave) && (
          <div className="flex justify-end mt-4">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              htmlType="submit"
              loading={saving}
            >
              Salva
            </Button>
          </div>
        )}
      </Form>
    </div>
  );
}
