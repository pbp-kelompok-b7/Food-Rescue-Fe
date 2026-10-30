// Shared display formatters and enum→Indonesian labels used across the
// supply, request, and reservation modules. Single source of truth so the
// three modules no longer copy these verbatim.

// Trim trailing-zero decimals: "5.000" -> "5", "2.500" -> "2.5".
export const quantityText = (value: string | number) => String(value).replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1')

// Rupiah with up to 2 decimals, e.g. "20000.00" -> "Rp20.000,00".
export const priceText = (value: string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(Number(value))

// RFC3339 timestamp -> "18 Okt 2026, 17.30 WIB" in Asia/Jakarta.
export function deadlineText(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? `${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(date)} WIB`
    : 'Waktu tidak tersedia'
}

// Canonical enum labels. Resource/suitability/mode are shared; status labels
// are module-specific (listing vs request vs reservation) so each module may
// extend this with its own status map.
export const sharedLabels: Record<string, string> = {
  PACKAGED_FOOD_SURPLUS: 'Makanan kemasan', COMPOSTABLE_FOOD_WASTE: 'Bahan organik',
  HUMAN_CONSUMPTION: 'Konsumsi manusia', ANIMAL_FEED: 'Pakan hewan', COMPOSTING: 'Kompos', BSF: 'Pakan maggot (BSF)', UPCYCLING: 'Olahan kembali',
  DONATE: 'Donasi', SELL: 'Jual',
}

// Build a labeller from the shared map plus module-specific status labels.
export function makeLabeller(extra: Record<string, string> = {}) {
  const map = { ...sharedLabels, ...extra }
  return (value: string) => map[value] || value.replaceAll('_', ' ')
}
