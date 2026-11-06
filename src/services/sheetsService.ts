import { GudepSettings, PaymentMethod, PaymentRecord, ScoutLevel, ScoutMember } from '../types/scout';

export const SHEETS_NAMES = {
  MEMBERS: 'DATA_ANGGOTA',
  TRANSACTIONS: 'TRANSAKSI_IURAN',
  MONTHLY_RECAP: 'REKAP_BULANAN',
  REGU_RECAP: 'REKAP_REGU',
  SETTINGS: 'PENGATURAN_GUDEP',
};

export const FIXED_SPREADSHEET_ID = '1deLLyW5F5lCbukK2QJExbzdDV1YihjTCzogGtruo7-A';
export const FIXED_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${FIXED_SPREADSHEET_ID}/edit`;

/**
 * Translates Google API errors into friendly actionable messages in Indonesian
 */
export function formatGoogleErrorMessage(status: number, rawError: string): string {
  try {
    const parsed = JSON.parse(rawError);
    const message = parsed?.error?.message || '';
    const statusText = parsed?.error?.status || '';

    if (
      status === 403 ||
      statusText === 'PERMISSION_DENIED' ||
      message.toLowerCase().includes('permission') ||
      message.toLowerCase().includes('insufficient')
    ) {
      return 'Izin akses Google Sheets dibatasi. Pastikan pengaturan Akses Umum spreadsheet telah diubah menjadi "Siapa saja yang memiliki link: Pelihat" agar aplikasi dapat membaca dan menyinkronkan data secara otomatis.';
    }

    if (status === 401 || statusText === 'UNAUTHENTICATED') {
      return 'Sesi token Google telah kedaluwarsa.';
    }

    if (status === 404 || statusText === 'NOT_FOUND') {
      return 'Spreadsheet tidak ditemukan di Google Drive. Pastikan ID spreadsheet benar.';
    }

    if (message) {
      return `Kendala Google Sheets: ${message}`;
    }
  } catch {
    // ignore
  }

  return `Gagal menghubungkan Google Sheets (${status}): ${rawError}`;
}

/**
 * Parse delimited text (CSV, TSV, Indonesian Semicolon CSV) into 2D string array
 */
export function parseDelimitedText(text: string): string[][] {
  if (!text || !text.trim()) return [];

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Determine separator from the first non-empty line
  const firstLine = lines[0];
  let delimiter = ',';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;

  if (tabCount >= semicolonCount && tabCount >= commaCount && tabCount > 0) {
    delimiter = '\t';
  } else if (semicolonCount >= commaCount && semicolonCount > 0) {
    delimiter = ';';
  }

  const result: string[][] = [];
  for (const line of lines) {
    const row: string[] = [];
    let inQuotes = false;
    let currentCell = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    result.push(row);
  }

  return result;
}

/**
 * Ensures all members have unique IDs and removes true duplicate rows.
 * If multiple members in a sheet share an ID (e.g. Putra 1-10 and Putri 1-10 both having M-001..M-010),
 * this preserves each unique person and re-assigns guaranteed unique distinct IDs.
 */
export function ensureUniqueMembers(members: ScoutMember[]): ScoutMember[] {
  if (!Array.isArray(members)) return [];

  const seenPersons = new Set<string>();
  const seenIds = new Set<string>();
  const sanitized: ScoutMember[] = [];
  let counter = 1;

  for (const m of members) {
    if (!m || !m.name || !m.name.trim()) continue;

    const trimmedName = m.name.trim();
    const trimmedRegu = m.regu?.trim() || 'Regu Garuda';

    // Discard duplicate records of the exact same individual
    const personKey = `${trimmedName.toLowerCase()}:::${trimmedRegu.toLowerCase()}`;
    if (seenPersons.has(personKey)) {
      continue;
    }
    seenPersons.add(personKey);

    let id = (m.id || '').trim();
    if (!id || seenIds.has(id)) {
      while (seenIds.has(`M-${String(counter).padStart(3, '0')}`)) {
        counter++;
      }
      id = `M-${String(counter).padStart(3, '0')}`;
      counter++;
    }

    seenIds.add(id);

    sanitized.push({
      ...m,
      id,
      name: trimmedName,
      regu: trimmedRegu,
    });
  }

  return sanitized;
}

/**
 * Parses ScoutMember list from 2D table rows with smart column detection
 */
export function parseMembersFromRows(rows: string[][]): ScoutMember[] {
  if (!rows || rows.length === 0) return [];

  let headerRowIndex = -1;
  let nameCol = -1;
  let reguCol = -1;
  let genderCol = -1;
  let levelCol = -1;
  let phoneCol = -1;
  let pinruCol = -1;
  let activeCol = -1;
  let idCol = -1;

  // Scan first 5 rows for header row
  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r].map((c) => (c || '').toLowerCase().trim());
    const hasMemberKeywords = row.some(
      (c) =>
        c.includes('nama') ||
        c.includes('anggota') ||
        c.includes('siswa') ||
        c.includes('peserta') ||
        c.includes('member')
    );

    if (hasMemberKeywords) {
      headerRowIndex = r;
      row.forEach((cell, idx) => {
        if (cell.includes('id') || cell.includes('nis') || cell.includes('no induk') || cell.startsWith('no.')) {
          if (idCol === -1) idCol = idx;
        }
        if (cell.includes('nama') || cell.includes('name') || cell.includes('siswa') || cell.includes('peserta')) {
          if (nameCol === -1 || cell.includes('anggota') || cell.includes('lengkap')) nameCol = idx;
        }
        if (cell.includes('regu') || cell.includes('barung') || cell.includes('kelas') || cell.includes('pasukan')) {
          reguCol = idx;
        }
        if (cell.includes('gender') || cell.includes('kelamin') || cell.includes('jk') || cell.includes('l/p')) {
          genderCol = idx;
        }
        if (cell.includes('tingkat') || cell.includes('golongan') || cell.includes('ramu') || cell.includes('rakit')) {
          levelCol = idx;
        }
        if (cell.includes('kontak') || cell.includes('hp') || cell.includes('wa') || cell.includes('telp') || cell.includes('telepon')) {
          phoneCol = idx;
        }
        if (cell.includes('pinru') || cell.includes('jabatan') || cell.includes('posisi')) {
          pinruCol = idx;
        }
        if (cell.includes('aktif') || cell.includes('status')) {
          activeCol = idx;
        }
      });
      break;
    }
  }

  // Fallbacks if columns not identified
  if (nameCol === -1) {
    if (rows[0] && rows[0].length >= 2 && (/^\d+$/.test(rows[0][0]) || rows[0][0].toLowerCase().includes('id'))) {
      idCol = 0;
      nameCol = 1;
    } else {
      nameCol = 0;
    }
  }
  if (reguCol === -1) reguCol = nameCol === 0 ? 1 : 2;
  if (genderCol === -1) genderCol = 3;
  if (levelCol === -1) levelCol = 4;
  if (phoneCol === -1) phoneCol = 5;
  if (pinruCol === -1) pinruCol = 6;
  if (activeCol === -1) activeCol = 7;

  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const rawMembers: ScoutMember[] = [];
  const seenIds = new Set<string>();
  const seenPersons = new Set<string>();
  let nextCounter = 1;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every((c) => !c || !c.trim())) continue;

    const rawName = (nameCol >= 0 && row[nameCol]) ? row[nameCol].trim() : (row[0] || '').trim();
    if (!rawName) continue;

    // Skip summary or repeated header rows
    const nameLower = rawName.toLowerCase();
    if (
      nameLower.startsWith('total') ||
      nameLower.startsWith('jumlah') ||
      nameLower.startsWith('rekap') ||
      nameLower === 'nama' ||
      nameLower === 'nama anggota' ||
      nameLower === 'nama lengkap' ||
      nameLower.includes('peringkat')
    ) {
      continue;
    }

    const rawRegu = (reguCol >= 0 && row[reguCol]) ? row[reguCol].trim() : '';
    let regu = rawRegu || 'Regu Garuda';
    if (!regu.toLowerCase().startsWith('regu ') && !regu.toLowerCase().startsWith('barung ')) {
      regu = `Regu ${regu}`;
    }

    // Skip duplicate entries of the same person
    const personKey = `${rawName.toLowerCase()}:::${regu.toLowerCase()}`;
    if (seenPersons.has(personKey)) {
      continue;
    }
    seenPersons.add(personKey);

    const rawId = (idCol >= 0 && row[idCol]) ? row[idCol].trim() : '';
    let id = '';
    if (rawId) {
      if (rawId.startsWith('M-') || rawId.startsWith('ID-')) {
        id = rawId;
      } else if (/^\d+$/.test(rawId)) {
        id = `M-${rawId.padStart(3, '0')}`;
      } else if (rawId.length >= 2 && !rawId.includes(' ')) {
        id = rawId;
      }
    }

    // Disambiguate if ID was empty or already used in previous row
    if (!id || seenIds.has(id)) {
      while (seenIds.has(`M-${String(nextCounter).padStart(3, '0')}`)) {
        nextCounter++;
      }
      id = `M-${String(nextCounter).padStart(3, '0')}`;
      nextCounter++;
    }
    seenIds.add(id);

    const rawGender = (genderCol >= 0 && row[genderCol]) ? row[genderCol].toLowerCase().trim() : '';
    const gender: 'L' | 'P' =
      rawGender.includes('putri') || rawGender.includes('perempuan') || rawGender === 'p' || rawGender === 'f'
        ? 'P'
        : 'L';

    const rawLevel = (levelCol >= 0 && row[levelCol]) ? row[levelCol].trim() : '';
    let level: ScoutLevel = 'Penggalang Ramu';
    if (rawLevel.toLowerCase().includes('terap')) level = 'Penggalang Terap';
    else if (rawLevel.toLowerCase().includes('rakit')) level = 'Penggalang Rakit';
    else if (rawLevel.toLowerCase().includes('bantara')) level = 'Penegak Bantara';
    else if (rawLevel.toLowerCase().includes('laksana')) level = 'Penegak Laksana';
    else if (rawLevel.toLowerCase().includes('siaga')) level = 'Siaga Tata';

    const rawPhone = (phoneCol >= 0 && row[phoneCol]) ? row[phoneCol].trim() : '';
    const phone = rawPhone && rawPhone !== '-' ? rawPhone : '';

    const rawPinru = (pinruCol >= 0 && row[pinruCol]) ? row[pinruCol].toLowerCase().trim() : '';
    const isPinru =
      rawPinru.includes('pinru') ||
      rawPinru.includes('ketua') ||
      rawPinru.includes('pemimpin') ||
      rawPinru === 'ya' ||
      rawPinru === 'true' ||
      rawPinru === '1';

    const rawActive = (activeCol >= 0 && row[activeCol]) ? row[activeCol].toLowerCase().trim() : '';
    const active = !(
      rawActive.includes('tidak') ||
      rawActive.includes('non') ||
      rawActive === 'false' ||
      rawActive === 'pasif' ||
      rawActive === '0'
    );

    rawMembers.push({
      id,
      name: rawName,
      regu,
      gender,
      level,
      phone,
      isPinru,
      active,
    });
  }

  return ensureUniqueMembers(rawMembers);
}

/**
 * Parses PaymentRecord list from 2D table rows with smart column detection
 */
export function parseTransactionsFromRows(rows: string[][]): PaymentRecord[] {
  if (!rows || rows.length === 0) return [];

  let headerRowIndex = -1;
  let idCol = -1;
  let dateCol = -1;
  let monthCol = -1;
  let weekCol = -1;
  let memberIdCol = -1;
  let memberNameCol = -1;
  let reguCol = -1;
  let amountCol = -1;
  let methodCol = -1;
  let loggedByCol = -1;
  let noteCol = -1;

  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r].map((c) => (c || '').toLowerCase().trim());
    const hasTxHeader = row.some(
      (c) =>
        c.includes('nominal') ||
        c.includes('iuran') ||
        c.includes('jumlah') ||
        c.includes('transaksi') ||
        c.includes('bayar')
    );

    if (hasTxHeader) {
      headerRowIndex = r;
      row.forEach((cell, idx) => {
        if (cell.includes('id transaksi') || (cell.includes('id') && !cell.includes('anggota'))) idCol = idx;
        if (cell.includes('tanggal') || cell.includes('tgl') || cell.includes('date')) dateCol = idx;
        if (cell.includes('periode') || cell.includes('bulan')) monthCol = idx;
        if (cell.includes('minggu') || cell.includes('pekan')) weekCol = idx;
        if (cell.includes('id anggota') || cell.includes('nis') || cell.includes('id member')) memberIdCol = idx;
        if (cell.includes('nama') || cell.includes('anggota') || cell.includes('siswa')) {
          if (memberNameCol === -1 || cell.includes('anggota')) memberNameCol = idx;
        }
        if (cell.includes('regu') || cell.includes('barung') || cell.includes('kelas')) reguCol = idx;
        if (
          cell.includes('nominal') ||
          cell.includes('jumlah') ||
          cell.includes('iuran') ||
          cell.includes('total') ||
          cell.includes('rp')
        ) {
          amountCol = idx;
        }
        if (cell.includes('metode') || cell.includes('cara bayar')) methodCol = idx;
        if (cell.includes('oleh') || cell.includes('petugas') || cell.includes('bendahara') || cell.includes('pencatat')) {
          loggedByCol = idx;
        }
        if (cell.includes('catatan') || cell.includes('keterangan') || cell.includes('note')) noteCol = idx;
      });
      break;
    }
  }

  // Fallbacks if columns not identified
  if (amountCol === -1) amountCol = 7;
  if (memberNameCol === -1) memberNameCol = 5;
  if (dateCol === -1) dateCol = 1;
  if (idCol === -1) idCol = 0;

  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const transactions: PaymentRecord[] = [];
  const seenTxIds = new Set<string>();

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every((c) => !c || !c.trim())) continue;

    const firstCell = String(row[0] || '').toLowerCase().trim();
    if (firstCell.startsWith('total') || firstCell.startsWith('jumlah') || firstCell.startsWith('rekap')) continue;

    const rawAmount = amountCol >= 0 && row[amountCol] ? row[amountCol] : '';
    let amount = 0;
    if (rawAmount) {
      const num = parseInt(rawAmount.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > 0) amount = num;
    }

    const rawName = (memberNameCol >= 0 && row[memberNameCol]) ? row[memberNameCol].trim() : '';
    if (!rawName && amount === 0) continue;

    const rawId = (idCol >= 0 && row[idCol]) ? row[idCol].trim() : '';
    let id = rawId.startsWith('TX-') ? rawId : `TX-${String(transactions.length + 1).padStart(6, '0')}`;
    if (seenTxIds.has(id)) {
      id = `TX-${String(transactions.length + 1).padStart(6, '0')}-${r}`;
    }
    seenTxIds.add(id);

    const rawDate = (dateCol >= 0 && row[dateCol]) ? row[dateCol].trim() : '';
    let date = new Date().toISOString().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
      date = rawDate.slice(0, 10);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(rawDate)) {
      const parts = rawDate.split('/');
      date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    const rawMonth = (monthCol >= 0 && row[monthCol]) ? row[monthCol].trim() : '';
    const monthPeriod = /^\d{4}-\d{2}/.test(rawMonth) ? rawMonth.slice(0, 7) : date.slice(0, 7);

    const rawWeek = (weekCol >= 0 && row[weekCol]) ? row[weekCol] : '';
    const weekNumber = parseInt(String(rawWeek).replace(/\D/g, ''), 10) || 1;

    const rawMemberId = (memberIdCol >= 0 && row[memberIdCol]) ? row[memberIdCol].trim() : '';
    const memberId = rawMemberId || `M-${String(transactions.length + 1).padStart(3, '0')}`;

    const memberName = rawName || 'Anggota Pramuka';

    const rawRegu = (reguCol >= 0 && row[reguCol]) ? row[reguCol].trim() : '';
    const regu = rawRegu || 'Regu Garuda';

    const rawMethod = (methodCol >= 0 && row[methodCol]) ? row[methodCol].toLowerCase().trim() : '';
    const paymentMethod: PaymentMethod =
      rawMethod.includes('qris') ? 'QRIS' : rawMethod.includes('transfer') ? 'Transfer' : 'Tunai';

    const loggedBy = (loggedByCol >= 0 && row[loggedByCol]) ? row[loggedByCol].trim() : 'Bendahara';
    const rawNote = (noteCol >= 0 && row[noteCol]) ? row[noteCol].trim() : '';
    const note = rawNote && rawNote !== '-' ? rawNote : '';

    transactions.push({
      id,
      date,
      monthPeriod,
      weekNumber,
      memberId,
      memberName,
      regu,
      amount: amount || 5000,
      paymentMethod,
      loggedBy,
      note,
      timestamp: new Date().toISOString(),
    });
  }

  return transactions;
}

/**
 * Parses GudepSettings from key-value rows
 */
export function parseSettingsFromRows(rows: string[][]): Partial<GudepSettings> {
  const settings: Partial<GudepSettings> = {};
  if (!rows || rows.length === 0) return settings;

  rows.forEach((row) => {
    if (!row || row.length < 2) return;
    const key = (row[0] || '').toLowerCase().trim();
    const val = (row[1] || '').trim();
    if (!val) return;

    if (key.includes('nama gugus') || key.includes('gudep')) settings.gudepName = val;
    if (key.includes('pangkalan') || key.includes('sekolah')) settings.pangkalan = val;
    if (key.includes('nominal') || key.includes('iuran rutin')) {
      const num = parseInt(val.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > 0) settings.defaultFeePerMeeting = num;
    }
    if (key.includes('jadwal') || key.includes('latihan')) settings.meetingDay = val;
    if (key.includes('pembina')) settings.pembinaName = val;
    if (key.includes('bendahara')) settings.bendaharaName = val;
  });

  return settings;
}

/**
 * Detects whether pasted text represents Members, Transactions, or Settings
 */
export function detectTableType(rows: string[][]): 'members' | 'transactions' | 'settings' | 'unknown' {
  if (!rows || rows.length === 0) return 'unknown';

  const sample = rows.slice(0, 5).flat().map((c) => (c || '').toLowerCase().trim()).join(' ');

  if (sample.includes('nominal') || sample.includes('iuran') || sample.includes('tx-') || sample.includes('minggu ke') || sample.includes('bayar')) {
    return 'transactions';
  }

  if (sample.includes('nama anggota') || sample.includes('regu') || sample.includes('pinru') || sample.includes('tingkatan') || sample.includes('jenis kelamin')) {
    return 'members';
  }

  if (sample.includes('pangkalan') || sample.includes('nama gugus') || sample.includes('pengaturan')) {
    return 'settings';
  }

  return 'unknown';
}

/**
 * Fetches raw CSV data from Google Sheets gviz endpoint
 */
export async function fetchSheetCsvPublic(
  spreadsheetId: string,
  sheetName?: string
): Promise<{ text?: string; isRestricted?: boolean; status: number; error?: string }> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv${
    sheetName ? `&sheet=${encodeURIComponent(sheetName)}` : ''
  }`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/csv,text/plain,*/*',
      },
    });

    const body = await res.text();

    // Detect if Google redirected to login or returned login HTML
    if (
      body.includes('Sign in to your Google Account') ||
      body.includes('accounts.google.com') ||
      body.includes('document-root') ||
      body.includes('action="https://accounts.google.com') ||
      body.includes('<html') ||
      body.includes('<!DOCTYPE')
    ) {
      return {
        isRestricted: true,
        status: 403,
        error: 'Spreadsheet masih berstatus "Dibatasi" di Google Drive.',
      };
    }

    if (!res.ok) {
      return { status: res.status, error: `HTTP ${res.status}: ${res.statusText}` };
    }

    return { text: body, status: res.status };
  } catch (err: any) {
    return { status: 0, error: err?.message || 'Gagal menghubungi Google Sheets' };
  }
}

export interface SpreadsheetPublicPullResult {
  success: boolean;
  members?: ScoutMember[];
  transactions?: PaymentRecord[];
  settings?: Partial<GudepSettings>;
  isRestricted?: boolean;
  message?: string;
  tabsFound?: string[];
}

/**
 * Automatically and publicly pulls data from Google Sheets without requiring Google Login
 */
