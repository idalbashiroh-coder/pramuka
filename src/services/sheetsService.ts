import { GudepSettings, PaymentRecord, ScoutMember } from '../types/scout';

interface SpreadsheetResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
  properties: {
    title: string;
  };
  sheets: Array<{
    properties: {
      title: string;
      sheetId: number;
    };
  }>;
}

export const SHEETS_NAMES = {
  MEMBERS: 'DATA_ANGGOTA',
  TRANSACTIONS: 'TRANSAKSI_IURAN',
  MONTHLY_RECAP: 'REKAP_BULANAN',
  REGU_RECAP: 'REKAP_REGU',
  SETTINGS: 'PENGATURAN_GUDEP',
};

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
      return 'Izin akses Google Sheets & Drive belum diaktifkan. Saat jendela login Google terbuka, pastikan mencentang kotak persetujuan "Lihat, edit, buat, dan hapus spreadsheet Google Drive Anda" agar aplikasi dapat menyimpan database.';
    }

    if (status === 401 || statusText === 'UNAUTHENTICATED') {
      return 'Sesi token Google telah kedaluwarsa. Silakan klik Login Ulang Google untuk menyegarkan token.';
    }

    if (status === 404 || statusText === 'NOT_FOUND') {
      return 'Spreadsheet tidak ditemukan di Google Drive. Pastikan ID atau URL spreadsheet benar dan akun Google Anda memiliki akses.';
    }

    if (message) {
      return `Kendala Google Sheets: ${message}`;
    }
  } catch {
    // ignore
  }

  return `Gagal menghubungkan Google Sheets (${status}): ${rawError}`;
}

