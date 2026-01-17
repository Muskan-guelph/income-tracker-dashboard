export interface BreakdownData {
  cpp: number;
  ei: number;
  federalTax: number;
  provincialTax: number;
  vacationPay: number;
  netIncome: number;
  grossIncome: number;
}

export interface ChartDataPoint {
  name: string;
  uv: number;
}

export interface Company {
  id: string;
  user_id: string;
  name: string;
  work_start_date?: string;
  work_end_date?: string;
  employment_type?: string;
  pay_frequency?: string;
  default_currency?: string;
  is_active?: boolean;
}

export interface IncomeEntry {
  id?: string;
  user_id: string;
  received_date: string;
  period_start?: string;
  period_end?: string;
  company_id?: string;
  source: string;
  amount_type: 'GROSS' | 'NET';
  currency: 'CAD' | 'USD';
  gross_amount: number;
  net_amount: number;
  cpp: number;
  ei: number;
  federal_tax: number;
  provincial_tax: number;
  vacation_pay: number;
  notes?: string;
  created_at?: string;
}