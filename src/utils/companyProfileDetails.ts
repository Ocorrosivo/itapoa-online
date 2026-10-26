export const DAY_GROUPS = ['Segunda a sexta', 'Sábado', 'Domingo'] as const;

export const ALLOWED_PORTAL_CITIES = [
  { id: 'city_itapoa', name: 'Itapoá', uf: 'SC', aliases: ['itapoa', 'itapoá'] },
  { id: 'city_curitiba', name: 'Curitiba', uf: 'PR', aliases: ['curitiba'] },
] as const;

export interface ProfileDetails {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  x: string;
  googleBusiness: string;
  schedule: { label: string; closed: boolean; open: string; close: string }[];
}

export function readProfileDetails(raw: unknown): ProfileDetails {
  let value: any = raw;
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw); } catch { value = {}; }
  }
  value = value && typeof value === 'object' ? value : {};
  const text = (key: string) => (typeof value[key] === 'string' ? value[key] : '');

  return {
    cep: text('cep'),
    street: text('street'),
    number: text('number'),
    complement: text('complement'),
    neighborhood: text('neighborhood'),
    city: text('city'),
    state: text('state'),
    x: text('x'),
    googleBusiness: text('googleBusiness'),
    schedule: DAY_GROUPS.map(label => {
      const row = Array.isArray(value.schedule) ? value.schedule.find((r: any) => r?.label === label) : undefined;
      return {
        label,
        closed: row?.closed === true,
        open: typeof row?.open === 'string' ? row.open : '',
        close: typeof row?.close === 'string' ? row.close : '',
      };
    }),
  };
}

export function formatProfileAddress(p: ProfileDetails): string {
  const streetPart = [p.street, p.number].filter(Boolean).join(', ');
  const locality = [p.city, p.state].filter(Boolean).join(' - ');
  return [streetPart, p.complement, p.neighborhood, locality, p.cep].filter(Boolean).join(' — ');
}

export function formatProfileHours(p: ProfileDetails): string {
  return p.schedule
    .filter(r => r.closed || (r.open && r.close))
    .map(r => `${r.label}: ${r.closed ? 'Fechado' : `${r.open} às ${r.close}`}`)
    .join('; ');
}

export function isAllowedPortalCity(cityName: string, stateUf?: string): boolean {
  if (!cityName) return false;
  const clean = cityName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const ufClean = (stateUf || '').trim().toUpperCase();

  return ALLOWED_PORTAL_CITIES.some(allowed => {
    const nameMatch = (allowed.aliases as readonly string[]).includes(clean);
    if (!nameMatch) return false;
    if (ufClean && allowed.uf !== ufClean) return false;
    return true;
  });
}

export function getPortalCityId(cityName: string, stateUf?: string): string | null {
  if (!cityName) return null;
  const clean = cityName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const ufClean = (stateUf || '').trim().toUpperCase();

  const found = ALLOWED_PORTAL_CITIES.find(allowed => {
    const nameMatch = (allowed.aliases as readonly string[]).includes(clean);
    if (!nameMatch) return false;
    if (ufClean && allowed.uf !== ufClean) return false;
    return true;
  });

  return found ? found.id : null;
}

export function profileDetailsError(p: ProfileDetails): string {
  if (formatProfileAddress(p).length > 255) {
    return 'O endereço completo deve ter no máximo 255 caracteres.';
  }
  if (p.cep && !/^\d{5}-?\d{3}$/.test(p.cep)) {
    return 'Informe um CEP com 8 dígitos no formato 00000-000.';
  }
  if (p.state && !/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(p.state)) {
    return 'Informe uma UF válida com 2 letras (ex: SC, PR, SP).';
  }

  for (const r of p.schedule) {
    if (!r.closed && (r.open || r.close)) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.close)) {
        return `Informe os horários de abertura e fechamento válidos para ${r.label} (ex: 08:00 às 18:00).`;
      }
      if (r.open === r.close) {
        return `Confira os horários de ${r.label}; o fechamento não pode ser igual ao horário de abertura.`;
      }
    }
  }

  for (const link of [p.x, p.googleBusiness]) {
    if (!link) continue;
    try {
      const u = new URL(link);
      if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) {
        return 'Informe links públicos seguros (http:// ou https://).';
      }
    } catch {
      return 'Informe links válidos com protocolo completo (https://...) para X e Google Meu Negócio.';
    }
  }

  if (Object.values(p).some(v => typeof v === 'string' && v.length > 500)) {
    return 'Um dos campos ultrapassa o limite de 500 caracteres.';
  }

  return '';
}

