import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Collapse, Empty, Grid, Input, Tag, Typography } from 'antd';
import { ArrowRightOutlined, BulbOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import { authService } from '../../services/AuthService';
import { useCurrentUser } from '../../hooks/useAuth';
import { GUIDE_SECTIONS, type GuideRequirement, type GuideSection, type GuideTopic } from './guideContent';

const { useBreakpoint } = Grid;

/** Requisito soddisfatto: `all` = servono tutti i permessi, `any` = ne basta uno; senza requisito = tutti. */
function allowed(req: GuideRequirement | undefined, roleCode: string | undefined): boolean {
  if (!req) return true;
  if (req.roles && !(roleCode && req.roles.includes(roleCode))) return false;
  if (req.notRoles && roleCode && req.notRoles.includes(roleCode)) return false;
  if (req.all && !req.all.every((c) => authService.hasCapability(c))) return false;
  if (req.any && !req.any.some((c) => authService.hasCapability(c))) return false;
  if (req.none && req.none.some((c) => authService.hasCapability(c))) return false;
  return true;
}

/** Testo con **grassetto** per le etichette di pulsanti e campi. */
function rich(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

function topicText(topic: GuideTopic): string {
  return [topic.title, topic.text ?? '', ...(topic.steps ?? []), ...(topic.tips ?? []), topic.warning ?? ''].join(' ');
}

interface VisibleSection extends GuideSection {
  visibleTopics: GuideTopic[];
}

function TopicBody({ topic }: { topic: GuideTopic }) {
  return (
    <div className="mst-guide-topic">
      {topic.text && <p>{rich(topic.text)}</p>}
      {topic.steps && topic.steps.length > 0 && (
        <ol className="mst-guide-steps">
          {topic.steps.map((step, i) => (
            <li key={i}>{rich(step)}</li>
          ))}
        </ol>
      )}
      {topic.tips && topic.tips.length > 0 && (
        <Alert
          type="info"
          showIcon
          icon={<BulbOutlined />}
          message="Da sapere"
          description={
            <ul className="mst-guide-tips">
              {topic.tips.map((tip, i) => (
                <li key={i}>{rich(tip)}</li>
              ))}
            </ul>
          }
        />
      )}
      {topic.warning && (
        <Alert type="warning" showIcon icon={<WarningOutlined />} message="Attenzione" description={rich(topic.warning)} />
      )}
    </div>
  );
}

/**
 * Guida all'uso: mostra solo le sezioni e gli argomenti che il ruolo di chi la legge può usare
 * (stessi permessi del menu e dei pulsanti), scritta per chi non è un tecnico.
 */
export default function GuidePage() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string[]>([]);

  const sections: VisibleSection[] = useMemo(
    () =>
      GUIDE_SECTIONS.filter((s) => allowed(s.requires, user?.role?.code))
        .map((s) => ({ ...s, visibleTopics: s.topics.filter((t) => allowed(t.requires, user?.role?.code)) }))
        .filter((s) => s.visibleTopics.length > 0),
    // i permessi arrivano con l'utente: si ricalcola quando cambia
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  const q = normalize(query.trim());
  const filtered: VisibleSection[] = useMemo(() => {
    if (!q) return sections;
    // ogni parola deve comparire; senza l'ultima vocale "ricevuta" trova anche "ricevute", "tesserato" anche "tesserati"
    const words = q
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => (w.length >= 5 && /[aeiou]$/.test(w) ? w.slice(0, -1) : w));
    return sections
      .map((s) => ({
        ...s,
        visibleTopics: s.visibleTopics.filter((t) => {
          const text = normalize(`${s.title} ${topicText(t)}`);
          return words.every((w) => text.includes(w));
        }),
      }))
      .filter((s) => s.visibleTopics.length > 0);
  }, [sections, q]);

  // con una ricerca in corso gli argomenti trovati si aprono tutti
  const activeKeys = q ? filtered.flatMap((s) => s.visibleTopics.map((t) => `${s.id}/${t.id}`)) : open;

  const roleCode = user?.role?.code;
  const roleDescription = user?.role?.description;

  const scrollTo = (id: string) => {
    document.getElementById(`guida-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="mst-guide">
      <div className="mst-guide-main">
        <h1 className="text-xl md:text-2xl font-bold mb-2">Guida</h1>
        <Typography.Paragraph type="secondary" className="mst-guide-lead">
          Qui trovi spiegato, passo per passo, tutto quello che puoi fare nel gestionale. Vedi solo le funzioni del
          tuo ruolo{roleCode && (
            <>
              {' '}
              <strong>{roleCode}</strong>
              {roleDescription ? ` (${roleDescription.charAt(0).toLowerCase()}${roleDescription.slice(1)})` : ''}
            </>
          )}
          : se ti serve qualcosa che non trovi, chiedi a un amministratore.
        </Typography.Paragraph>

        <Input
          size="large"
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Cerca nella guida (es. password, documento, scadenza)"
          aria-label="Cerca nella guida"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-4"
        />

        {filtered.length === 0 ? (
          <Card>
            <Empty description={q ? 'Nessun argomento trovato: prova con un\'altra parola' : 'Nessun argomento disponibile'} />
          </Card>
        ) : (
          filtered.map((section) => (
            <Card
              key={section.id}
              id={`guida-${section.id}`}
              className="mst-guide-section mb-4"
              title={
                <span className="mst-guide-section-title">
                  <span className="mst-guide-section-icon" aria-hidden>
                    {section.icon}
                  </span>
                  {section.title}
                </span>
              }
              extra={
                section.path && !isMobile ? (
                  <Button type="link" onClick={() => navigate(section.path!)} icon={<ArrowRightOutlined />} iconPosition="end">
                    Apri
                  </Button>
                ) : undefined
              }
            >
              {section.intro && <p className="mst-guide-intro">{rich(section.intro)}</p>}
              <Collapse
                bordered={false}
                activeKey={activeKeys}
                onChange={(keys) => !q && setOpen(keys as string[])}
                items={section.visibleTopics.map((topic) => ({
                  key: `${section.id}/${topic.id}`,
                  label: (
                    <span className="mst-guide-topic-title">
                      {topic.title}
                      {topic.badge && (
                        <Tag className="ml-2" color="blue">
                          {topic.badge}
                        </Tag>
                      )}
                    </span>
                  ),
                  children: <TopicBody topic={topic} />,
                }))}
              />
              {section.path && isMobile && (
                <Button block className="mt-3" onClick={() => navigate(section.path!)} icon={<ArrowRightOutlined />} iconPosition="end">
                  Apri {section.title}
                </Button>
              )}
            </Card>
          ))
        )}
      </div>

      {!isMobile && sections.length > 1 && (
        <nav className="mst-guide-index" aria-label="Indice della guida">
          <div className="mst-guide-index-title">Indice</div>
          {sections.map((s) => (
            <button key={s.id} type="button" onClick={() => scrollTo(s.id)} className="mst-guide-index-link">
              <span aria-hidden>{s.icon}</span>
              {s.title}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
