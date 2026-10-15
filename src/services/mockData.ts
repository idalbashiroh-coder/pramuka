import { GudepSettings, PaymentRecord, ScoutMember } from '../types/scout';

export const INITIAL_GUDEP_SETTINGS: GudepSettings = {
  gudepName: 'Gugus Depan 04.015 - 04.016',
  pangkalan: 'SMP Negeri 1 Cendekia Nusantara',
  defaultFeePerMeeting: 5000,
  meetingDay: 'Setiap Sabtu (15.00 - 17.00 WIB)',
  pembinaName: 'Kak Budi Santoso, S.Pd. (Pembina Mahir)',
  bendaharaName: 'Kak Siti Rahmawati (Bendahara Pasukan)',
  currency: 'IDR',
};

export const INITIAL_MEMBERS: ScoutMember[] = [
  // Regu Garuda (Putra)
  { id: 'M-001', name: 'Ahmad Fauzan (Pratama)', regu: 'Regu Garuda', gender: 'L', level: 'Penggalang Terap', isPinru: true, active: true, phone: '081234567801' },
  { id: 'M-002', name: 'Bima Satria', regu: 'Regu Garuda', gender: 'L', level: 'Penggalang Rakit', isPinru: false, active: true, phone: '081234567802' },
  { id: 'M-003', name: 'Dimas Prasetyo', regu: 'Regu Garuda', gender: 'L', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567803' },
  { id: 'M-004', name: 'Farhan Maulana', regu: 'Regu Garuda', gender: 'L', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567804' },
  { id: 'M-005', name: 'Rendy Pratama', regu: 'Regu Garuda', gender: 'L', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567805' },

  // Regu Rajawali (Putra)
  { id: 'M-006', name: 'Rizky Alamsyah', regu: 'Regu Rajawali', gender: 'L', level: 'Penggalang Rakit', isPinru: true, active: true, phone: '081234567806' },
  { id: 'M-007', name: 'Aditya Pratama', regu: 'Regu Rajawali', gender: 'L', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567807' },
  { id: 'M-008', name: 'Dani Firmansyah', regu: 'Regu Rajawali', gender: 'L', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567808' },
  { id: 'M-009', name: 'Hendra Saputra', regu: 'Regu Rajawali', gender: 'L', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567809' },
  { id: 'M-010', name: 'Arka Dewantara', regu: 'Regu Rajawali', gender: 'L', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567810' },

  // Regu Elang (Putra)
  { id: 'M-011', name: 'Ilham Kurniawan', regu: 'Regu Elang', gender: 'L', level: 'Penggalang Rakit', isPinru: true, active: true, phone: '081234567811' },
  { id: 'M-012', name: 'Tegar Wicaksono', regu: 'Regu Elang', gender: 'L', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567812' },
  { id: 'M-013', name: 'Gilang Ramadhan', regu: 'Regu Elang', gender: 'L', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567813' },
  { id: 'M-014', name: 'Wahyu Nugroho', regu: 'Regu Elang', gender: 'L', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567814' },

  // Regu Melati (Putri)
  { id: 'M-015', name: 'Nasywa Azzahra (Pratami)', regu: 'Regu Melati', gender: 'P', level: 'Penggalang Terap', isPinru: true, active: true, phone: '081234567815' },
  { id: 'M-016', name: 'Tiara Anindya', regu: 'Regu Melati', gender: 'P', level: 'Penggalang Rakit', isPinru: false, active: true, phone: '081234567816' },
  { id: 'M-017', name: 'Zahra Amelia', regu: 'Regu Melati', gender: 'P', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567817' },
  { id: 'M-018', name: 'Alya Putri', regu: 'Regu Melati', gender: 'P', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567818' },
  { id: 'M-019', name: 'Salwa Khairunisa', regu: 'Regu Melati', gender: 'P', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567819' },

  // Regu Mawar (Putri)
  { id: 'M-020', name: 'Cantika Dewi', regu: 'Regu Mawar', gender: 'P', level: 'Penggalang Rakit', isPinru: true, active: true, phone: '081234567820' },
  { id: 'M-021', name: 'Dinda Kirana', regu: 'Regu Mawar', gender: 'P', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567821' },
  { id: 'M-022', name: 'Syifa Nuraini', regu: 'Regu Mawar', gender: 'P', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567822' },
  { id: 'M-023', name: 'Clarissa Rahma', regu: 'Regu Mawar', gender: 'P', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567823' },

  // Regu Teratai (Putri)
  { id: 'M-024', name: 'Annisa Maharani', regu: 'Regu Teratai', gender: 'P', level: 'Penggalang Rakit', isPinru: true, active: true, phone: '081234567824' },
  { id: 'M-025', name: 'Vina Panduwinata', regu: 'Regu Teratai', gender: 'P', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567825' },
  { id: 'M-026', name: 'Felicia Nurul', regu: 'Regu Teratai', gender: 'P', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567826' },
  { id: 'M-027', name: 'Kayla Safitri', regu: 'Regu Teratai', gender: 'P', level: 'Penggalang Ramu', isPinru: false, active: true, phone: '081234567827' },
];

// Start clean with 0 transactions so app state strictly matches spreadsheet
export const INITIAL_TRANSACTIONS: PaymentRecord[] = [];

