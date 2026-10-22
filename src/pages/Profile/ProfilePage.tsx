import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Divider, Space, Grid, Segmented, Switch, Typography } from 'antd';
import { message } from '../../services/notify';
import { SaveOutlined, LockOutlined, BgColorsOutlined, SunOutlined, MoonOutlined, DesktopOutlined } from '@ant-design/icons';
import { apiService } from '../../services/ApiService';
import { authService } from '../../services/AuthService';
import { useThemePrefs } from '../../theme/ThemeProvider';
import type { ThemeMode } from '../../theme/preferences';

const { useBreakpoint } = Grid;

interface UserProfile {
    uuid: string;
    username: string;
    firstName?: string;
    lastName?: string;
    email?: string;
}

export default function ProfilePage() {
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [changingPassword, setChangingPassword] = useState(false);

    const currentUser = authService.getUser();
    // chi gestisce gli utenti modifica anche l'email; gli altri solo nome e cognome (l'email collega il profilo staff)
    const canManageUsers = authService.hasCapability('CAN_MANAGE_USERS');
    const { mode, setMode, reduceTransparency, setReduceTransparency } = useThemePrefs();

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            // Usa l'endpoint /auth/me che non richiede capabilities speciali
            const user = await apiService.get<UserProfile>('/auth/me');
            form.setFieldsValue(user);
        } catch (error) {
            message.error('Errore nel caricamento profilo');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async (values: Partial<UserProfile>) => {
        if (!currentUser?.uuid) return;

        setSaving(true);
        try {
            if (canManageUsers) {
                const { username: _username, ...data } = values as UserProfile;
                await apiService.put(`/users/${currentUser.uuid}`, data);
            } else {
                await apiService.put('/auth/me', { firstName: values.firstName, lastName: values.lastName });
            }
            message.success('Profilo aggiornato con successo');
        } catch (error: any) {
            message.error(error?.response?.data?.message || 'Errore nel salvataggio');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (values: { currentPassword: string; newPassword: string }) => {
        setChangingPassword(true);
        try {
            await apiService.post('/auth/change-password', {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            });
            message.success('Password aggiornata con successo. Verrai disconnesso...');
            setTimeout(() => {
                authService.logout();
            }, 1500);
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || 'Errore nel cambio password';
            message.error({
                content: errorMessage,
                duration: 5,
            });
            setChangingPassword(false);
        }
    };

    return (
        <div style={{ maxWidth: isMobile ? '100%' : 600, margin: '0 auto', padding: isMobile ? '0 8px' : 0 }}>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 'bold', marginBottom: 16 }}>Il Mio Profilo</h1>

            <Card loading={loading} bodyStyle={{ padding: isMobile ? 12 : 24 }}>
                <Form form={form} layout="vertical" onFinish={handleSaveProfile}>
                    <Form.Item name="username" label="Username">
                        <Input disabled />
                    </Form.Item>
                    <Form.Item name="firstName" label="Nome">
                        <Input />
                    </Form.Item>
                    <Form.Item name="lastName" label="Cognome">
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ type: 'email', message: 'Email non valida' }]}
                        extra={canManageUsers ? undefined : "Per cambiare l'email chiedi a un amministratore"}
                    >
                        <Input disabled={!canManageUsers} />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} block={isMobile}>
                            Salva Modifiche
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            <Divider style={{ margin: isMobile ? '16px 0' : '24px 0' }} />

            <Card
                title={<Space><BgColorsOutlined /> Aspetto</Space>}
                bodyStyle={{ padding: isMobile ? 12 : 24 }}
            >
                <div className="flex flex-col gap-4">
                    <div>
                        <div id="theme-label" className="mb-2 font-medium">Tema</div>
                        <Segmented<ThemeMode>
                            aria-labelledby="theme-label"
                            block
                            value={mode}
                            onChange={(value) => setMode(value)}
                            options={[
                                { label: 'Chiaro', value: 'light', icon: <SunOutlined /> },
                                { label: 'Scuro', value: 'dark', icon: <MoonOutlined /> },
                                { label: 'Automatico', value: 'system', icon: <DesktopOutlined /> },
                            ]}
                        />
                        <Typography.Text type="secondary" className="block mt-2 text-sm">
                            "Automatico" segue l'impostazione chiaro/scuro del dispositivo.
                        </Typography.Text>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <label htmlFor="reduce-transparency" className="font-medium">Riduci trasparenza</label>
                            <Typography.Text type="secondary" className="block text-sm">
                                Sostituisce gli effetti vetro di barre e menu con superfici opache.
                            </Typography.Text>
                        </div>
                        <Switch
                            id="reduce-transparency"
                            checked={reduceTransparency}
                            onChange={setReduceTransparency}
                        />
                    </div>
                </div>
            </Card>

            <Divider style={{ margin: isMobile ? '16px 0' : '24px 0' }} />

            <Card
                title={<Space><LockOutlined /> Cambia Password</Space>}
                bodyStyle={{ padding: isMobile ? 12 : 24 }}
            >
                <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
                    <Form.Item
                        name="currentPassword"
                        label="Password Attuale"
                        rules={[{ required: true, message: 'Inserisci la password attuale' }]}
                    >
                        <Input.Password placeholder="Password attuale" />
                    </Form.Item>
                    <Form.Item
                        name="newPassword"
                        label="Nuova Password"
                        rules={[
                            { required: true, message: 'Inserisci la nuova password' },
                            { min: 6, message: 'La password deve avere almeno 6 caratteri' },
                        ]}
                    >
                        <Input.Password placeholder="Minimo 6 caratteri" />
                    </Form.Item>
                    <Form.Item
                        name="confirmPassword"
                        label="Conferma Password"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: 'Conferma la password' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Le password non coincidono'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password placeholder="Ripeti la password" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" icon={<LockOutlined />} loading={changingPassword} block={isMobile}>
                            Cambia Password
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