export async function fetchSpreadsheetDataPublic(
  spreadsheetId: string = FIXED_SPREADSHEET_ID
): Promise<SpreadsheetPublicPullResult> {
  const memberTabs = [
    SHEETS_NAMES.MEMBERS,
    'DATA_ANGGOTA',
    'Data Anggota',
    'Anggota',
    'Sheet1',
    'Daftar Anggota',
    'Data_Anggota',
    'Siswa',
    'Peserta',
  ];

  const txTabs = [
    SHEETS_NAMES.TRANSACTIONS,
    'TRANSAKSI_IURAN',
    'Transaksi Iuran',
    'Transaksi',
    'Iuran',
    'Pembayaran',
    'Data Transaksi',
    'Kas',
    'Sheet2',
  ];

  const settingsTabs = [
    SHEETS_NAMES.SETTINGS,
    'PENGATURAN_GUDEP',
    'Pengaturan',
    'Settings',
    'Config',
  ];

  let membersResult: ScoutMember[] | undefined;
  let txResult: PaymentRecord[] | undefined;
  let settingsResult: Partial<GudepSettings> | undefined;
  let isRestricted = false;
  const tabsFound: string[] = [];

  // Try fetching default sheet first to verify accessibility
  const defaultCheck = await fetchSheetCsvPublic(spreadsheetId);
  if (defaultCheck.isRestricted) {
    return {
      success: false,
      isRestricted: true,
      message:
        'Spreadsheet masih berstatus "Dibatasi" di Google Drive. Silakan ubah Akses Umum di Google Spreadsheet menjadi "Siapa saja yang memiliki link: Pelihat" agar aplikasi dapat menyinkronkan data secara otomatis.',
    };
  }

  // 1. Prioritize dedicated 'DATA_ANGGOTA' tab so the member count matches the exact sheet
  for (const tab of memberTabs) {
    const res = await fetchSheetCsvPublic(spreadsheetId, tab);
    if (res.isRestricted) {
      isRestricted = true;
      break;
    }
    if (res.text && res.text.trim()) {
      const rows = parseDelimitedText(res.text);
      const parsed = parseMembersFromRows(rows);
      if (parsed.length > 0) {
        membersResult = parsed;
        tabsFound.push(tab);
        break;
      }
    }
  }

  // Fallback: If no dedicated member tab was found, check default sheet
  if ((!membersResult || membersResult.length === 0) && defaultCheck.text) {
    const rows = parseDelimitedText(defaultCheck.text);
    const tableType = detectTableType(rows);
    if (tableType === 'members') {
      const parsed = parseMembersFromRows(rows);
      if (parsed.length > 0) {
        membersResult = parsed;
        tabsFound.push('Lembar Utama (Data Anggota)');
      }
    }
  }

  // 2. Prioritize dedicated 'TRANSAKSI_IURAN' tab
  for (const tab of txTabs) {
    const res = await fetchSheetCsvPublic(spreadsheetId, tab);
    if (res.isRestricted) {
      isRestricted = true;
      break;
    }
    if (res.text && res.text.trim()) {
      const rows = parseDelimitedText(res.text);
      const parsed = parseTransactionsFromRows(rows);
      if (parsed.length > 0) {
        txResult = parsed;
        tabsFound.push(tab);
        break;
      }
    }
  }

  // Fallback for transactions if no dedicated transaction tab found
  if (!txResult && defaultCheck.text) {
    const rows = parseDelimitedText(defaultCheck.text);
    const tableType = detectTableType(rows);
    if (tableType === 'transactions') {
      const parsed = parseTransactionsFromRows(rows);
      if (parsed.length > 0) {
        txResult = parsed;
        tabsFound.push('Lembar Utama (Transaksi Iuran)');
      }
    }
  }


  // Probe specific tabs for settings
  for (const tab of settingsTabs) {
    const res = await fetchSheetCsvPublic(spreadsheetId, tab);
    if (res.text && res.text.trim()) {
      const rows = parseDelimitedText(res.text);
      const parsed = parseSettingsFromRows(rows);
      if (Object.keys(parsed).length > 0) {
        settingsResult = parsed;
        tabsFound.push(tab);
        break;
      }
    }
  }

  if (isRestricted) {
    return {
      success: false,
      isRestricted: true,
      message:
        'Spreadsheet masih berstatus "Dibatasi" di Google Drive. Silakan ubah Akses Umum di Google Spreadsheet menjadi "Siapa saja yang memiliki link: Pelihat" agar aplikasi dapat menyinkronkan data secara otomatis.',
    };
  }

  const hasData = (membersResult && membersResult.length > 0) || (txResult && txResult.length > 0);

  return {
    success: hasData || tabsFound.length > 0,
    members: membersResult,
    transactions: txResult || [],
    settings: settingsResult,
    tabsFound,
    message: hasData
      ? `Berhasil menarik ${membersResult?.length || 0} data anggota dan ${txResult?.length || 0} riwayat transaksi dari spreadsheet.`
      : 'Spreadsheet terhubung namun belum memiliki baris data anggota atau transaksi yang terdeteksi.',
  };
}

