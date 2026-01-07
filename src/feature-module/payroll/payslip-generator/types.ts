/**
 * Payslip Generator Types
 */
export interface PayslipFormData {
  month: string;
  year: number;
  payDate: string;
  paidDays: number;
  lossOfPayDays: number;
  template: 'classic' | 'modern' | 'minimal' | 'elegant' | 'corporate' | 'colorful' | 'professional' | 'vibrant';
  currency: string;
  companyName: string;
  companyAddress: string;
  companyLogo: File | null;
  employeeName: string;
  employeeId: string;
  designation: string;
  department: string;
  panNumber: string;
  customEmployeeFields: { [key: string]: string };
  earnings: Array<{ name: string; amount: number }>;
  deductions: Array<{ name: string; amount: number }>;
  customPaySummaryFields: { [key: string]: string };
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  notes: string;
}
