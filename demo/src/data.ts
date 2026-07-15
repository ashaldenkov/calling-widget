import type { TCountryCode } from 'countries-list';

import type {
  CustomerData,
  TrunkListItem,
} from '../../widget/src/types/types';

export interface CustomerComment {
  id: string;
  author: string;
  timestamp: string;
  text: string;
}

export interface CustomerAsset {
  id: string;
  name: string;
  type: string;
  size: string;
}

/** A CRM-style customer record used by the mock host page. */
export interface DemoCustomer extends CustomerData {
  company: string;
  email: string;
  leadSource: string;
  owner: string;
  createdAt: string;
  avatarColor: string;
  comments: CustomerComment[];
  assets: CustomerAsset[];
}

export const DEMO_CUSTOMERS: DemoCustomer[] = [
  {
    id: 'cust-1001',
    firstName: 'Emily',
    lastName: 'Carter',
    country: 'US' as TCountryCode,
    phoneNumber: '+1 415 555 0142',
    brandName: 'Northwind Trading',
    company: 'Northwind Trading',
    email: 'emily.carter@northwind.example',
    leadSource: 'Website form',
    owner: 'Alex Sh.',
    createdAt: '12 Mar 2026',
    avatarColor: '#1976d2',
    status: { id: 's2', name: 'Interested', color: '#2e7d32' },
    comments: [
      {
        id: 'c1',
        author: 'Alex Sh.',
        timestamp: 'Today, 09:41',
        text: 'Asked for an updated quote on the enterprise plan. Following up this week.',
      },
      {
        id: 'c2',
        author: 'Maria G.',
        timestamp: 'Yesterday, 16:12',
        text: 'Left a voicemail. Prefers calls in the morning (PST).',
      },
    ],
    assets: [
      { id: 'a1', name: 'Proposal_v3.pdf', type: 'PDF', size: '820 KB' },
      { id: 'a2', name: 'Contract_draft.docx', type: 'DOCX', size: '64 KB' },
    ],
  },
  {
    id: 'cust-1002',
    firstName: 'Lukas',
    lastName: 'Weber',
    country: 'DE' as TCountryCode,
    phoneNumber: '+49 69 5550 118',
    brandName: 'Rheinland Logistik',
    company: 'Rheinland Logistik',
    email: 'lukas.weber@rhl.example',
    leadSource: 'Trade show — Hannover',
    owner: 'Alex Sh.',
    createdAt: '28 Feb 2026',
    avatarColor: '#7b1fa2',
    status: { id: 's3', name: 'Callback scheduled', color: '#ed6c02' },
    comments: [
      {
        id: 'c1',
        author: 'Alex Sh.',
        timestamp: 'Mon, 11:03',
        text: 'Wants a callback Thursday afternoon to discuss volume pricing.',
      },
    ],
    assets: [{ id: 'a1', name: 'NDA_signed.pdf', type: 'PDF', size: '210 KB' }],
  },
  {
    id: 'cust-1003',
    firstName: 'Beatriz',
    lastName: 'Almeida',
    country: 'BR' as TCountryCode,
    phoneNumber: '+55 11 95555 0173',
    brandName: 'Vale Verde Cosméticos',
    company: 'Vale Verde Cosméticos',
    email: 'bea.almeida@valeverde.example',
    leadSource: 'Referral',
    owner: 'Carla M.',
    createdAt: '05 Jan 2026',
    avatarColor: '#2e7d32',
    status: { id: 's10', name: 'Follow up', color: '#0288d1' },
    comments: [
      {
        id: 'c1',
        author: 'Carla M.',
        timestamp: 'Today, 08:20',
        text: 'Very engaged on WhatsApp. Sent the product catalogue.',
      },
      {
        id: 'c2',
        author: 'Alex Sh.',
        timestamp: '2 days ago',
        text: 'Interested in the summer line. Budget confirmed.',
      },
    ],
    assets: [
      { id: 'a1', name: 'Catalogue_2026.pdf', type: 'PDF', size: '4.2 MB' },
      { id: 'a2', name: 'Price_list.xlsx', type: 'XLSX', size: '128 KB' },
      { id: 'a3', name: 'Store_photos.zip', type: 'ZIP', size: '11 MB' },
    ],
  },
  {
    id: 'cust-1004',
    firstName: 'Haruto',
    lastName: 'Tanaka',
    country: 'JP' as TCountryCode,
    phoneNumber: '+81 3 5550 0199',
    brandName: 'Sakura Robotics',
    company: 'Sakura Robotics',
    email: 'h.tanaka@sakura-robotics.example',
    leadSource: 'Outbound campaign',
    owner: 'Alex Sh.',
    createdAt: '19 Apr 2026',
    avatarColor: '#d32f2f',
    status: null,
    comments: [
      {
        id: 'c1',
        author: 'Alex Sh.',
        timestamp: 'Today, 02:15',
        text: 'First touch. Timezone is JST — schedule calls late evening CET.',
      },
    ],
    assets: [],
  },
];

// Human-friendly local trunk labels per country used in the demo.
const COUNTRY_TRUNKS: Partial<Record<string, string[]>> = {
  US: ['US East — New York', 'US West — Los Angeles', 'US Central — Chicago'],
  DE: ['Germany — Frankfurt', 'Germany — Berlin'],
  BR: ['Brazil — São Paulo', 'Brazil — Rio de Janeiro'],
  JP: ['Japan — Tokyo', 'Japan — Osaka'],
};

const GLOBAL_TRUNKS = [
  'Global — Anycast Primary',
  'Global — Failover',
  'Global — Premium Voice',
];

/**
 * Builds the trunk list for a given customer country: country-local trunks first
 * (the default is the top local one) followed by shared Global trunks. This is
 * the "trunk data" the host passes to the widget via the `call` event.
 */
export function buildTrunks(country: string): TrunkListItem[] {
  const code = country.toUpperCase();
  const local = COUNTRY_TRUNKS[code] ?? [`${code} — National`];
  const names = [...local, ...GLOBAL_TRUNKS];

  return names.map((name, i) => {
    const isGlobal = name.startsWith('Global');
    return {
      id: String(1000 + i),
      brandId: 'brand-1',
      name,
      isDefault: i === 0,
      status: 'active',
      enabled: true,
      minuteCost: isGlobal
        ? Number((0.03 + i * 0.015).toFixed(3))
        : Number((0.008 + i * 0.004).toFixed(3)),
    };
  });
}