/**
 * Parses user-pasted text (TSV/CSV copied directly from Google Sheets)
 */
export function parsePastedTableData(
  text: string,
  targetType: 'auto' | 'members' | 'transactions' = 'auto'
): {
  type: 'members' | 'transactions' | 'unknown';
  members?: ScoutMember[];
  transactions?: PaymentRecord[];
  count: number;
  message: string;
} {
  const rows = parseDelimitedText(text);
  if (rows.length === 0) {
    return {
      type: 'unknown',
      count: 0,
      message: 'Tidak ada baris teks yang terbaca. Salin (Ctrl+C) data dari Google Sheets terlebih dahulu.',
    };
  }

  const detected = targetType === 'auto' ? detectTableType(rows) : targetType;

  if (detected === 'transactions') {
    const transactions = parseTransactionsFromRows(rows);
    return {
      type: 'transactions',
      transactions,
      count: transactions.length,
      message: `Berhasil mengenali ${transactions.length} catatan transaksi iuran.`,
    };
  }

  // Default to members
  const members = parseMembersFromRows(rows);
  return {
    type: 'members',
    members,
    count: members.length,
    message: `Berhasil mengenali ${members.length} data anggota pramuka.`,
  };
}

/**
 * Sends a mutation payload to user's Google Apps Script Web App webhook
 */
