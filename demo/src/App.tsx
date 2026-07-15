import { getTimezonesForCountry } from 'countries-and-timezones';
import { getCountryData } from 'countries-list';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import type { CustomerStatus } from '../../widget/src/types/types';

import { buildTrunks, DEMO_CUSTOMERS, type DemoCustomer } from './data';
import { loadWidget, type CallWidgetAPI } from './widgetClient';
import './app.css';

const ACCENTS = [
  { name: 'Teal', value: '#0f9b8e' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Rose', value: '#e11d48' },
];

const initials = (c: DemoCustomer) =>
  `${c.firstName[0] ?? ''}${c.lastName[0] ?? ''}`.toUpperCase();

const FLAG_CDN = 'https://purecatamphetamine.github.io/country-flag-icons/3x2';

function Flag({ country, size = 20 }: { country: string; size?: number }) {
  return (
    <img
      class='flag'
      src={`${FLAG_CDN}/${country.toUpperCase()}.svg`}
      alt={country}
      style={{ width: size, height: size * 0.7 }}
    />
  );
}

function useLocalTime(country: string): string {
  const timezone = useMemo(() => {
    const zones = getTimezonesForCountry(country.toUpperCase());
    return zones?.[0]?.name ?? null;
  }, [country]);

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
  const [selectedId, setSelectedId] = useState(DEMO_CUSTOMERS[0].id);
  // Status changes reflected back from the widget (via status_confirmed).
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, CustomerStatus>
  >({});
  const widgetRef = useRef<CallWidgetAPI | null>(null);

  const base = DEMO_CUSTOMERS.find((c) => c.id === selectedId)!;
  const customer: DemoCustomer = {
    ...base,
    status: statusOverrides[base.id] ?? base.status,
  };
  const localTime = useLocalTime(customer.country);
  const countryName = getCountryData(customer.country)?.name ?? customer.country;

  // Reflect the CRM theme on <html>.
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
  }, [accent]);

  // Load the widget once, then keep its theme in sync + listen for status saves.
  useEffect(() => {
    loadWidget({ theme: { mode, primaryColor: accent } })
      .then((api) => {
        widgetRef.current = api;
        api.on('status_confirmed', (payload) => {
          const p = payload as { customerId: string; status: CustomerStatus };
          setStatusOverrides((prev) => ({ ...prev, [p.customerId]: p.status }));
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
    <div class='app'>
      <header class='topbar'>
        <h1 class='topbar__title'>
          Calleague CRM <span>· widget demo</span>
        </h1>

        <div class='topbar__group'>
          <span class='topbar__label'>Widget accent</span>
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              class='swatch'
              title={a.name}
              data-active={accent === a.value}
              style={{ background: a.value }}
              onClick={() => setAccent(a.value)}
            />
          ))}
        </div>

        <button
          class='icon-btn'
          title={mode === 'light' ? 'Switch to dark' : 'Switch to light'}
          onClick={() => setMode((m) => (m === 'light' ? 'dark' : 'light'))}
        >
          {mode === 'light' ? '🌙' : '☀️'}
        </button>
      </header>

      <div class='layout'>
        {/* Customer rail */}
        <aside class='card' style={{ overflow: 'hidden', alignSelf: 'start' }}>
          <div class='rail__title'>Customers</div>
          {DEMO_CUSTOMERS.map((c) => (
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
                  width: 36,
                  height: 36,
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
            </button>
          ))}
        </aside>

        {/* Profile */}
        <main class='profile'>
          <section class='card profile__header'>
            <div class='profile__id'>
              <span
                class='avatar'
                style={{
                  background: customer.avatarColor,
                  width: 64,
                  height: 64,
                  fontSize: 22,
                }}
              >
                {initials(customer)}
              </span>
              <div>
                <h2 class='profile__name'>
                  {customer.firstName} {customer.lastName}
                </h2>
                <p class='profile__sub'>{customer.company}</p>
                <div class='profile__loc'>
                  <Flag country={customer.country} />
                  {countryName} · Local time {localTime}
                </div>
              </div>
            </div>

            <div class='profile__actions'>
              {customer.status ? (
                <span
                  class='chip'
                  style={{
                    color: customer.status.color,
                    borderColor: customer.status.color,
                    background: `${customer.status.color}1a`,
                  }}
                >
                  {customer.status.name}
                </span>
              ) : (
                <span class='chip chip--empty'>No status</span>
              )}
              <button class='call-btn' onClick={handleCall}>
                📞 Call customer
              </button>
            </div>
          </section>

          <section class='card section'>
            <h3 class='section__title'>Details</h3>
            <div class='fields'>
              <Field label='Phone' value={customer.phoneNumber ?? '—'} />
              <Field label='Email' value={customer.email} />
              <Field label='Lead source' value={customer.leadSource} />
              <Field label='Owner' value={customer.owner} />
              <Field label='Created' value={customer.createdAt} />
              <Field label='Customer ID' value={customer.id} />
            </div>
          </section>

          <section class='card section'>
            <h3 class='section__title'>Latest activity</h3>
            {customer.comments.length === 0 ? (
              <p class='muted'>No comments yet.</p>
            ) : (
              customer.comments.map((cm) => (
                <div key={cm.id} class='comment'>
                  <span
                    class='avatar'
                    style={{
                      background: 'var(--text-dim)',
                      width: 30,
                      height: 30,
                      fontSize: 12,
                    }}
                  >
                    {cm.author[0]}
                  </span>
                  <div>
                    <div class='comment__head'>
                      <span class='comment__author'>{cm.author}</span>
                      <span class='comment__time'>{cm.timestamp}</span>
                    </div>
                    <p class='comment__text'>{cm.text}</p>
                  </div>
                </div>
              ))
            )}
          </section>

          <section class='card section'>
            <h3 class='section__title'>Assets</h3>
            {customer.assets.length === 0 ? (
              <p class='muted'>No files attached.</p>
            ) : (
              customer.assets.map((asset) => (
                <div key={asset.id} class='asset'>
                  <span>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div class='asset__name'>{asset.name}</div>
                    <div class='asset__meta'>
                      {asset.type} · {asset.size}
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div class='field__label'>{label}</div>
      <div class='field__value'>{value}</div>
    </div>
  );
}
