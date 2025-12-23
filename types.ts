
export enum EntryType {
  READING = 'READING',
  DELIVERY = 'DELIVERY'
}

export interface OilEntry {
  id: string;
  date: string;
  type: EntryType;
  levelCm?: number; // For readings
  liters?: number;  // Calculated for readings, or raw for deliveries
  cost?: number;    // For deliveries
  note?: string;    // For deliveries
}

export interface UsageStats {
  totalSpent: number;
  avgDailyUsage: number;
  currentLevelLiters: number;
  estimatedDaysRemaining: number;
}
