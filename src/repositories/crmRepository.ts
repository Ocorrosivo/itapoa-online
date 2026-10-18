/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * CRM Repository - Managing Multi-tenant Leads & Deals
 */


import { CrmLead } from '../types';

export class CrmRepository {
  static async getLeadsByCompany(companyId: string): Promise<CrmLead[]> {


    try {
      const res = await fetch(`/api/crm/leads?companyId=${companyId}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('API fallback error for CRM leads');
    }

    return [];
  }

  static async saveLead(lead: Partial<CrmLead>): Promise<CrmLead> {


    try {
      const res = await fetch('/api/crm/leads', {
        method: lead.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('API fallback error saving CRM lead:', err);
    }

    return {
      id: lead.id || `lead_${Date.now()}`,
      companyId: lead.companyId || '',
      name: lead.name || '',
      companyName: lead.companyName || '',
      email: lead.email || '',
      phone: lead.phone || '',
      status: lead.status || 'new',
      value: lead.value || 0,
      notes: lead.notes || '',
      createdAt: new Date().toISOString()
    };
  }

}
