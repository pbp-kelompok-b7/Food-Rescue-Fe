const files = {
  chevron: '9-269-select-chevron',
  check: '9-269-check',
  minus: '9-269-kurangi-jumlah',
  plus: '9-269-tambah-jumlah',
  loading: '9-269-loading-indicator',
  packaged: '11-398-type-icon',
  organic: '11-398-type-icon1',
  clock: '11-398-deadline-icon',
  packageLarge: '11-398-resource-illustration-icon',
  organicLarge: '11-398-resource-illustration-icon1',
  donate: '11-398-mode-icon',
  sell: '11-398-mode-icon1',
  pin: '11-398-location-icon',
  food: '11-398-use-icon',
  compost: '11-398-use-icon1',
  error: '18-462-error-icon',
  empty: '18-462-empty-icon',
  dashboard: '18-462-empty-icon1',
  confirmation: '18-462-confirmation-icon',
  info: '18-462-notice-icon',
  warning: '18-462-notice-icon1',
  danger: '18-462-notice-icon2',
  success: '18-462-notice-icon3',
  menu: '18-585-menu',
  account: '18-585-akun-login',
  profile: '18-585-profil',
  accountChevron: '18-585-buka-menu',
  location: '18-719-trailing-icon',
}

// SVG dimensions belong to the original Figma asset; the wrapper preserves its slot.
export default function Icon({ name, className = '' }: { name: keyof typeof files; className?: string }) {
  if (!files[name]) return null
  return (
    <span className={`fr-icon ${className}`} aria-hidden="true">
      <img src={`/assets/figma/${files[name]}.svg`} alt="" />
    </span>
  )
}
