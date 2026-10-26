import React from 'react';
import { Clock } from 'lucide-react';
import { ProfileDetails, DAY_GROUPS } from '../../../utils/companyProfileDetails';

interface ProfileScheduleFieldsProps {
  value: ProfileDetails;
  onChange: (value: ProfileDetails) => void;
  legacyHours?: string;
}

const inputClass = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition disabled:opacity-40 disabled:cursor-not-allowed';

export function ProfileScheduleFields({ value, onChange, legacyHours }: ProfileScheduleFieldsProps) {
  const handleToggleClosed = (index: number, isClosed: boolean) => {
    const updated = value.schedule.map((row, i) => {
      if (i !== index) return row;
      return {
        ...row,
        closed: isClosed,
        // Se abriu e estava vazio, sugere horário comercial padrão para agilizar
        open: isClosed ? '' : (row.open || (index === 0 ? '08:00' : '08:00')),
        close: isClosed ? '' : (row.close || (index === 0 ? '18:00' : '12:00')),
      };
    });
    onChange({ ...value, schedule: updated });
  };

  const handleTimeChange = (index: number, field: 'open' | 'close', timeVal: string) => {
    const updated = value.schedule.map((row, i) => {
      if (i !== index) return row;
      return { ...row, [field]: timeVal };
    });
    onChange({ ...value, schedule: updated });
  };

  const hasConfiguredSchedule = value.schedule.some(r => r.closed || (r.open && r.close));

  return (
    <div className="space-y-4">
      {legacyHours && !hasConfiguredSchedule && (
        <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-300 flex items-start gap-2">
          <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-200">Horário cadastrado anteriormente:</span> {legacyHours}
            <p className="text-[11px] text-slate-400 mt-0.5">
              Configure os dias abaixo para organizar a exibição pública por dia da semana.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DAY_GROUPS.map((label, index) => {
          const row = value.schedule.find(r => r.label === label) || {
            label,
            closed: false,
            open: '',
            close: '',
          };

          return (
            <div
              key={label}
              className={`border rounded-2xl p-4 transition ${
                row.closed
                  ? 'bg-slate-900/60 border-slate-800 text-slate-500'
                  : 'bg-slate-800/40 border-slate-700/80 text-white'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/50 mb-3">
                <span className="text-sm font-bold tracking-tight text-white">{label}</span>
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={row.closed}
                    onChange={e => handleToggleClosed(index, e.target.checked)}
                    className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 bg-slate-800 border-slate-600 cursor-pointer"
                  />
                  <span className={row.closed ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                    {row.closed ? 'Fechado' : 'Aberto'}
                  </span>
                </label>
              </div>

              {row.closed ? (
                <div className="py-5 text-center text-xs font-semibold text-rose-400/80 bg-rose-950/20 border border-rose-900/30 rounded-xl">
                  Estabelecimento Fechado
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Abertura
                      </label>
                      <input
                        type="time"
                        value={row.open}
                        onChange={e => handleTimeChange(index, 'open', e.target.value)}
                        className={inputClass}
                        required={!row.closed}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Fechamento
                      </label>
                      <input
                        type="time"
                        value={row.close}
                        onChange={e => handleTimeChange(index, 'close', e.target.value)}
                        className={inputClass}
                        required={!row.closed}
                      />
                    </div>
                  </div>
                  {row.open && row.close && row.open > row.close && (
                    <p className="text-[11px] text-amber-400 flex items-center gap-1">
                      <span>🌙</span> Horário noturno (ultrapassa a meia-noite)
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
