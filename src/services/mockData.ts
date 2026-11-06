import { GudepSettings, PaymentRecord, ScoutMember } from '../types/scout';

export const INITIAL_GUDEP_SETTINGS: GudepSettings = {
  gudepName: 'Gugus Depan Pangkalan',
  pangkalan: 'SMP / Pangkalan Pramuka',
  defaultFeePerMeeting: 5000,
  meetingDay: 'Setiap Sabtu',
  pembinaName: 'Pembina Satuan',
  bendaharaName: 'Bendahara Pasukan',
  currency: 'IDR',
};

// Kosong secara default agar website bersih dari data dummy / tiruan
export const INITIAL_MEMBERS: ScoutMember[] = [];

// Mulai bersih 0 transaksi agar sesuai dengan spreadsheet pengguna
export const INITIAL_TRANSACTIONS: PaymentRecord[] = [];