export async function sendToAppsScript(
  url: string,
  payload: { action: string; data: any }
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!url || !url.trim().startsWith('http')) {
    return {
      success: false,
      message: 'URL Google Apps Script belum disetel. Hubungkan di menu Database Spreadsheet terlebih dahulu.',
    };
  }

  const cleanUrl = url.trim();

  try {
    // Sending Content-Type: text/plain avoids CORS preflight OPTIONS rejection in Google Apps Script
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      try {
        const json = await res.json();
        return {
          success: json.success !== false,
          message: json.message || (json.error ? `Apps Script: ${json.error}` : 'Berhasil disimpan ke Google Spreadsheet.'),
          error: json.error,
        };
      } catch {
        return { success: true, message: 'Berhasil dikirim dan disimpan ke Google Spreadsheet.' };
      }
    }

    return {
      success: false,
      message: `Status respon Google Apps Script: HTTP ${res.status}. Periksa deployment Web App Anda.`,
    };
  } catch (err: any) {
    // In browsers, Google Apps Script redirects after POST often trigger CORS opaque responses (mode: 'no-cors')
    // Attempt fallback via no-cors so payload still executes successfully in Google Apps Script
    try {
      await fetch(cleanUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });
      return {
        success: true,
        message: 'Data rekapan berhasil dikirim ke Google Spreadsheet (diproses oleh Apps Script).',
      };
    } catch (err2: any) {
      return {
        success: false,
        message: `Gagal menghubungi Google Apps Script: ${err2?.message || err?.message || 'Koneksi terputus'}. Pastikan akses diatur "Siapa saja" (Anyone).`,
      };
    }
  }
}

