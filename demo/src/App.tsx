import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import type { CustomerStatus } from '../../widget/src/types/types';
import { countryName, countryTimeZone } from '../../widget/src/utils/country';

import {
  buildTrunks,
  DEMO_CUSTOMERS,
  type CustomerComment,
  type DemoCustomer,
} from './data';
import { loadWidget, type CallWidgetAPI } from './widgetClient';
import './app.css';

const ACCENTS = [
  { name: 'Teal', value: '#0f9b8e' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Rose', value: '#e11d48' },
];

const FILE_TINT: Record<string, string> = {
  PDF: '#e5484d',
  DOCX: '#3b6fe0',
  DOC: '#3b6fe0',
  XLSX: '#2e9e5b',
  XLS: '#2e9e5b',
  ZIP: '#b0721f',
  PPTX: '#d9730d',
  PPT: '#d9730d',
};

const initials = (c: DemoCustomer) =>
  `${c.firstName[0] ?? ''}${c.lastName[0] ?? ''}`.toUpperCase();

const FLAG_CDN = 'https://purecatamphetamine.github.io/country-flag-icons/3x2';

type View = 'customers' | 'dashboard' | 'reports';

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: 'customers', label: 'Customers' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'reports', label: 'Reports' },
];

function Flag({ country, size = 20 }: { country: string; size?: number }) {
  return (
    <img
      class='flag'
      src={`${FLAG_CDN}/${country.toUpperCase()}.svg`}
      alt={country}
      style={{ width: size, height: size * 0.75 }}
    />
  );
}

/* ---- inline icons (no dependencies) ---- */

function LogoMark() {
  return (
    <svg viewBox='0 0 24 24' width='18' height='18' aria-hidden='true'>
      <path
        fill='currentColor'
        d='M6.6 3.5c-1 0-1.9.6-2.3 1.5C2.6 8.7 3.5 13 6.7 16.2S14.1 21 18 20.1c.9-.4 1.5-1.3 1.5-2.3v-2.2c0-.7-.5-1.4-1.2-1.6l-2.6-.7c-.6-.2-1.3 0-1.7.5l-.7.9a10.6 10.6 0 0 1-4.2-4.2l.9-.7c.5-.4.7-1.1.5-1.7l-.7-2.6c-.2-.7-.9-1.2-1.6-1.2z'
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      width='18'
      height='18'
      fill='none'
      stroke='currentColor'
      stroke-width='2'
      stroke-linecap='round'
      aria-hidden='true'
    >
      <circle cx='12' cy='12' r='4' />
      <path d='M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      width='18'
      height='18'
      fill='none'
      stroke='currentColor'
      stroke-width='2'
      stroke-linecap='round'
      stroke-linejoin='round'
      aria-hidden='true'
    >
      <path d='M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z' />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden='true'>
      <path
        fill='currentColor'
        d='M6.6 3.5c-1 0-1.9.6-2.3 1.5C2.6 8.7 3.5 13 6.7 16.2S14.1 21 18 20.1c.9-.4 1.5-1.3 1.5-2.3v-2.2c0-.7-.5-1.4-1.2-1.6l-2.6-.7c-.6-.2-1.3 0-1.7.5l-.7.9a10.6 10.6 0 0 1-4.2-4.2l.9-.7c.5-.4.7-1.1.5-1.7l-.7-2.6c-.2-.7-.9-1.2-1.6-1.2z'
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      width='11'
      height='11'
      fill='none'
      stroke='currentColor'
      stroke-width='2'
      stroke-linecap='round'
      stroke-linejoin='round'
      aria-hidden='true'
    >
      <rect x='5' y='11' width='14' height='9' rx='2' />
      <path d='M8 11V7a4 4 0 0 1 8 0v4' />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      width='12'
      height='12'
      fill='none'
      stroke='currentColor'
      stroke-width='3.5'
      stroke-linecap='round'
      stroke-linejoin='round'
      aria-hidden='true'
    >
      <path d='M5 12.5l4.5 4.5L19 7' />
    </svg>
  );
}

function useLocalTime(country: string): string {
  const timezone = useMemo(() => countryTimeZone(country), [country]);

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!timezone) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(new Date());
  } catch {
    return '—';
  }
}

