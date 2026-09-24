/** structured — generated from Compass Logistics Procurement Synthetic Dataset v1.2 (Shipments). Do not import xlsx at runtime. */
import data from "./shipments.json"

export type Shipments = {
  month: string | null
  laneId: string | null
  supplierId: string | null
  pickupDate: string | null
  promisedDelivery: string | null
  actualDelivery: string | null
  onTimeDelivery: number | null
  tenderAccepted: number | null
  damageClaim: number | null
  weightKg: number | null
  actualFreightCostEur: number | null
  sHP00001: string | null
}

export const SHIPMENTS: Shipments[] = data as Shipments[]
