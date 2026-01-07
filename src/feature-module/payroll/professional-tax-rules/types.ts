/**
 * Professional Tax Rules Types
 */
export interface ProfessionalTaxRule {
  id: number;
  state_id: number;
  state_name: string;
  salary_from: number;
  salary_to: number | null;
  tax_amount: number;
  applicable_month: number | null;
  is_active: boolean;
  created_at: string;
}

export interface ProfessionalTaxRulesResponse {
  message: string;
  data: ProfessionalTaxRule[];
  status: boolean;
}
