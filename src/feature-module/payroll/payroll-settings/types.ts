/**
 * Payroll Settings Types
 */
export interface PayrollSettings {
  id: number;
  organization_id: string;
  organization_name: string;
  // PF Fields
  pf_employee_percentage: number;
  pf_employer_percentage: number;
  pf_wage_limit: number;
  pf_enabled: boolean;
  // ESI Fields
  esi_employee_percentage: number;
  esi_employer_percentage: number;
  esi_wage_limit: number;
  esi_enabled: boolean;
  // Gratuity Fields
  gratuity_percentage: number;
  gratuity_enabled: boolean;
  // PT Fields - State-wise auto calculation
  pt_fixed?: number; // Optional - kept for backward compatibility, not used in UI
  pt_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayrollSettingsResponse {
  message: string;
  data: PayrollSettings | null;
  status: boolean;
}
