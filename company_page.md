Build a “Companies” section for an Income Tracker web app that matches this existing UI style: dark glassmorphism cards, violet/pink/indigo gradient glow background, rounded pills, subtle borders, soft shadows, premium finance dashboard aesthetic.

Global requirements

Tech: React + TypeScript + Tailwind, data from Supabase.

Must support CRUD for companies: create, read, update, delete (soft delete preferred).

Must show real Supabase rows (table view) and compute Total Net Income per company and overall.

Responsive: desktop-first (Mac 13”), but should scale down cleanly.

A) Supabase data model

```sql

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  work_start_date date NOT NULL,
  work_end_date date,
  employment_type text DEFAULT 'full_time'::text CHECK (employment_type = ANY (ARRAY['full_time'::text, 'part_time'::text, 'contract'::text, 'intern'::text, 'casual'::text])),
  pay_frequency text CHECK (pay_frequency = ANY (ARRAY['weekly'::text, 'bi_weekly'::text, 'semi_monthly'::text, 'monthly'::text])),
  default_currency character DEFAULT 'CAD'::bpchar,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  hourly_wage numeric CHECK (hourly_wage IS NULL OR hourly_wage >= 0::numeric),
  pay_schedule text CHECK (pay_schedule IS NULL OR (pay_schedule = ANY (ARRAY['weekly'::text, 'bi_weekly'::text, 'semi_monthly'::text, 'monthly'::text]))),
  CONSTRAINT companies_pkey PRIMARY KEY (id),
  CONSTRAINT companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.income_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_id uuid NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size integer NOT NULL CHECK (file_size >= 0),
  r2_key text NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT income_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT income_attachments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT income_attachments_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.income_entries(id)
);
CREATE TABLE public.income_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  received_date date NOT NULL,
  period_start date,
  period_end date,
  source text NOT NULL,
  amount_type text NOT NULL CHECK (amount_type = ANY (ARRAY['GROSS'::text, 'NET'::text])),
  currency text NOT NULL DEFAULT 'CAD'::text CHECK (currency = ANY (ARRAY['CAD'::text, 'USD'::text])),
  gross_amount numeric,
  net_amount numeric,
  cpp numeric NOT NULL DEFAULT 0,
  ei numeric NOT NULL DEFAULT 0,
  federal_tax numeric NOT NULL DEFAULT 0,
  provincial_tax numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  vacation_pay numeric NOT NULL DEFAULT 0,
  company_id uuid,
  CONSTRAINT income_entries_pkey PRIMARY KEY (id),
  CONSTRAINT income_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT income_entries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
```


B) Companies List Page (main view)
Layout

Page title: Companies

Subtitle breadcrumb: Home / Income Tracker / Companies

Two main columns:

Companies Table Card (dominant left/center)

Summary Card (right column)

1) Companies Table Card (Supabase data grid)

Show a sleek table inside a glass card with sticky header and soft separators.

Columns:

Company (name)

Hourly Wage

Pay Schedule

Employment Dates (Start – End)

Total Net Income (computed from incomes)

Status (Active/Ended)

Actions (Edit, Delete)

Arrow/chevron at far right to open details page

Row behavior:

Hover: subtle glow highlight

Clicking the chevron/arrow opens Company Details page for that company.

Top controls above table:

Search (company name)

Filter pill: Active / All / Ended

Sort: Total Net Income (desc), Name, Recently added

Primary button: + Add Company

CRUD behavior:

Add Company opens modal with fields: name, hourly_wage, pay_schedule, work_start_date, work_end_date optional.

Edit opens same modal prefilled.

Delete uses soft delete (is_active=false) with confirm.

Inline toast notifications for success/error.

2) Summary Card (right column)

Show:

Total Net Income (All Companies) big number

Small list: top 3 companies by net income

Badge showing how many active companies

Mini sparkline of total net income over last 6 months (optional)

C) Company Details Page (opened by arrow)
Top header

Back button: ← Companies

Company name + badges: Active/Ended, Pay Schedule, Hourly Wage

Date range selector (Last 6 months / YTD / Custom)

Analytics sections (match home page vibe)

Use the same chart style as the homepage cards.

1) Income Breakdown Donut (like home page)

Donut chart showing Net vs Deductions or Deductions composition.

Center label: Net total for selected range.

Small chips above the donut: CPP %, EI %, Federal %, Provincial %.

2) Line Graph (like home page)

Line chart of Net Income over time (by received_date or by pay period).

Toggle: Group by “Pay Date” vs “Pay Period End”

Tooltip shows gross, net, deductions on hover.

3) Tax Breakdown Card

A compact card listing:

CPP total

EI total

Federal total

Provincial total

Total deductions
Show both selected range + YTD toggle.

D) Payments Calendar (key feature)

Add a calendar card that displays past and upcoming payment dates.

Calendar rules:

Use received_date from income entries.

Dates with payments show a small dot underneath (glowing accent).

Past payments: muted dot; upcoming: brighter dot.

Selecting a date with payment opens a Payment Details drawer/modal.

E) Payment Details (modal/drawer)

When user clicks a date that has one or more payments:

Show:

Pay Date (received_date)

Pay Period (start–end)

Company name

Gross, Net

Earnings breakdown: base pay, vacation pay, overtime, bonuses

Deductions breakdown: CPP, EI, Federal, Provincial

Attached payslip preview (if exists)

“View full transaction” link opens the full income entry page

If multiple payments on same date, show them as stacked cards in the drawer.

F) Visual style constraints (must match current design)

Dark gradient background: deep navy base with violet/pink/blue blooms.

Cards are glassy: blur, subtle border, soft inner glow.

Rounded corners (2xl), pill inputs.

Typography: clean, modern; large totals; muted labels.

Chart colors consistent with existing palette (pink/purple/blue/cyan accents).

Animations: subtle (hover glow, chart transitions, modal slide-in).

G) Data + calculations

Total Net Income per company = SUM(incomes.net_amount) filtered by company_id and selected date range.

Deductions totals = SUM of deductions lines for those incomes.

Calendar events = group incomes by received_date.

Tax breakdown uses deductions categories.