/**
 * Saves a payment record to Google Spreadsheet via Apps Script Web App
 */
export async function saveTransactionToSpreadsheet(
  record: PaymentRecord,
  appsScriptUrl?: string
): Promise<{ success: boolean; message: string }> {
  if (!appsScriptUrl) {
    return {
      success: false,
      message: 'Tersimpan di aplikasi. Hubungkan URL Apps Script untuk auto-save ke Google Sheets.',
    };
  }
  const res = await sendToAppsScript(appsScriptUrl, {
    action: 'addTransaction',
    data: record,
  });
  return {
    success: res.success,
    message: res.message || (res.success ? 'Tersimpan ke spreadsheet' : 'Gagal menyimpan ke spreadsheet'),
  };
}

/**
 * Saves a batch of payment records to Google Spreadsheet via Apps Script Web App
 */
export async function saveBatchTransactionsToSpreadsheet(
  records: PaymentRecord[],
  appsScriptUrl?: string
): Promise<{ success: boolean; message: string }> {
  if (!appsScriptUrl || records.length === 0) {
    return {
      success: false,
      message: 'Tersimpan di aplikasi.',
    };
  }
  const res = await sendToAppsScript(appsScriptUrl, {
    action: 'addTransactionsBatch',
    data: records,
  });
  return {
    success: res.success,
    message: res.message || (res.success ? `${records.length} transaksi tersimpan ke spreadsheet` : 'Gagal menyimpan batch ke spreadsheet'),
  };
}

/**
 * Saves a member to Google Spreadsheet via Apps Script Web App
 */
export async function saveMemberToSpreadsheet(
  member: ScoutMember,
  appsScriptUrl?: string
): Promise<{ success: boolean; message: string }> {
  if (!appsScriptUrl) {
    return {
      success: false,
      message: 'Tersimpan di aplikasi.',
    };
  }
  const res = await sendToAppsScript(appsScriptUrl, {
    action: 'addMember',
    data: member,
  });
  return {
    success: res.success,
    message: res.message || (res.success ? 'Anggota tersimpan ke spreadsheet' : 'Gagal menyimpan anggota ke spreadsheet'),
  };
}

/**
 * Saves a batch of scout members to Google Spreadsheet via Apps Script Web App
 */
export async function saveBatchMembersToSpreadsheet(
  members: ScoutMember[],
  appsScriptUrl?: string
): Promise<{ success: boolean; message: string }> {
  if (!appsScriptUrl || members.length === 0) {
    return {
      success: false,
      message: 'Tersimpan di aplikasi.',
    };
  }
  const cleanMembers = ensureUniqueMembers(members);
  const res = await sendToAppsScript(appsScriptUrl, {
    action: 'addMembersBatch',
    data: cleanMembers,
  });
  return {
    success: res.success,
    message: res.message || (res.success ? `${cleanMembers.length} anggota berhasil disimpan ke spreadsheet` : 'Gagal menyimpan anggota ke spreadsheet'),
  };
}

/**
 * Pings / tests Apps Script Web App URL
 */
export async function testAppsScriptConnection(
  url: string
): Promise<{ success: boolean; message: string }> {
  if (!url || !url.trim().startsWith('http')) {
    return { success: false, message: 'URL Apps Script harus diawali dengan https://' };
  }
  try {
    const testUrl = url.trim().includes('?') ? `${url.trim()}&action=ping` : `${url.trim()}?action=ping`;
    const res = await fetch(testUrl, { method: 'GET' });
    if (res.ok) {
      try {
        const data = await res.json();
        return {
          success: true,
          message: data.message || 'Koneksi ke Apps Script Web App berhasil terverifikasi!',
        };
      } catch {
        return {
          success: true,
          message: 'Koneksi ke Apps Script Web App terhubung!',
        };
      }
    }
    return {
      success: false,
      message: `Respon status Google Apps Script: ${res.status}`,
    };
  } catch {
    // Attempt POST ping as fallback if GET is restricted
    try {
      const res = await sendToAppsScript(url, { action: 'ping', data: {} });
      return {
        success: res.success,
        message: res.message || 'Koneksi ke Web App Apps Script aktif.',
      };
    } catch {
      return {
        success: false,
        message: 'Tidak dapat menjangkau URL Apps Script. Pastikan Web App disetel "Siapa saja (Anyone)".',
      };
    }
  }
}

export interface MonthlyRecapExportItem {
  period: string;
  monthLabel: string;
  activeMembers: number;
  targetTotal: number;
  totalCollected: number;
  complianceRate: number;
  transactionCount: number;
  paidCount: number;
  unpaidCount: number;
  updatedAt: string;
}

export interface ReguRecapExportItem {
  regu: string;
  pinruName: string;
  memberCount: number;
  period: string;
  targetMonthTotal: number;
  totalMonthCollected: number;
  complianceRate: number;
  fullyPaidCount: number;
  unpaidCount: number;
  totalAllTime: number;
  updatedAt: string;
}

/**
 * Computes monthly recap items across all periods
 */
export function computeMonthlyRecapData(
  members: ScoutMember[],
  transactions: PaymentRecord[],
  settings?: GudepSettings
): MonthlyRecapExportItem[] {
  const activeMembers = members.filter((m) => m.active);
  const targetPerMeeting = settings?.defaultFeePerMeeting || 5000;
  const targetPerMember = targetPerMeeting * 4;
  const targetTotal = activeMembers.length * targetPerMember;

  const periods = new Set<string>();
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  periods.add(currentPeriod);

  transactions.forEach((t) => {
    if (t.monthPeriod) periods.add(t.monthPeriod);
  });

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const sortedPeriods = Array.from(periods).sort((a, b) => b.localeCompare(a));
  const nowStr = new Date().toLocaleString('id-ID');

  return sortedPeriods.map((period) => {
    const monthTx = transactions.filter((t) => t.monthPeriod === period);
    const totalCollected = monthTx.reduce((acc, t) => acc + t.amount, 0);
    const complianceRate =
      targetTotal > 0
        ? Math.min(100, Math.round((totalCollected / targetTotal) * 100))
        : 0;

    let paidCount = 0;
    activeMembers.forEach((m) => {
      const sum = monthTx
        .filter((t) => t.memberId === m.id)
        .reduce((acc, t) => acc + t.amount, 0);
      if (sum >= targetPerMember) paidCount++;
    });

    const unpaidCount = Math.max(0, activeMembers.length - paidCount);
    const [y, m] = period.split('-');
    const mIdx = parseInt(m, 10) - 1;
    const monthLabel = `${monthNames[mIdx] || m} ${y}`;

    return {
      period,
      monthLabel,
      activeMembers: activeMembers.length,
      targetTotal,
      totalCollected,
      complianceRate,
      transactionCount: monthTx.length,
      paidCount,
      unpaidCount,
      updatedAt: nowStr,
    };
  });
}