export const FIXED_SPREADSHEET_ID = '1deLLyW5F5lCbukK2QJExbzdDV1YihjTCzogGtruo7-A';
export const FIXED_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${FIXED_SPREADSHEET_ID}/edit`;

/**
 * Checks if the required tabs exist in the spreadsheet, and creates any missing ones.
 */
export async function ensureSpreadsheetTabs(
  token: string,
  spreadsheetId: string,
  requiredTabs: string[] = Object.values(SHEETS_NAMES)
): Promise<string[]> {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!metaRes.ok) return [];
    const meta = await metaRes.json();
    const existingTitles: string[] = (meta.sheets || []).map((s: any) => s.properties?.title);

    const missingTabs = requiredTabs.filter((t) => !existingTitles.includes(t));
    if (missingTabs.length > 0) {
      const requests = missingTabs.map((title) => ({
        addSheet: {
          properties: {
            title,
            gridProperties: { frozenRowCount: 1 },
          },
        },
      }));

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      return [...existingTitles, ...missingTabs];
    }
    return existingTitles;
  } catch (err) {
    console.warn('ensureSpreadsheetTabs warning:', err);
    return [];
  }
}

/**
 * Creates a complete Google Spreadsheet for Scout Dues with structured tabs
 */
export async function createScoutSpreadsheet(
  token: string,
  title: string,
  settings: GudepSettings,
  members: ScoutMember[],
  transactions: PaymentRecord[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  // 1. Create spreadsheet structure
  const createPayload = {
    properties: {
      title: title || `Iuran Rutin Pramuka - ${settings.pangkalan}`,
    },
    sheets: [
      { properties: { title: SHEETS_NAMES.TRANSACTIONS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEETS_NAMES.MEMBERS, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEETS_NAMES.MONTHLY_RECAP, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEETS_NAMES.REGU_RECAP, gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: SHEETS_NAMES.SETTINGS, gridProperties: { frozenRowCount: 1 } } },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.warn('Google Sheets create notice:', createRes.status, errText);
    throw new Error(formatGoogleErrorMessage(createRes.status, errText));
  }

  const createdData: SpreadsheetResponse = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate initial data & headers
  try {
    await populateSpreadsheetData(token, spreadsheetId, settings, members, transactions);
  } catch (popErr: any) {
    console.warn('Initial data population warning:', popErr);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title: createdData.properties.title,
  };
}

/**
 * Populates all tabs with formatted headers and current data
 */
export async function populateSpreadsheetData(
  token: string,
  spreadsheetId: string,
  settings: GudepSettings,
  members: ScoutMember[],
  transactions: PaymentRecord[]
): Promise<void> {
  // Ensure required tabs exist
  await ensureSpreadsheetTabs(token, spreadsheetId);

  // Members Sheet Data
  const memberRows = [
    ['ID Anggota', 'Nama Anggota', 'Regu', 'Jenis Kelamin', 'Tingkatan', 'No Kontak/WA', 'Status Pinru', 'Status Aktif'],
    ...members.map((m) => [
      m.id,
      m.name,
      m.regu,
      m.gender === 'L' ? 'Putra' : 'Putri',
      m.level,
      m.phone || '-',
      m.isPinru ? 'Pinru/Wapinru' : 'Anggota',
      m.active ? 'Aktif' : 'Non-Aktif',
    ]),
  ];

  // Transactions Sheet Data
  const transactionRows = [
    ['ID Transaksi', 'Tanggal', 'Periode Bulan', 'Minggu Ke', 'ID Anggota', 'Nama Anggota', 'Regu', 'Nominal (Rp)', 'Metode', 'Dicatat Oleh', 'Catatan', 'Waktu Input'],
    ...transactions.map((t) => [
      t.id,
      t.date,
      t.monthPeriod,
      `Minggu ${t.weekNumber}`,
      t.memberId,
      t.memberName,
      t.regu,
      t.amount,
      t.paymentMethod,
      t.loggedBy,
      t.note || '-',
      t.timestamp,
    ]),
  ];

  // Settings Sheet Data
  const settingsRows = [
    ['Pengaturan', 'Nilai'],
    ['Nama Gugus Depan', settings.gudepName],
    ['Pangkalan / Sekolah', settings.pangkalan],
    ['Nominal Iuran Rutin', settings.defaultFeePerMeeting],
    ['Jadwal Latihan', settings.meetingDay],
    ['Pembina Satuan', settings.pembinaName],
    ['Bendahara Satuan', settings.bendaharaName],
    ['Mata Uang', settings.currency],
    ['Terakhir Diperbarui', new Date().toLocaleString('id-ID')],
  ];

  // Compute Monthly Recap rows
  const monthMap = new Map<string, { total: number; count: number; members: Set<string> }>();
  transactions.forEach((t) => {
    const existing = monthMap.get(t.monthPeriod) || { total: 0, count: 0, members: new Set<string>() };
    existing.total += t.amount;
    existing.count += 1;
    existing.members.add(t.memberId);
    monthMap.set(t.monthPeriod, existing);
  });

  const activeMembersCount = members.filter((m) => m.active).length || 1;
  const monthlyRecapRows = [
    ['Periode Bulan', 'Total Terkumpul (Rp)', 'Target Iuran (Rp)', 'Persentase Capaian (%)', 'Jumlah Transaksi', 'Anggota Bayar', 'Status'],
    ...Array.from(monthMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([period, data]) => {
        const target = activeMembersCount * settings.defaultFeePerMeeting * 4;
        const percent = target > 0 ? Math.min(100, Math.round((data.total / target) * 100)) : 0;
        return [
          period,
          data.total,
          target,
          `${percent}%`,
          data.count,
          `${data.members.size} / ${activeMembersCount}`,
          percent >= 90 ? 'Sangat Baik' : percent >= 60 ? 'Cukup' : 'Perlu Dioptimalkan',
        ];
      }),
  ];

  // Compute Regu Recap rows
  const reguMap = new Map<string, { total: number; membersCount: number; paidMembers: Set<string> }>();
  const currentMonthPeriod = new Date().toISOString().slice(0, 7);

  members.forEach((m) => {
    const reguName = m.regu;
    const existing = reguMap.get(reguName) || { total: 0, membersCount: 0, paidMembers: new Set<string>() };
    existing.membersCount += 1;
    reguMap.set(reguName, existing);
  });

  transactions.forEach((t) => {
    if (t.monthPeriod === currentMonthPeriod) {
      const existing = reguMap.get(t.regu);
      if (existing) {
        existing.total += t.amount;
        existing.paidMembers.add(t.memberId);
      }
    }
  });

  const reguRecapRows = [
    ['Nama Regu', 'Jumlah Anggota', 'Total Terkumpul Bulan Ini (Rp)', 'Estimasi Target (Rp)', 'Tingkat Kepatuhan (%)', 'Anggota Lunas Bulan Ini'],
    ...Array.from(reguMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([regu, data]) => {
        const target = data.membersCount * settings.defaultFeePerMeeting * 4;
        const percent = target > 0 ? Math.min(100, Math.round((data.total / target) * 100)) : 0;
        return [
          regu,
          data.membersCount,
          data.total,
          target,
          `${percent}%`,
          `${data.paidMembers.size} / ${data.membersCount}`,
        ];
      }),
  ];

  // Clear & write ranges using batchUpdate
  const batchData = [
    { range: `'${SHEETS_NAMES.MEMBERS}'!A1`, values: memberRows },
    { range: `'${SHEETS_NAMES.TRANSACTIONS}'!A1`, values: transactionRows },
    { range: `'${SHEETS_NAMES.SETTINGS}'!A1`, values: settingsRows },
    { range: `'${SHEETS_NAMES.MONTHLY_RECAP}'!A1`, values: monthlyRecapRows },
    { range: `'${SHEETS_NAMES.REGU_RECAP}'!A1`, values: reguRecapRows },
  ];

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData,
      }),
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    console.warn('Batch update notice:', updateRes.status, errText);
    throw new Error(formatGoogleErrorMessage(updateRes.status, errText));
  }
}

/**
 * Updates only the recap calculation tabs (REKAP_BULANAN and REKAP_REGU) in Google Sheets
 */
export async function updateRecapTabsInSheet(
  token: string,
  spreadsheetId: string,
  settings: GudepSettings,
  members: ScoutMember[],
  transactions: PaymentRecord[]
): Promise<void> {
  // Ensure recap tabs exist
  await ensureSpreadsheetTabs(token, spreadsheetId, [SHEETS_NAMES.MONTHLY_RECAP, SHEETS_NAMES.REGU_RECAP]);

  // Compute Monthly Recap rows
  const monthMap = new Map<string, { total: number; count: number; members: Set<string> }>();
  transactions.forEach((t) => {
    const existing = monthMap.get(t.monthPeriod) || { total: 0, count: 0, members: new Set<string>() };
    existing.total += t.amount;
    existing.count += 1;
    existing.members.add(t.memberId);
    monthMap.set(t.monthPeriod, existing);
  });

  const activeMembersCount = members.filter((m) => m.active).length || 1;
  const monthlyRecapRows = [
    ['Periode Bulan', 'Total Terkumpul (Rp)', 'Target Iuran (Rp)', 'Persentase Capaian (%)', 'Jumlah Transaksi', 'Anggota Bayar', 'Status'],
    ...Array.from(monthMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([period, data]) => {
        const target = activeMembersCount * settings.defaultFeePerMeeting * 4;
        const percent = target > 0 ? Math.min(100, Math.round((data.total / target) * 100)) : 0;
        return [
          period,
          data.total,
          target,
          `${percent}%`,
          data.count,
          `${data.members.size} / ${activeMembersCount}`,
          percent >= 90 ? 'Sangat Baik' : percent >= 60 ? 'Cukup' : 'Perlu Dioptimalkan',
        ];
      }),
  ];

  // Compute Regu Recap rows
  const reguMap = new Map<string, { total: number; membersCount: number; paidMembers: Set<string> }>();
  const currentMonthPeriod = new Date().toISOString().slice(0, 7);

  members.forEach((m) => {
    const reguName = m.regu;
    const existing = reguMap.get(reguName) || { total: 0, membersCount: 0, paidMembers: new Set<string>() };
    existing.membersCount += 1;
    reguMap.set(reguName, existing);
  });

  transactions.forEach((t) => {
    if (t.monthPeriod === currentMonthPeriod) {
      const existing = reguMap.get(t.regu);
      if (existing) {
        existing.total += t.amount;
        existing.paidMembers.add(t.memberId);
      }
    }
  });

  const reguRecapRows = [
    ['Nama Regu', 'Jumlah Anggota', 'Total Terkumpul Bulan Ini (Rp)', 'Estimasi Target (Rp)', 'Tingkat Kepatuhan (%)', 'Anggota Lunas Bulan Ini'],
    ...Array.from(reguMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([regu, data]) => {
        const target = data.membersCount * settings.defaultFeePerMeeting * 4;
        const percent = target > 0 ? Math.min(100, Math.round((data.total / target) * 100)) : 0;
        return [
          regu,
          data.membersCount,
          data.total,
          target,
          `${percent}%`,
          `${data.paidMembers.size} / ${data.membersCount}`,
        ];
      }),
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `'${SHEETS_NAMES.MONTHLY_RECAP}'!A1`, values: monthlyRecapRows },
          { range: `'${SHEETS_NAMES.REGU_RECAP}'!A1`, values: reguRecapRows },
        ],
      }),
    }
  );
}

/**
 * Helper to dynamically get the transaction sheet name from spreadsheet metadata
 */
async function resolveTransactionSheetName(token: string, spreadsheetId: string): Promise<string> {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const titles: string[] = (meta.sheets || []).map((s: any) => s.properties.title);
      const found = titles.find(
        (t) => t.toUpperCase().includes('TRANSAKSI') || t.toUpperCase().includes('IURAN')
      );
      if (found) return found;
      if (titles.length > 0) return titles[0];
    }
  } catch {
    // fallback
  }
  return SHEETS_NAMES.TRANSACTIONS;
}

/**
 * Appends a new transaction row to the transaction sheet in real time
 */
export async function appendTransactionToSheet(
  token: string,
  spreadsheetId: string,
  record: PaymentRecord
): Promise<void> {
  const row = [
    record.id,
    record.date,
    record.monthPeriod,
    `Minggu ${record.weekNumber}`,
    record.memberId,
    record.memberName,
    record.regu,
    record.amount,
    record.paymentMethod,
    record.loggedBy,
    record.note || '-',
    record.timestamp,
  ];

  const sheetName = await resolveTransactionSheetName(token, spreadsheetId);
  const safeSheetName = sheetName.replace(/'/g, "''");

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${safeSheetName}'!A:L:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );

  if (!appendRes.ok) {
    const errText = await appendRes.text();
    console.warn('Append to spreadsheet failed:', appendRes.status, errText);
    throw new Error(formatGoogleErrorMessage(appendRes.status, errText));
  }
}

/**
 * Appends multiple transaction rows to the transaction sheet in a single batch request
 */
export async function appendTransactionsBatchToSheet(
  token: string,
  spreadsheetId: string,
  records: PaymentRecord[]
): Promise<void> {
  if (records.length === 0) return;

  const rows = records.map((record) => [
    record.id,
    record.date,
    record.monthPeriod,
    `Minggu ${record.weekNumber}`,
    record.memberId,
    record.memberName,
    record.regu,
    record.amount,
    record.paymentMethod,
    record.loggedBy,
    record.note || '-',
    record.timestamp,
  ]);

  const sheetName = await resolveTransactionSheetName(token, spreadsheetId);
  const safeSheetName = sheetName.replace(/'/g, "''");

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${safeSheetName}'!A:L:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!appendRes.ok) {
    const errText = await appendRes.text();
    console.warn('Batch append to spreadsheet failed:', appendRes.status, errText);
    throw new Error(formatGoogleErrorMessage(appendRes.status, errText));
  }
}

/**
 * Checks spreadsheet accessibility and fetches metadata
 */
export async function verifySpreadsheet(
  token: string,
  spreadsheetId: string
): Promise<{ title: string; sheetNames: string[] }> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(formatGoogleErrorMessage(res.status, err));
  }

  const data: SpreadsheetResponse = await res.json();
  return {
    title: data.properties.title,
    sheetNames: data.sheets.map((s) => s.properties.title),
  };
}

/**
 * Pulls members, transactions, and settings from connected Google Spreadsheet.
 * Dynamically resolves real tab names to prevent 400 range errors and accurately reflects 0 transactions.
 */
export async function pullSpreadsheetData(
  token: string,
  spreadsheetId: string
): Promise<{
  members?: ScoutMember[];
  transactions: PaymentRecord[];
  settings?: Partial<GudepSettings>;
}> {
  // 1. Fetch available sheets in the spreadsheet
  let availableTitles: string[] = [];
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      availableTitles = metaData.sheets?.map((s: any) => s.properties?.title) || [];
    }
  } catch (metaErr) {
    console.warn('Could not fetch sheet metadata:', metaErr);
  }

  // Fallback if metadata call failed
  if (availableTitles.length === 0) {
    availableTitles = [
      SHEETS_NAMES.TRANSACTIONS,
      SHEETS_NAMES.MEMBERS,
      SHEETS_NAMES.SETTINGS,
    ];
  }

  // 2. Identify corresponding sheets dynamically
  const transSheetName = availableTitles.find(
    (t) =>
      t.toUpperCase().includes('TRANSAKSI') ||
      t.toUpperCase().includes('IURAN') ||
      t.toUpperCase().includes('PEMBAYARAN') ||
      t.toUpperCase().includes('BAYAR') ||
      t.toUpperCase().includes('KAS')
  );

  const memberSheetName =
    availableTitles.find(
      (t) =>
        t.toUpperCase().includes('ANGGOTA') ||
        t.toUpperCase().includes('MEMBER') ||
        t.toUpperCase().includes('SISWA') ||
        t.toUpperCase().includes('PESERTA') ||
        t.toUpperCase().includes('PRAMUKA')
    ) || (availableTitles[0] !== transSheetName ? availableTitles[0] : undefined);

  const settingsSheetName = availableTitles.find(
    (t) =>
      t.toUpperCase().includes('PENGATURAN') ||
      t.toUpperCase().includes('SETTING') ||
      t.toUpperCase().includes('GUDEP') ||
      t.toUpperCase().includes('CONFIG')
  );

  // 3. Build range query ONLY for sheets that actually exist in availableTitles
  const rangesToFetch: { type: 'members' | 'transactions' | 'settings'; sheetName: string; range: string }[] = [];

  if (memberSheetName && availableTitles.includes(memberSheetName)) {
    rangesToFetch.push({
      type: 'members',
      sheetName: memberSheetName,
      range: `'${memberSheetName}'!A1:H`,
    });
  }

  if (transSheetName && availableTitles.includes(transSheetName)) {
    rangesToFetch.push({
      type: 'transactions',
      sheetName: transSheetName,
      range: `'${transSheetName}'!A1:L`,
    });
  }

  if (settingsSheetName && availableTitles.includes(settingsSheetName)) {
    rangesToFetch.push({
      type: 'settings',
      sheetName: settingsSheetName,
      range: `'${settingsSheetName}'!A1:B`,
    });
  }

  const members: ScoutMember[] = [];
  const transactions: PaymentRecord[] = [];
  const settings: Partial<GudepSettings> = {};

  if (rangesToFetch.length === 0) {
    return { members, transactions, settings };
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesToFetch
    .map((r) => `ranges=${encodeURIComponent(r.range)}`)
    .join('&')}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn('BatchGet failed:', res.status, err);
    throw new Error(formatGoogleErrorMessage(res.status, err));
  }

  const data = await res.json();
  const valueRanges = data.valueRanges || [];

  const isHeaderRow = (r: (string | number)[]) => {
    if (!r || r.length === 0) return true;
    const combined = r.map((c) => String(c ?? '').toLowerCase().trim()).join(' ');
    return (
      combined.includes('id transaksi') ||
      combined.includes('id anggota') ||
      combined.includes('nama anggota') ||
      combined.includes('periode bulan') ||
      combined.includes('minggu ke') ||
      combined.includes('nominal') ||
      combined.includes('metode') ||
      combined.includes('jenis kelamin') ||
      combined.includes('pengaturan') ||
      combined.includes('tingkatan') ||
      combined.startsWith('no nama') ||
      combined.startsWith('id nama')
    );
  };

  const isEmptyRow = (r: (string | number)[]) => {
    return !r || r.length === 0 || r.every((cell) => String(cell ?? '').trim() === '');
  };

  const isSummaryRow = (r: (string | number)[]) => {
    const firstCell = String(r[0] || '').toLowerCase().trim();
    return (
      firstCell.startsWith('total') ||
      firstCell.startsWith('jumlah') ||
      firstCell.startsWith('rekap') ||
      firstCell.startsWith('subtotal')
    );
  };

  // Map returned ranges back to their respective types
  rangesToFetch.forEach((target, rangeIndex) => {
    const values: (string | number)[][] = valueRanges[rangeIndex]?.values || [];

    if (target.type === 'members') {
      values.forEach((row, idx) => {
        if (isEmptyRow(row) || isHeaderRow(row) || isSummaryRow(row)) return;

        // Extract ID and Name accurately
        const cell0 = String(row[0] || '').trim();
        const cell1 = String(row[1] || '').trim();

        if (!cell0 && !cell1) return;

        let id = `M-${String(idx + 1).padStart(3, '0')}`;
        let name = cell0;

        if (cell0.startsWith('M-') || cell0.startsWith('ID-')) {
          id = cell0;
          name = cell1 || 'Anggota Pramuka';
        } else if (/^\d+$/.test(cell0) && cell1) {
          // Pattern: [No, Nama Anggota]
          id = `M-${String(cell0).padStart(3, '0')}`;
          name = cell1;
        } else if (cell1 && !cell1.toLowerCase().includes('regu')) {
          name = cell0 || cell1;
        }

        const regu = String(row[2] || 'Regu Garuda').trim();
        const genderStr = String(row[3] || '').toLowerCase().trim();
        const gender: 'L' | 'P' = genderStr.includes('putri') || genderStr === 'p' ? 'P' : 'L';
        const level = (String(row[4] || 'Penggalang Ramu').trim() as any);
        const phone = String(row[5] || '').trim();
        const isPinru = String(row[6] || '').toLowerCase().includes('pinru');
        const activeStr = String(row[7] || '').toLowerCase().trim();
        const active = activeStr !== 'non-aktif' && activeStr !== 'tidak aktif';

        members.push({
          id,
          name,
          regu,
          gender,
          level,
          phone: phone === '-' ? '' : phone,
          isPinru,
          active,
        });
      });
    }

    if (target.type === 'transactions') {
      values.forEach((row, idx) => {
        if (isEmptyRow(row) || isHeaderRow(row) || isSummaryRow(row)) return;

        // Ensure row has legitimate transaction data (e.g. valid amount or member)
        const cell0 = String(row[0] || '').trim();
        const cell1 = String(row[1] || '').trim();
        const cell4 = String(row[4] || '').trim();
        const cell5 = String(row[5] || '').trim();
        const rawAmount = row[7] ?? row[6] ?? row[8];

        // Parse amount
        let amount = 0;
        if (typeof rawAmount === 'number') {
          amount = rawAmount;
        } else if (rawAmount) {
          const num = parseInt(String(rawAmount).replace(/\D/g, ''), 10);
          if (!isNaN(num) && num > 0) amount = num;
        }

        // Skip completely invalid or non-transaction rows
        if (!cell0 && !cell1 && !cell4 && !cell5 && amount === 0) return;

        const txId = cell0.startsWith('TX-') ? cell0 : `TX-${String(idx + 1).padStart(6, '0')}`;
        const dateStr = /^\d{4}-\d{2}-\d{2}/.test(cell1)
          ? cell1.slice(0, 10)
          : new Date().toISOString().slice(0, 10);
        const monthPeriod = String(row[2] || dateStr.slice(0, 7)).trim();
        const weekStr = String(row[3] || '');
        const weekNum = parseInt(weekStr.replace(/\D/g, ''), 10) || 1;
        const memberId = cell4 || `M-${String(idx + 1).padStart(3, '0')}`;
        const memberName = cell5 || String(row[4] || 'Anggota Pramuka').trim();
        const regu = String(row[6] || 'Regu Garuda').trim();
        const paymentMethod = (String(row[8] || 'Tunai').trim() as any) || 'Tunai';
        const loggedBy = String(row[9] || 'Bendahara').trim();
        const note = String(row[10] || '').trim();
        const timestamp = String(row[11] || new Date().toISOString()).trim();

        transactions.push({
          id: txId,
          date: dateStr,
          monthPeriod,
          weekNumber: weekNum,
          memberId,
          memberName,
          regu,
          amount: amount || 5000,
          paymentMethod,
          loggedBy,
          note: note === '-' ? '' : note,
          timestamp,
        });
      });
    }

    if (target.type === 'settings') {
      values.forEach((row) => {
        if (isEmptyRow(row)) return;
        const key = String(row[0] || '').toLowerCase().trim();
        const val = String(row[1] || '').trim();
        if (key.includes('nama gugus')) settings.gudepName = val;
        if (key.includes('pangkalan')) settings.pangkalan = val;
        if (key.includes('nominal')) settings.defaultFeePerMeeting = parseInt(val.replace(/\D/g, ''), 10) || 5000;
        if (key.includes('jadwal')) settings.meetingDay = val;
        if (key.includes('pembina')) settings.pembinaName = val;
        if (key.includes('bendahara')) settings.bendaharaName = val;
      });
    }
  });

  return { members, transactions, settings };
}
