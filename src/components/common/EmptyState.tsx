/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unified Design System Empty State Component
 */

import React from 'react';
import { Search, AlertCircle, ShieldAlert, FileQuestion } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  type?: 'search' | 'error' | 'permission' | 'empty';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'search',
  title,
  description,
  actionText,
  onAction
}) => {
  const config = {
    search: {
      icon: Search,
      defaultTitle: 'Nenhum resultado encontrado.',
      defaultDesc: 'Não encontramos itens para os termos pesquisados. Tente buscar por outras palavras-chave ou categorias.'
    },
    error: {
      icon: AlertCircle,
      defaultTitle: 'Ocorreu um erro no sistema.',
      defaultDesc: 'Não foi possível carregar as informações no momento. Por favor, tente novamente mais tarde.'
    },
    permission: {
      icon: ShieldAlert,
      defaultTitle: 'Acesso Restrito',
      defaultDesc: 'Você não possui permissões suficientes para visualizar esta página ou recurso.'
    },
    empty: {
      icon: FileQuestion,
      defaultTitle: 'Nenhum registro cadastrado.',
      defaultDesc: 'Ainda não existem dados cadastrados nesta seção.'
    }
  };

  const currentConfig = config[type];
  const IconComponent = currentConfig.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm max-w-lg mx-auto my-8">
      <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#C8102E] flex items-center justify-center mx-auto shadow-sm">
        <IconComponent className="w-7 h-7" />
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-black text-slate-900 tracking-tight">
          {title || currentConfig.defaultTitle}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          {description || currentConfig.defaultDesc}
        </p>
      </div>

      {actionText && onAction && (
        <div className="pt-2">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};
