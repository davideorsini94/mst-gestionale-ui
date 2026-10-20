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

interface Member {
  uuid?: string;
  firstName: string;
  lastName: string;
  gender?: string;
  fiscalCode?: string;
  birthDate?: string;
  birthPlace?: string;
  birthProvince?: string;
  nationality?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  memberType: string;
  status: string;
  isCompetitor: boolean;
  fisiCode?: string;
  fisCode?: string;
  medicalExamExpiry?: string;
  medicalExamCompetitive?: boolean;
  profileImageUuid?: string;
  profileImage?: FileEntity;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
  membershipDate?: string;
  membershipExpiry?: string;
  staffUuid?: string;
  documents?: MemberDocument[];
}

interface FileEntity {
  uuid: string;
  originalName: string;
  minioPath: string;
  mimeType: string;
  size: number;
  fileType: string;
}

interface MemberDocument {
  uuid: string;
  documentType: string;
  description?: string;
  expiryDate?: string;
  createdAt: string;
  file: FileEntity;
  fileUuid: string;
}

const documentTypeLabels: Record<string, string> = {
  MEDICAL_EXAM: 'Visita Medica',
  IDENTITY_DOCUMENT: 'Documento Identità',
  FISI_CARD: 'Tessera FISI',
  FIS_CARD: 'Tessera FIS',
  PHOTO: 'Foto',
  OTHER: 'Altro',
};

