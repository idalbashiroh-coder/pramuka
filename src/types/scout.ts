export type ScoutLevel =
  | 'Siaga'
  | 'Siaga Mula'
  | 'Siaga Bantu'
  | 'Siaga Tata'
  | 'Penggalang'
  | 'Penggalang Ramu'
  | 'Penggalang Rakit'
  | 'Penggalang Terap'
  | 'Penegak'
  | 'Penegak Bantara'
  | 'Penegak Laksana'
  | 'Pandega';

export interface ScoutMember {
  id: string;
  name: string;
  regu: string;
  gender: 'L' | 'P';
  level: ScoutLevel;
  phone?: string;
  isPinru?: boolean; // Pemimpin Regu / Wakil
  active: boolean;
  joinDate?: string;
}

export type PaymentMethod = 'Tunai' | 'QRIS' | 'Transfer';

export interface PaymentRecord {
  id: string;
  memberId: string;
  memberName: string;
  regu: string;
  date: string; // YYYY-MM-DD
  monthPeriod: string; // YYYY-MM (e.g. "2026-10")
  weekNumber: number; // 1 to 5 within month
  amount: number;
  paymentMethod: PaymentMethod;
  note?: string;
  loggedBy: string;
  timestamp: string; // ISO string
}

export interface GudepSettings {
  gudepName: string; // e.g. "Gugus Depan 04.015 - 04.016"
  pangkalan: string; // e.g. "SMP Negeri 1 Nusantara"
  defaultFeePerMeeting: number; // e.g. 5000
  meetingDay: string; // e.g. "Setiap Sabtu Sore"
   pembinaName: string;
  bendaharaName: string;
  currency: string;
}

export interface SheetConfig {
  spreadsheetId: string | null;
  spreadsheetTitle: string;
  spreadsheetUrl: string | null;
  isConnected: boolean;
  lastSyncedAt: string | null;
  sheetTabs: string[];
}

export interface MonthlyRecapSummary {
  monthPeriod: string; // "2026-10"
  monthLabel: string; // "Oktober 2026"
  totalMembers: number;
  activeMembers: number;
  expectedTotal: number;
  totalCollected: number;
  complianceRate: number; // 0 - 100%
  paidFullCount: number;
  partialCount: number;
  unpaidCount: number;
  totalTransactions: number;
}

export interface ReguRecapSummary {
  reguName: string;
  memberCount: number;
  pinruName?: string;
  totalCollectedMonth: number;
  totalExpectedMonth: number;
  complianceRateMonth: number;
  totalAccumulated: number;
  paidMembersCount: number;
  unpaidMembersCount: number;
}
