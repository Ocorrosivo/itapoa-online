/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Form Validators & Input Sanitizer Module
 */

export class Validators {
  /**
   * Validate Email format
   */
  static isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  }

  /**
   * Validate Brazilian Phone / WhatsApp
   */
  static isValidPhone(phone: string): boolean {
    const clean = phone.replace(/\D/g, '');
    return clean.length >= 10 && clean.length <= 11;
  }

  /**
   * Format Phone to (XX) XXXXX-XXXX
   */
  static formatPhone(phone: string): string {
    return maskPhone(phone);
  }

  /**
   * Realtime progressive phone mask
   */
  static maskPhone(value: string): string {
    return maskPhone(value);
  }

  /**
   * Validate CNPJ with digit calculation
   */
  static isValidCNPJ(cnpj: string): boolean {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14 || /^(\d)\1+$/.test(clean)) return false;

    let size = clean.length - 2;
    let numbers = clean.substring(0, size);
    const digits = clean.substring(size);
    let sum = 0;
    let pos = size - 7;

    for (let i = size; i >= 1; i--) {
      sum += Number(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== Number(digits.charAt(0))) return false;

    size = size + 1;
    numbers = clean.substring(0, size);
    sum = 0;
    pos = size - 7;

    for (let i = size; i >= 1; i--) {
      sum += Number(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result === Number(digits.charAt(1));
  }

  /**
   * XSS Input Sanitizer
   */
  static sanitizeInput(str: string): string {
    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}

/**
 * Máscara progressiva para telefone fixo (10 dígitos) e celular (11 dígitos)
 * Exemplos:
 * 47 -> (47)
 * 47997190413 -> (47) 99719-0413
 * 4734432000 -> (47) 3443-2000
 */
export function maskPhone(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