export default function MemberDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>('MEDICAL_EXAM');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [profileImageBlobUrl, setProfileImageBlobUrl] = useState<string | null>(null);
  const isNew = uuid === 'new';

  useEffect(() => {
    if (!isNew && uuid) {
      loadMember();
    }
    // Cleanup blob URL on unmount
    return () => {
      if (profileImageBlobUrl) {
        URL.revokeObjectURL(profileImageBlobUrl);
      }
    };
  }, [uuid]);

  const loadMember = async () => {
    setLoading(true);
    try {
      const data = await apiService.get<Member>(`/members/${uuid}`);
      setMember(data);
      setDocuments(data.documents || []);
      form.setFieldsValue({
        ...data,
        birthDate: data.birthDate ? dayjs(data.birthDate) : null,
        membershipDate: data.membershipDate ? dayjs(data.membershipDate) : null,
        membershipExpiry: data.membershipExpiry ? dayjs(data.membershipExpiry) : null,
        medicalExamExpiry: data.medicalExamExpiry ? dayjs(data.medicalExamExpiry) : null,
      });
      // Carica immagine profilo se presente
      if (data.profileImageUuid) {
        loadProfileImage();
      }
    } catch (error) {
      message.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  const loadProfileImage = async () => {
    try {
      const blob = await apiService.getBlob(`/members/${uuid}/profile-image`);
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
      const payload = {
        ...values,
        birthDate: values.birthDate
          ? (values.birthDate as dayjs.Dayjs).format('YYYY-MM-DD')
          : null,
        membershipDate: values.membershipDate
          ? (values.membershipDate as dayjs.Dayjs).format('YYYY-MM-DD')
          : null,
        membershipExpiry: values.membershipExpiry
          ? (values.membershipExpiry as dayjs.Dayjs).format('YYYY-MM-DD')
          : null,
        medicalExamExpiry: values.medicalExamExpiry
          ? (values.medicalExamExpiry as dayjs.Dayjs).format('YYYY-MM-DD')
          : null,
      };

      if (isNew) {
        await apiService.post('/members', payload);
        message.success('Tesserato creato');
      } else {
        await apiService.put(`/members/${uuid}`, payload);
        message.success('Tesserato aggiornato');
      }
      navigate('/members');
    } catch (error) {
      message.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDocument = async (file: File, documentType: string) => {
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      await apiService.post(`/members/${uuid}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('Documento caricato');
      loadMember();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Errore nel caricamento del documento';
      message.error(errorMsg);
    } finally {
      setUploadingDoc(false);
    }
    return false;
  };

  const handleSelectPhoto = (file: File) => {
    setSelectedImageFile(file);
    setCropModalOpen(true);
    return false;
  };

  const handleCropComplete = async (croppedBlob: Blob, filename: string) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', new File([croppedBlob], filename, { type: 'image/jpeg' }));

      await apiService.post(`/members/${uuid}/profile-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('Foto caricata');
      loadMember();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Errore nel caricamento della foto';
      message.error(errorMsg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeleteProfileImage = async () => {
    try {
      await apiService.delete(`/members/${uuid}/profile-image`);
      message.success('Foto eliminata');
      setProfileImageBlobUrl(null);
      loadMember();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Errore eliminazione foto';
      message.error(errorMsg);
    }
  };

  const handleDownloadDocument = async (doc: MemberDocument) => {
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
      const errorMsg = error?.response?.data?.message || error?.message || 'Errore nel download';
      message.error(errorMsg);
    }
  };

  const handleDeleteDocument = async (documentUuid: string) => {
    try {
      await apiService.delete(`/members/documents/${documentUuid}`);
      message.success('Documento eliminato');
      loadMember();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Errore nella eliminazione';
      message.error(errorMsg);
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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/members')}>
          Indietro
        </Button>
        <h1 className="text-2xl font-bold">
          {isNew ? 'Nuovo Tesserato' : 'Dettaglio Tesserato'}
        </h1>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Row gutter={16}>
          <Col span={18}>
            {/* Dati Anagrafici */}
            <Card title="Dati Anagrafici" className="mb-4">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="firstName" label="Nome" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="lastName" label="Cognome" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="gender" label="Sesso">
                    <Select>
                      <Select.Option value="M">Maschio</Select.Option>
                      <Select.Option value="F">Femmina</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="fiscalCode" label="Codice Fiscale">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="birthDate" label="Data di Nascita">
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="birthPlace" label="Luogo di Nascita">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="birthProvince" label="Provincia di Nascita">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="nationality" label="Nazionalità">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Contatti */}
            <Card title="Contatti" className="mb-4">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="email" label="Email">
                    <Input type="email" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="phone" label="Telefono">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="address" label="Indirizzo">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="city" label="Città">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="province" label="Provincia">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="postalCode" label="CAP">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Divider>Contatto di Emergenza</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="emergencyContact" label="Nome">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="emergencyPhone" label="Telefono">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Tesseramento */}
            <Card title="Tesseramento" className="mb-4">
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item name="memberType" label="Tipo" rules={[{ required: true }]}>
                    <Select>
                      <Select.Option value="ATHLETE">Atleta</Select.Option>
                      <Select.Option value="PARENT">Genitore</Select.Option>
                      <Select.Option value="MEMBER">Tesserato</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="status" label="Stato" rules={[{ required: true }]}>
                    <Select>
                      <Select.Option value="ACTIVE">Attivo</Select.Option>
                      <Select.Option value="INACTIVE">Inattivo</Select.Option>
                      <Select.Option value="SUSPENDED">Sospeso</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="membershipDate" label="Data Tesseramento">
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="membershipExpiry" label="Scadenza Tesseramento">
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item name="isCompetitor" label="Agonista" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={9}>
                  <Form.Item name="fisiCode" label="Codice FISI">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={9}>
                  <Form.Item name="fisCode" label="Codice FIS">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Visita Medica */}
            <Card title="Visita Medica Sportiva" className="mb-4">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="medicalExamExpiry" label="Scadenza">
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="medicalExamCompetitive"
                    label="Tipo Visita"
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren="Agonistica"
                      unCheckedChildren="Non Agonistica"
                    />
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

          {/* Sidebar */}
          <Col span={6}>
            {/* Foto Profilo */}
            <Card title="Foto" className="mb-4">
              <div className="flex flex-col items-center">
                <Avatar
                  size={120}
                  icon={<UserOutlined />}
                  src={profileImageBlobUrl || undefined}
                  className="mb-4"
                />
                {!isNew && (
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
                <div className="mb-4">
                  <Select
                    value={selectedDocType}
                    onChange={setSelectedDocType}
                    className="w-full mb-2"
                  >
                    <Select.Option value="MEDICAL_EXAM">Visita Medica</Select.Option>
                    <Select.Option value="IDENTITY_DOCUMENT">Documento Identità</Select.Option>
                    <Select.Option value="FISI_CARD">Tessera FISI</Select.Option>
                    <Select.Option value="FIS_CARD">Tessera FIS</Select.Option>
                    <Select.Option value="PHOTO">Foto</Select.Option>
                    <Select.Option value="OTHER">Altro</Select.Option>
                  </Select>
                  <Upload
                    showUploadList={false}
                    beforeUpload={(file) => {
                      handleUploadDocument(file, selectedDocType);
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
                        />,
                        <Popconfirm
                          key="delete"
                          title="Eliminare il documento?"
                          onConfirm={() => handleDeleteDocument(doc.uuid)}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />} aria-label="Elimina documento" />
                        </Popconfirm>,
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
      </Form>
    </div>
  );
}
