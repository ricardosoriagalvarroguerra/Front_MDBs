export const MDB_COLOR_BY_CODE = {
  FONPLATA: '#c1121f',
  CAF: '#38b000',
  IADB: '#0e6ba8',
  IBRD: '#5fa8d3',
  'CDB-CAR': '#ea7317',
  CABEI: '#7c3aed',
}

export function colorForMdbCode(label, fallback) {
  const code = String(label || '').toUpperCase()
  const fixed = MDB_COLOR_BY_CODE[code]
  if (fixed) return fixed
  if (typeof fallback === 'function') return fallback(code)
  return fallback || '#64748b'
}