/**
 * Computes regu recap items for the specified month
 */
export function computeReguRecapData(
  members: ScoutMember[],
  transactions: PaymentRecord[],
  settings?: GudepSettings,
  selectedMonth?: string
): ReguRecapExportItem[] {
  const now = new Date();
  const currentMonth =
    selectedMonth ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const targetPerMeeting = settings?.defaultFeePerMeeting || 5000;
  const monthTx = transactions.filter((t) => t.monthPeriod === currentMonth);
  const reguNames = Array.from(new Set(members.map((m) => m.regu)));
  const nowStr = new Date().toLocaleString('id-ID');

  return reguNames.map((regu) => {
    const reguMembers = members.filter((m) => m.regu === regu && m.active);
    const pinru = reguMembers.find((m) => m.isPinru);
    const reguMonthTx = monthTx.filter((t) => t.regu === regu);
    const totalMonthCollected = reguMonthTx.reduce((acc, t) => acc + t.amount, 0);
    const targetMonthTotal = reguMembers.length * targetPerMeeting * 4;
    const complianceRate =
      targetMonthTotal > 0
        ? Math.min(100, Math.round((totalMonthCollected / targetMonthTotal) * 100))
        : 0;

    const fullyPaidCount = reguMembers.filter((m) => {
      const sum = reguMonthTx
        .filter((t) => t.memberId === m.id)
        .reduce((acc, t) => acc + t.amount, 0);
      return sum >= targetPerMeeting * 4;
    }).length;

    const unpaidCount = Math.max(0, reguMembers.length - fullyPaidCount);

    const reguAllTx = transactions.filter((t) => t.regu === regu);
    const totalAllTime = reguAllTx.reduce((acc, t) => acc + t.amount, 0);

    return {
      regu,
      pinruName: pinru?.name || 'Belum Ditunjuk',
      memberCount: reguMembers.length,
      period: currentMonth,
      targetMonthTotal,
      totalMonthCollected,
      complianceRate,
      fullyPaidCount,
      unpaidCount,
      totalAllTime,
      updatedAt: nowStr,
    };
  });
}

/**
 * Saves both REKAP_BULANAN and REKAP_REGU directly to Google Spreadsheet
 */
export async function saveRecapsToSpreadsheet(
  members: ScoutMember[],
  transactions: PaymentRecord[],
  settings?: GudepSettings,
  appsScriptUrl?: string,
  selectedMonth?: string
): Promise<{ success: boolean; message: string }> {
  if (!appsScriptUrl) {
    return {
      success: false,
      message: 'URL Google Apps Script belum disetel.',
    };
  }

  const monthlyRecaps = computeMonthlyRecapData(members, transactions, settings);
  const reguRecaps = computeReguRecapData(members, transactions, settings, selectedMonth);

  const res = await sendToAppsScript(appsScriptUrl, {
    action: 'syncRecaps',
    data: {
      monthlyRecaps,
      reguRecaps,
    },
  });

  return {
    success: res.success,
    message: res.message || (res.success ? 'Rekap bulanan & rekap regu berhasil disimpan ke Google Spreadsheet!' : 'Gagal menyimpan rekap ke spreadsheet.'),
  };
}

/**
 * Syncs all current members, transactions, and both recaps to Google Spreadsheet
 */
export async function syncAllDataToSpreadsheet(
  members: ScoutMember[],
  transactions: PaymentRecord[],
  appsScriptUrl?: string,
  settings?: GudepSettings,
  selectedMonth?: string
): Promise<{ success: boolean; message: string; membersCount: number; txCount: number }> {
  if (!appsScriptUrl) {
    return {
      success: false,
      message: 'URL Google Apps Script belum disetel.',
      membersCount: 0,
      txCount: 0,
    };
  }

  let mSuccess = true;
  let tSuccess = true;

  if (members.length > 0) {
    const resM = await saveBatchMembersToSpreadsheet(members, appsScriptUrl);
    mSuccess = resM.success;
  }

  if (transactions.length > 0) {
    const resT = await saveBatchTransactionsToSpreadsheet(transactions, appsScriptUrl);
    tSuccess = resT.success;
  }

  // Also sync both recaps (REKAP_BULANAN and REKAP_REGU)
  const resR = await saveRecapsToSpreadsheet(members, transactions, settings, appsScriptUrl, selectedMonth);

  const allOk = mSuccess && tSuccess && resR.success;
  return {
    success: allOk,
    message: allOk
      ? `Berhasil mengirim ${members.length} anggota, ${transactions.length} transaksi, Rekap Bulanan, dan Rekap Regu ke Google Spreadsheet!`
      : `Data terkirim ke spreadsheet (${resR.message})`,
    membersCount: members.length,
    txCount: transactions.length,
  };
}

/**
 * Formats a payment record as TSV row for pasting into Google Sheets
 */
export function formatTransactionAsTsvRow(tx: PaymentRecord): string {
  return `${tx.id}\t${tx.date}\t${tx.monthPeriod}\tMinggu ${tx.weekNumber}\t${tx.memberId}\t${tx.memberName}\t${tx.regu}\t${tx.amount}\t${tx.paymentMethod}\t${tx.loggedBy}\t${tx.note || '-'}\t${tx.timestamp}`;
}

/**
 * Formats a scout member as TSV row for pasting into Google Sheets
 */
export function formatMemberAsTsvRow(m: ScoutMember): string {
  return `${m.id}\t${m.name}\t${m.regu}\t${m.gender === 'L' ? 'Putra' : 'Putri'}\t${m.level}\t${m.phone || '-'}\t${m.isPinru ? 'Pinru/Wapinru' : 'Anggota'}\t${m.active ? 'Aktif' : 'Non-Aktif'}`;
}

/**
 * Formats monthly recaps as TSV rows for pasting into Google Sheets
 */
