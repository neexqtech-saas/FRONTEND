/**
 * Payslip Generator Helper Functions
 */

export const validatePayslipForm = (formData: any): string[] => {
  const errors: string[] = [];

  if (!formData.month) errors.push("Month is required");
  if (!formData.year) errors.push("Year is required");
  if (!formData.payDate) errors.push("Pay date is required");
  if (!formData.employeeName) errors.push("Employee name is required");
  if (formData.earnings.length === 0) errors.push("At least one earning is required");

  return errors;
};

export const calculateTotals = (earnings: Array<{ amount: number }>, deductions: Array<{ amount: number }>) => {
  const totalEarnings = earnings.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalDeductions = deductions.reduce((sum, item) => sum + (item.amount || 0), 0);
  const netPay = totalEarnings - totalDeductions;

  return { totalEarnings, totalDeductions, netPay };
};