export function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [accent, setAccent] = useState(ACCENTS[0].value);
  const [view, setView] = useState<View>('customers');
  const [selectedId, setSelectedId] = useState(DEMO_CUSTOMERS[0].id);
  // Status + comment changes reflected back from the widget (status_confirmed).
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, CustomerStatus>
  >({});
  const [commentOverrides, setCommentOverrides] = useState<
    Record<string, CustomerComment[]>
  >({});
  const widgetRef = useRef<CallWidgetAPI | null>(null);

  const base = DEMO_CUSTOMERS.find((c) => c.id === selectedId)!;
  const customer: DemoCustomer = {
    ...base,
    status: statusOverrides[base.id] ?? base.status,
    comments: [...(commentOverrides[base.id] ?? []), ...base.comments],
  };
  const localTime = useLocalTime(customer.country);
  const countryLabel = countryName(customer.country);

  // Reflect the CRM theme on <html>.
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
  }, [accent]);

  // Load the widget once, then keep its theme in sync + listen for status saves.
  useEffect(() => {
    loadWidget({
      theme: { mode, primaryColor: accent },
      webBaseUrl: 'https://www.linkedin.com/in/alexey-shaldenkov/',
    })
      .then((api) => {
        widgetRef.current = api;
        api.on('status_confirmed', (payload) => {
          const p = payload as {
            customerId: string;
            status: CustomerStatus;
            comment?: string;
          };
          setStatusOverrides((prev) => ({ ...prev, [p.customerId]: p.status }));
          if (p.comment) {
            const entry: CustomerComment = {
              id: `live-${Date.now()}`,
              author: 'You',
              timestamp: 'Just now',
              text: p.comment,
            };
            setCommentOverrides((prev) => ({
              ...prev,
              [p.customerId]: [entry, ...(prev[p.customerId] ?? [])],
            }));
          }
        });
      })
      .catch((err) => console.error('[demo] widget load failed:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    widgetRef.current?.emit('customize', { mode });
  }, [mode]);
  useEffect(() => {
    widgetRef.current?.emit('customize', { primaryColor: accent });
  }, [accent]);

  const handleCall = () => {
    widgetRef.current?.emit('call', {
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        country: customer.country,
        status: customer.status,
        brandName: customer.brandName,
        phoneNumber: customer.phoneNumber,
      },
      trunks: buildTrunks(customer.country),
    });
  };

  return (
    <div class='demo'>
      {/* ---- Intro: what this actually is ---- */}
      <header class='demo__intro'>
        <div class='demo__introMain'>
          <span class='demo__pill'>Live demo</span>
          <h1 class='demo__headline'>
            A call widget that drops into <em>any</em> web app.
          </h1>
          <p class='demo__copy'>
            The framed window below stands in for your product — say, your team's
            custom CRM. The floating panel in its corner is a self-contained call
            widget you add with two files (<code>loader.js</code> +{' '}
            <code>call-widget.js</code>, ~42&nbsp;KB gzip). It renders inside its
            own <strong>Shadow DOM</strong>, so host and widget styles never leak
            into each other, and it adapts to your brand. Click an accent or the
            dark toggle to watch it restyle — then make a call and browse the
            pages: the widget stays with you.
          </p>
        </div>
        <ul class='demo__chips'>
          <li class='chip-tag'>Shadow-DOM isolated</li>
          <li class='chip-tag'>~42 KB gzip</li>
          <li class='chip-tag'>Framework-agnostic</li>
          <li class='chip-tag'>Themeable</li>
        </ul>
      </header>

      {/* ---- Framed host "browser window" ---- */}
      <div class='frame'>
        <div class='frame__bar'>
          <span class='frame__dots' aria-hidden='true'>
            <i class='frame__dot' style={{ background: '#ff5f57' }} />
            <i class='frame__dot' style={{ background: '#febc2e' }} />
            <i class='frame__dot' style={{ background: '#28c840' }} />
          </span>
          <span class='frame__url'>
            <LockIcon />
            app.northwind-crm.example
          </span>
          <span class='frame__spacer' />
        </div>

        <div class='frame__body'>
          <div class='app'>
            <header class='topbar'>
              <div class='brand'>
                <span class='brand__mark'>
                  <LogoMark />
                </span>
                <span class='brand__text'>
                  <span class='brand__name'>Northwind CRM</span>
                  <span class='brand__badge'>host app</span>
                </span>
              </div>

              <nav class='nav'>
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    class='nav__item'
                    data-active={view === item.id}
                    onClick={() => setView(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              <div class='topbar__spacer' />

              <div class='topbar__group'>
                <span class='topbar__label'>Accent</span>
                <div class='swatches'>
                  {ACCENTS.map((a) => (
                    <button
                      key={a.value}
                      class='swatch'
                      title={a.name}
                      aria-label={`${a.name} accent`}
                      data-active={accent === a.value}
                      style={{ background: a.value }}
                      onClick={() => setAccent(a.value)}
                    >
                      {accent === a.value ? <CheckIcon /> : null}
                    </button>
                  ))}
                </div>
              </div>

              <button
                class='icon-btn'
                title={mode === 'light' ? 'Switch to dark' : 'Switch to light'}
                aria-label='Toggle theme'
                onClick={() =>
                  setMode((m) => (m === 'light' ? 'dark' : 'light'))
                }
              >
                {mode === 'light' ? <MoonIcon /> : <SunIcon />}
              </button>
            </header>

            {view === 'customers' && (
              <div class='layout'>
                {/* Customer rail */}
                <aside class='card rail'>
                  <div class='rail__title'>
                    <span>Customers</span>
                    <span class='rail__count'>{DEMO_CUSTOMERS.length}</span>
                  </div>
                  <div class='rail__list'>
                    {DEMO_CUSTOMERS.map((c) => {
                      const cs = statusOverrides[c.id] ?? c.status;
                      return (
                        <button
                          key={c.id}
                          class='rail__item'
                          data-active={c.id === selectedId}
                          onClick={() => setSelectedId(c.id)}
                        >
                          <span
                            class='avatar'
                            style={{
                              background: c.avatarColor,
                              width: 38,
                              height: 38,
                              fontSize: 13,
                            }}
                          >
                            {initials(c)}
                          </span>
                          <span class='rail__meta'>
                            <span class='rail__name'>
                              {c.firstName} {c.lastName}
                            </span>
                            <span class='rail__company'>
                              <Flag country={c.country} size={14} />
                              {c.company}
                            </span>
                          </span>
                          <span
                            class='rail__dot'
                            title={cs?.name ?? 'No status'}
                            style={{
                              background: cs?.color ?? 'var(--border-strong)',
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </aside>

                {/* Profile */}
                <main class='profile'>
                  <section class='card profile__header'>
                    <div class='profile__id'>
                      <span
                        class='avatar avatar--ring'
                        style={{
                          background: customer.avatarColor,
                          width: 60,
                          height: 60,
                          fontSize: 21,
                        }}
                      >
                        {initials(customer)}
                      </span>
                      <div class='profile__idtext'>
                        <h2 class='profile__name'>
                          {customer.firstName} {customer.lastName}
                        </h2>
                        <p class='profile__sub'>{customer.company}</p>
                        <div class='profile__loc'>
                          <Flag country={customer.country} size={16} />
                          <span>{countryLabel}</span>
                          <span class='dot-sep' />
                          <span>Local time {localTime}</span>
                        </div>
                      </div>
                    </div>

                    <div class='profile__actions'>
                      {customer.status ? (
                        <span
                          class='chip'
                          style={{
                            color: customer.status.color,
                            background: `${customer.status.color}1f`,
                          }}
                        >
                          <span
                            class='chip__dot'
                            style={{ background: customer.status.color }}
                          />
                          {customer.status.name}
                        </span>
                      ) : (
                        <span class='chip chip--empty'>No status</span>
                      )}
                      <button class='call-btn' onClick={handleCall}>
                        <PhoneIcon />
                        Call customer
                      </button>
                    </div>
                  </section>

                  <section class='card section'>
                    <h3 class='section__title'>Details</h3>
                    <div class='fields'>
                      <Field
                        label='Phone'
                        value={customer.phoneNumber ?? '—'}
                        mono
                      />
                      <Field label='Email' value={customer.email} />
                      <Field label='Lead source' value={customer.leadSource} />
                      <Field label='Owner' value={customer.owner} />
                      <Field label='Created' value={customer.createdAt} />
                      <Field label='Customer ID' value={customer.id} mono />
                    </div>
                  </section>

                  <section class='card section'>
                    <h3 class='section__title'>Latest activity</h3>
                    {customer.comments.length === 0 ? (
                      <p class='muted'>No comments yet.</p>
                    ) : (
                      <div class='timeline'>
                        {customer.comments.map((cm) => (
                          <div key={cm.id} class='comment'>
                            <span class='avatar comment__avatar'>
                              {cm.author[0]}
                            </span>
                            <div class='comment__body'>
                              <div class='comment__head'>
                                <span class='comment__author'>{cm.author}</span>
                                <span class='comment__time'>{cm.timestamp}</span>
                              </div>
                              <p class='comment__text'>{cm.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section class='card section'>
                    <h3 class='section__title'>Assets</h3>
                    {customer.assets.length === 0 ? (
                      <p class='muted'>No files attached.</p>
                    ) : (
                      <div class='assets'>
                        {customer.assets.map((asset) => (
                          <div key={asset.id} class='asset'>
                            <span
                              class='asset__glyph'
                              style={{
                                background: `${FILE_TINT[asset.type] ?? '#64748b'}1f`,
                                color: FILE_TINT[asset.type] ?? '#64748b',
                              }}
                            >
                              {asset.type}
                            </span>
                            <div class='asset__info'>
                              <div class='asset__name'>{asset.name}</div>
                              <div class='asset__meta'>
                                {asset.type} · {asset.size}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </main>
              </div>
            )}

            {view === 'dashboard' && <DashboardView />}
            {view === 'reports' && <ReportsView />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div class='field'>
      <div class='field__label'>{label}</div>
      <div class={mono ? 'field__value field__value--mono' : 'field__value'}>
        {value}
      </div>
    </div>
  );
}

/* ---- Mock pages (static) — prove the widget persists across navigation ---- */

const STATS = [
  { label: 'Calls today', value: '128', delta: '+12%' },
  { label: 'Avg. duration', value: '4:12', delta: '−0:18' },
  { label: 'Answer rate', value: '87%', delta: '+3%' },
  { label: 'Active agents', value: '6', delta: 'live' },
];

const WEEK = [
  { d: 'Mon', v: 62 },
  { d: 'Tue', v: 80 },
  { d: 'Wed', v: 54 },
  { d: 'Thu', v: 96 },
  { d: 'Fri', v: 88 },
  { d: 'Sat', v: 34 },
  { d: 'Sun', v: 20 },
];

function StatGrid() {
  return (
    <div class='stat-grid'>
      {STATS.map((s) => (
        <div key={s.label} class='card stat-card'>
          <div class='stat-card__label'>{s.label}</div>
          <div class='stat-card__value'>{s.value}</div>
          <div class='stat-card__delta'>{s.delta}</div>
        </div>
      ))}
    </div>
  );
}

function DashboardView() {
  const max = Math.max(...WEEK.map((w) => w.v));
  return (
    <div class='page'>
      <h1 class='page__title'>Dashboard</h1>
      <StatGrid />
      <section class='card section'>
        <h3 class='section__title'>Calls this week</h3>
        <div class='bars'>
          {WEEK.map((w) => (
            <div key={w.d} class='bar'>
              <div
                class='bar__fill'
                style={{ height: `${Math.round((w.v / max) * 100)}%` }}
                title={`${w.v} calls`}
              />
              <span class='bar__label'>{w.d}</span>
            </div>
          ))}
        </div>
      </section>
      <p class='muted'>
        Placeholder page — switch tabs during a call and the widget stays put.
      </p>
    </div>
  );
}

const AGENTS = [
  { name: 'Alex Sh.', calls: 41, avg: '3:58', res: '92%' },
  { name: 'Maria G.', calls: 37, avg: '4:20', res: '88%' },
  { name: 'Carla M.', calls: 29, avg: '5:02', res: '90%' },
  { name: 'Tomáš K.', calls: 21, avg: '3:41', res: '85%' },
];

function ReportsView() {
  return (
    <div class='page'>
      <h1 class='page__title'>Reports</h1>
      <StatGrid />
      <section class='card section'>
        <h3 class='section__title'>Agent performance</h3>
        <table class='mini-table'>
          <thead>
            <tr>
              <th>Agent</th>
              <th>Calls</th>
              <th>Avg. duration</th>
              <th>Resolution</th>
            </tr>
          </thead>
          <tbody>
            {AGENTS.map((a) => (
              <tr key={a.name}>
                <td>{a.name}</td>
                <td>{a.calls}</td>
                <td>{a.avg}</td>
                <td>{a.res}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
