export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTanggalIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatBulanIndo(monthPeriod: string): string {
  if (!monthPeriod) return '-';
  const [year, month] = monthPeriod.split('-');
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const mIndex = parseInt(month, 10) - 1;
  return `${monthNames[mIndex] || month} ${year}`;
}

export function getMonthPeriod(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function terbilang(n: number): string {
  if (n < 0) return 'minus ' + terbilang(-n);
  if (n === 0) return 'nol rupiah';
  
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  
  function konversi(num: number): string {
    if (num < 12) return satuan[num];
    if (num < 20) return konversi(num - 10) + ' belas';
    if (num < 100) return konversi(Math.floor(num / 10)) + ' puluh' + (num % 10 !== 0 ? ' ' + konversi(num % 10) : '');
    if (num < 200) return 'seratus' + (num % 100 !== 0 ? ' ' + konversi(num % 100) : '');
    if (num < 1000) return konversi(Math.floor(num / 100)) + ' ratus' + (num % 100 !== 0 ? ' ' + konversi(num % 100) : '');
    if (num < 2000) return 'seribu' + (num % 1000 !== 0 ? ' ' + konversi(num % 1000) : '');
    if (num < 1000000) return konversi(Math.floor(num / 1000)) + ' ribu' + (num % 1000 !== 0 ? ' ' + konversi(num % 1000) : '');
    if (num < 1000000000) return konversi(Math.floor(num / 1000000)) + ' juta' + (num % 1000000 !== 0 ? ' ' + konversi(num % 1000000) : '');
    return num.toString();
  }

  return konversi(n).trim() + ' rupiah';
}