export function formatMonthlyRecapAsTsvRows(items: MonthlyRecapExportItem[]): string {
  let text = 'Periode Bulan\tNama Bulan\tAnggota Aktif\tTarget Iuran (Rp)\tTotal Terkumpul (Rp)\tCapaian (%)\tJumlah Transaksi\tAnggota Lunas\tAnggota Menunggak\tTerakhir Diperbarui\n';
  items.forEach((item) => {
    text += `${item.period}\t${item.monthLabel}\t${item.activeMembers}\t${item.targetTotal}\t${item.totalCollected}\t${item.complianceRate}%\t${item.transactionCount}\t${item.paidCount}\t${item.unpaidCount}\t${item.updatedAt}\n`;
  });
  return text;
}

/**
 * Formats regu recaps as TSV rows for pasting into Google Sheets
 */
export function formatReguRecapAsTsvRows(items: ReguRecapExportItem[]): string {
  let text = 'Nama Regu\tPemimpin Regu (Pinru)\tJumlah Anggota\tPeriode Bulan\tTarget Bulan Ini (Rp)\tTerkumpul Bulan Ini (Rp)\tKedisiplinan (%)\tAnggota Lunas\tAnggota Menunggak\tTotal Akumulasi Semua Waktu (Rp)\tTerakhir Diperbarui\n';
  items.forEach((item) => {
    text += `${item.regu}\t${item.pinruName}\t${item.memberCount}\t${item.period}\t${item.targetMonthTotal}\t${item.totalMonthCollected}\t${item.complianceRate}%\t${item.fullyPaidCount}\t${item.unpaidCount}\t${item.totalAllTime}\t${item.updatedAt}\n`;
  });
  return text;
}

