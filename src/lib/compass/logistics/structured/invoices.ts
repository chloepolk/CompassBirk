/** structured — generated from Compass Logistics Procurement Synthetic Dataset v1.2 (Invoices). Do not import xlsx at runtime. */
import data from "./invoices.json"

export type Invoices = {
  invoiceId: string | null
  month: string | null
  supplierId: string | null
  laneId: string | null
  invoiceDate: string | null
  contractedAmountEur: number | null
  invoicedAmountEur: number | null
  rateCompliant: number | null
  invoiceAccurate: number | null
  exceptionReason: string | null
  status: string | null
}

export const INVOICES: Invoices[] = data as Invoices[]
