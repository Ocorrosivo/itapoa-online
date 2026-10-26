import React, { useRef, useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, CheckCircle2, MapPin } from 'lucide-react';
import {
  ProfileDetails,
  isAllowedPortalCity,
  getPortalCityId,
} from '../../../utils/companyProfileDetails';

interface ProfileAddressFieldsProps {
  value: ProfileDetails;
  onChange: (value: ProfileDetails) => void;
  legacyAddress?: string;
  onCityDetected?: (cityId: string) => void;
}

const inputClass = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition placeholder:text-slate-500';

export function ProfileAddressFields({
  value,
  onChange,
  legacyAddress,
  onCityDetected,
}: ProfileAddressFieldsProps) {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; message: string } | null>(null);

  const activeRequest = useRef<AbortController | null>(null);
  const lastQueriedCep = useRef<string>('');
  const currentValue = useRef(value);
  currentValue.current = value;

  useEffect(() => {
    return () => {
      activeRequest.current?.abort();
    };
  }, []);

  const handleChange = (field: keyof ProfileDetails, val: string) => {
    onChange({ ...value, [field]: val });
  };

  const fetchCepData = async (cleanCep: string, signal: AbortSignal) => {
    // 1. Tentar ViaCEP primeiro
    try {
      const resViaCep = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, { signal });
      if (resViaCep.ok) {
        const data = await resViaCep.json();
        if (!data.erro) {
          return {
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
            provider: 'ViaCEP',
          };
        }
      }
    } catch {
      // Falha do ViaCEP -> prossegue para fallback
    }

    // 2. Fallback para BrasilAPI
    try {
      const resBrasilApi = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`, { signal });
      if (resBrasilApi.ok) {
        const data = await resBrasilApi.json();
        return {
          street: data.street || '',
          neighborhood: data.neighborhood || '',
          city: data.city || '',
          state: data.state || '',
          provider: 'BrasilAPI',
        };
      }
    } catch {
      // Falha do BrasilAPI
    }

    return null;
  };

  const handleLookupCep = async (rawCep: string) => {
    const clean = rawCep.replace(/\D/g, '');
    if (clean.length !== 8) {
      if (rawCep.trim().length > 0) {
        setNotice({
          type: 'warning',
          message: 'O CEP deve conter 8 dígitos para busca automática.',
        });
      }
      return;
    }

    if (lastQueriedCep.current === clean && notice?.type === 'success') {
      return; // Evita buscas repetidas para o mesmo CEP já encontrado
    }

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setLoading(true);
    setNotice({ type: 'info', message: 'Consultando endereço pelo CEP…' });

    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const result = await fetchCepData(clean, controller.signal);
      clearTimeout(timeout);

      if (!result) {
        setNotice({
          type: 'warning',
          message: 'CEP não localizado ou serviço indisponível. Você pode preencher os dados manualmente.',
        });
        return;
      }

      lastQueriedCep.current = clean;

      // Validação de cidade permitida (Itapoá/SC ou Curitiba/PR)
      const isAllowed = isAllowedPortalCity(result.city, result.state);
      const portalCityId = getPortalCityId(result.city, result.state);

      const next: ProfileDetails = {
        ...currentValue.current,
        street: result.street || currentValue.current.street,
        neighborhood: result.neighborhood || currentValue.current.neighborhood,
        city: result.city || currentValue.current.city,
        state: result.state || currentValue.current.state,
      };

      onChange(next);

      if (isAllowed && portalCityId && onCityDetected) {
        onCityDetected(portalCityId);
        setNotice({
          type: 'success',
          message: `Endereço encontrado (${result.city}/${result.state}) via ${result.provider}. Cidade sincronizada! Preencha o número.`,
        });
      } else if (!isAllowed) {
        setNotice({
          type: 'warning',
          message: `Atenção: A localidade informada no CEP (${result.city}/${result.state}) ainda não está disponível para cadastro no portal. Atualmente atendemos apenas Itapoá/SC e Curitiba/PR.`,
        });
      } else {
        setNotice({
          type: 'success',
          message: `Endereço encontrado via ${result.provider}. Por favor, confirme o número e complemento.`,
        });
      }
    } catch {
      if (activeRequest.current === controller) {
        setNotice({
          type: 'warning',
          message: 'Tempo limite ou erro ao consultar CEP. Preencha os campos abaixo manualmente.',
        });
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const formatCepInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
  };

  return (
    <div className="space-y-4">
      {legacyAddress && !value.street && !value.cep && (
        <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-300 flex items-start gap-2">
          <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-200">Endereço atual registrado:</span> {legacyAddress}
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ao preencher os campos estruturados abaixo, seu endereço passará a contar com localização detalhada.
            </p>
          </div>
        </div>
      )}

      {/* Ordem solicitada:
          1. CEP
          2. Rua / Avenida / Logradouro
          3. Número
          4. Complemento (opcional)
          5. Bairro
          6. Cidade
          7. Estado (UF)
      */}
      <div className="space-y-4">
        {/* 1. CEP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              CEP <span className="text-slate-500 font-normal">(8 dígitos)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={9}
                value={value.cep}
                placeholder="Ex: 89249-000"
                onChange={e => {
                  const formatted = formatCepInput(e.target.value);
                  handleChange('cep', formatted);
                  if (formatted.replace(/\D/g, '').length === 8) {
                    void handleLookupCep(formatted);
                  }
                }}
                onBlur={() => void handleLookupCep(value.cep)}
                className={`${inputClass} pr-10`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </div>
            </div>
          </div>
          <div className="flex items-end">
            <p className="text-xs text-slate-400 pb-3">
              Informe o CEP para preenchimento automático do logradouro, bairro, cidade e estado.
            </p>
          </div>
        </div>

        {notice && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              notice.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                : notice.type === 'warning'
                ? 'bg-amber-950/50 border-amber-800 text-amber-300'
                : notice.type === 'error'
                ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                : 'bg-blue-950/50 border-blue-800 text-blue-300'
            }`}
          >
            {notice.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {notice.type === 'warning' && <AlertCircle className="w-4 h-4 shrink-0" />}
            {notice.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            {notice.type === 'info' && <Loader2 className="w-4 h-4 shrink-0 animate-spin" />}
            <span>{notice.message}</span>
          </div>
        )}

        {/* 2. Rua / Avenida / Logradouro */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Rua / Avenida / Logradouro
            </label>
            <input
              type="text"
              maxLength={150}
              value={value.street}
              onChange={e => handleChange('street', e.target.value)}
              placeholder="Ex: Rua Portugal"
              className={inputClass}
            />
          </div>

          {/* 3. Número */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Número
            </label>
            <input
              type="text"
              maxLength={20}
              value={value.number}
              onChange={e => handleChange('number', e.target.value)}
              placeholder="Ex: 45 ou S/N"
              className={inputClass}
            />
          </div>
        </div>

        {/* 4. Complemento e 5. Bairro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Complemento <span className="text-slate-500 font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              maxLength={100}
              value={value.complement}
              onChange={e => handleChange('complement', e.target.value)}
              placeholder="Ex: Sala 02, Bloco B, Próximo ao mercado"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Bairro
            </label>
            <input
              type="text"
              maxLength={100}
              value={value.neighborhood}
              onChange={e => handleChange('neighborhood', e.target.value)}
              placeholder="Ex: Sertão, Itapema do Norte"
              className={inputClass}
            />
          </div>
        </div>

        {/* 6. Cidade e 7. Estado (UF) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Cidade
            </label>
            <input
              type="text"
              maxLength={100}
              value={value.city}
              onChange={e => handleChange('city', e.target.value)}
              placeholder="Ex: Itapoá"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Estado (UF)
            </label>
            <input
              type="text"
              maxLength={2}
              value={value.state}
              onChange={e => handleChange('state', e.target.value.toUpperCase())}
              placeholder="SC"
              className={`${inputClass} uppercase`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