/**
 * Ready-to-deploy Google Apps Script Web App Template for 2-way automatic synchronization
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT WEB APP UNTUK APLIKASI IURAN PRAMUKA (SI-PRAMUKA)
 * Spreadsheet ID: ${FIXED_SPREADSHEET_ID}
 * 
 * FITUR LENGKAP:
 * 1. Simpan Transaksi Iuran (TRANSAKSI_IURAN)
 * 2. Simpan Data Anggota (DATA_ANGGOTA)
 * 3. Simpan & Perbarui Rekap Bulanan (REKAP_BULANAN)
 * 4. Simpan & Perbarui Rekap Pe-Regu (REKAP_REGU)
 * 
 * CARA PASANG CEPAT (1 Menit):
 * 1. Di Google Sheets Anda, klik menu "Ekstensi" (Extensions) > "Apps Script".
 * 2. Hapus seluruh kode yang ada di Apps Script, lalu tempel (Paste) seluruh kode ini.
 * 3. Klik tombol Simpan (ikon Disket).
 * 4. Klik tombol biru "Terapkan" (Deploy) di kanan atas > "Penerapan baru" (New deployment).
 * 5. Klik ikon Roda Gigi di sebelah kiri "Pilih jenis", pilih "Aplikasi Web" (Web app).
 * 6. Pengaturan:
 *    - Deskripsi: API Si-Pramuka
 *    - Jalankan sebagai (Execute as): Saya (Me)
 *    - Siapa yang memiliki akses (Who has access): Siapa saja (Anyone)
 * 7. Klik "Terapkan" (Deploy) dan izinkan akses saat Google meminta.
 * 8. Salin "URL Aplikasi Web" (contoh: https://script.google.com/macros/s/.../exec)
 *    lalu tempel di aplikasi Si-Pramuka pada menu Database Spreadsheet!
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'ping') {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Koneksi Si-Pramuka Web App Aktif!',
      spreadsheetTitle: ss.getName()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : '';
    var payload = JSON.parse(raw);
    var action = payload.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Simpan Transaksi Iuran (Cegah Duplikasi ID Transaksi)
    if (action === 'addTransaction') {
      var tx = payload.data;
      var sheet = getOrCreateSheet(ss, 'TRANSAKSI_IURAN', [
        'ID Transaksi', 'Tanggal', 'Periode Bulan', 'Minggu Ke', 'ID Anggota',
        'Nama Anggota', 'Regu', 'Nominal (Rp)', 'Metode', 'Dicatat Oleh', 'Catatan', 'Waktu Input'
      ]);
      var row = [
        tx.id,
        tx.date,
        tx.monthPeriod,
        'Minggu ' + (tx.weekNumber || 1),
        tx.memberId || '',
        tx.memberName,
        tx.regu,
        tx.amount,
        tx.paymentMethod,
        tx.loggedBy || 'Bendahara',
        tx.note || '-',
        tx.timestamp || new Date().toISOString()
      ];
      var lastRow = sheet.getLastRow();
      var existingRow = -1;
      if (lastRow > 1) {
        var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < ids.length; i++) {
          if (String(ids[i][0] || '').trim() === String(tx.id || '').trim()) {
            existingRow = i + 2;
            break;
          }
        }
      }
      if (existingRow > 1) {
        sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
        return responseJSON({ success: true, message: 'Transaksi ' + tx.id + ' berhasil diperbarui di Google Spreadsheet' });
      } else {
        sheet.appendRow(row);
        return responseJSON({ success: true, message: 'Transaksi berhasil disimpan ke Google Spreadsheet' });
      }
    }
    
    // 2. Simpan Transaksi Batch (Hanya Tambahkan yang Belum Ada di Sheet)
    if (action === 'addTransactionsBatch') {
      var list = payload.data || [];
      var sheet = getOrCreateSheet(ss, 'TRANSAKSI_IURAN', [
        'ID Transaksi', 'Tanggal', 'Periode Bulan', 'Minggu Ke', 'ID Anggota',
        'Nama Anggota', 'Regu', 'Nominal (Rp)', 'Metode', 'Dicatat Oleh', 'Catatan', 'Waktu Input'
      ]);
      var existingTxMap = {};
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var existingIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var e = 0; e < existingIds.length; e++) {
          var eId = String(existingIds[e][0] || '').trim();
          if (eId) existingTxMap[eId] = true;
        }
      }
      var rows = [];
      for (var t = 0; t < list.length; t++) {
        var tx = list[t];
        if (!tx || !tx.id || existingTxMap[String(tx.id).trim()]) continue;
        existingTxMap[String(tx.id).trim()] = true;
        rows.push([
          tx.id,
          tx.date,
          tx.monthPeriod,
          'Minggu ' + (tx.weekNumber || 1),
          tx.memberId || '',
          tx.memberName,
          tx.regu,
          tx.amount,
          tx.paymentMethod,
          tx.loggedBy || 'Bendahara',
          tx.note || '-',
          tx.timestamp || new Date().toISOString()
        ]);
      }
      if (rows.length > 0) {
        var startRow = sheet.getLastRow() + 1;
        sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
      }
      return responseJSON({ success: true, count: rows.length, message: rows.length + ' transaksi baru berhasil disimpan ke Google Spreadsheet' });
    }
    
    // 3. Simpan Anggota Satuan (Smart Upsert: Cegah Duplikasi Nama/ID)
    if (action === 'addMember') {
      var m = payload.data;
      var sheet = getOrCreateSheet(ss, 'DATA_ANGGOTA', [
        'ID Anggota', 'Nama Anggota', 'Regu', 'Jenis Kelamin', 'Tingkatan', 'No Kontak/WA', 'Status Pinru', 'Status Aktif'
      ]);
      
      var newRow = [
        m.id,
        m.name,
        m.regu,
        m.gender === 'L' ? 'Putra' : 'Putri',
        m.level || 'Penggalang Ramu',
        m.phone || '-',
        m.isPinru ? 'Pinru/Wapinru' : 'Anggota',
        m.active !== false ? 'Aktif' : 'Non-Aktif'
      ];

      var lastRow = sheet.getLastRow();
      var existingRowIndex = -1;

      if (lastRow > 1) {
        var existingData = sheet.getRange(2, 1, lastRow - 1, Math.min(sheet.getLastColumn(), 8)).getValues();
        var targetName = String(m.name || '').toLowerCase().trim();
        var targetRegu = String(m.regu || '').toLowerCase().trim();
        var targetId = String(m.id || '').toLowerCase().trim();

        for (var i = 0; i < existingData.length; i++) {
          var rowId = String(existingData[i][0] || '').toLowerCase().trim();
          var rowName = String(existingData[i][1] || '').toLowerCase().trim();
          var rowRegu = String(existingData[i][2] || '').toLowerCase().trim();

          // Match by ID or by same Name + Regu
          if ((targetId && rowId === targetId) || (targetName && rowName === targetName && (!targetRegu || !rowRegu || targetRegu === rowRegu))) {
            existingRowIndex = i + 2; // 1-indexed including header
            break;
          }
        }
      }

      if (existingRowIndex > 1) {
        sheet.getRange(existingRowIndex, 1, 1, newRow.length).setValues([newRow]);
        return responseJSON({ success: true, message: 'Data anggota "' + m.name + '" berhasil diperbarui di Google Spreadsheet (tanpa menduplikasi)' });
      } else {
        sheet.appendRow(newRow);
        return responseJSON({ success: true, message: 'Anggota baru "' + m.name + '" berhasil ditambahkan ke Google Spreadsheet' });
      }
    }
    
    // 4. Simpan Anggota Batch (Smart Upsert & Synchronize Total Data)
    if (action === 'addMembersBatch' || action === 'syncAllMembers') {
      var list = payload.data || [];
      var sheet = getOrCreateSheet(ss, 'DATA_ANGGOTA', [
        'ID Anggota', 'Nama Anggota', 'Regu', 'Jenis Kelamin', 'Tingkatan', 'No Kontak/WA', 'Status Pinru', 'Status Aktif'
      ]);

      // Deduplicate incoming list internally first
      var uniqueMap = {};
      var cleanList = [];
      for (var k = 0; k < list.length; k++) {
        var item = list[k];
        if (!item || !item.name) continue;
        var dedupeKey = String(item.name).toLowerCase().trim() + ':::' + String(item.regu || '').toLowerCase().trim();
        if (!uniqueMap[dedupeKey]) {
          uniqueMap[dedupeKey] = true;
          cleanList.push(item);
        }
      }

      var rows = cleanList.map(function(m) {
        return [
          m.id,
          m.name,
          m.regu,
          m.gender === 'L' ? 'Putra' : 'Putri',
          m.level || 'Penggalang Ramu',
          m.phone || '-',
          m.isPinru ? 'Pinru/Wapinru' : 'Anggota',
          m.active !== false ? 'Aktif' : 'Non-Aktif'
        ];
      });

      // Clear existing content and rewrite clean unique rows so total matches exactly
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      }

      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }
      return responseJSON({ success: true, count: rows.length, message: rows.length + ' data anggota berhasil diselaraskan di Google Spreadsheet tanpa duplikasi' });
    }
    
    // 5. Simpan & Perbarui Rekap Bulanan dan Rekap Pe-Regu
    if (action === 'syncRecaps' || action === 'syncMonthlyRecap' || action === 'syncReguRecap') {
      var data = payload.data || {};
      var monthlyList = data.monthlyRecaps || [];
      var reguList = data.reguRecaps || [];
      
      // Update REKAP_BULANAN
      if (monthlyList.length > 0) {
        var mSheet = getOrCreateSheet(ss, 'REKAP_BULANAN', [
          'Periode Bulan', 'Nama Bulan', 'Anggota Aktif', 'Target Iuran (Rp)',
          'Total Terkumpul (Rp)', 'Capaian (%)', 'Jumlah Transaksi', 'Anggota Lunas', 'Anggota Menunggak', 'Terakhir Diperbarui'
        ]);
        var lastRowM = mSheet.getLastRow();
        if (lastRowM > 1) {
          mSheet.getRange(2, 1, lastRowM - 1, mSheet.getLastColumn()).clearContent();
        }
        var mRows = monthlyList.map(function(item) {
          return [
            item.period,
            item.monthLabel || item.period,
            item.activeMembers || 0,
            item.targetTotal || 0,
            item.totalCollected || 0,
            (item.complianceRate || 0) + '%',
            item.transactionCount || 0,
            item.paidCount || 0,
            item.unpaidCount || 0,
            item.updatedAt || new Date().toLocaleString()
          ];
        });
        if (mRows.length > 0) {
          mSheet.getRange(2, 1, mRows.length, mRows[0].length).setValues(mRows);
        }
      }
      
      // Update REKAP_REGU
      if (reguList.length > 0) {
        var rSheet = getOrCreateSheet(ss, 'REKAP_REGU', [
          'Nama Regu', 'Pemimpin Regu (Pinru)', 'Jumlah Anggota', 'Periode Bulan',
          'Target Bulan Ini (Rp)', 'Terkumpul Bulan Ini (Rp)', 'Kedisiplinan (%)', 'Anggota Lunas', 'Anggota Menunggak', 'Total Akumulasi Semua Waktu (Rp)', 'Terakhir Diperbarui'
        ]);
        var lastRowR = rSheet.getLastRow();
        if (lastRowR > 1) {
          rSheet.getRange(2, 1, lastRowR - 1, rSheet.getLastColumn()).clearContent();
        }
        var rRows = reguList.map(function(item) {
          return [
            item.regu,
            item.pinruName || '-',
            item.memberCount || 0,
            item.period || '-',
            item.targetMonthTotal || 0,
            item.totalMonthCollected || 0,
            (item.complianceRate || 0) + '%',
            item.fullyPaidCount || 0,
            item.unpaidCount || 0,
            item.totalAllTime || 0,
            item.updatedAt || new Date().toLocaleString()
          ];
        });
        if (rRows.length > 0) {
          rSheet.getRange(2, 1, rRows.length, rRows[0].length).setValues(rRows);
        }
      }
      
      return responseJSON({
        success: true,
        message: 'Rekap Bulanan (' + monthlyList.length + ' periode) dan Rekap Regu (' + reguList.length + ' regu) berhasil disimpan ke Google Spreadsheet'
      });
    }
    
    return responseJSON({ success: false, message: 'Action tidak dikenal' });
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (headers && headers.length > 0 && sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

