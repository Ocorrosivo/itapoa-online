/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Public Jobs Board Page Component
 */

import React from 'react';
import JobsSection from '../components/JobsSection';
import { useCompany } from '../context/CompanyContext';
import { useSEO } from '../hooks/useSEO';

export const JobsPage: React.FC = () => {
  const { jobs, cities, refreshData } = useCompany();

  useSEO({
    title: 'Vagas de Emprego e Oportunidades em Itapoá SC',
    description: 'Encontre vagas de emprego abertas no comércio e empresas de Itapoá. Envie seu currículo diretamente pelo portal.'
  });

  return (
    <JobsSection
      jobs={jobs}
      cities={cities}
      onApplySuccess={refreshData}
    />
  );
};
