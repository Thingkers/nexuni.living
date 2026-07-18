type BrandWordmarkProps = {
  inverse?: boolean
  compact?: boolean
  className?: string
}

export default function BrandWordmark({
  inverse = false,
  compact = false,
  className = '',
}: BrandWordmarkProps) {
  return (
    <span
      className={`inline-flex items-baseline whitespace-nowrap font-black tracking-[-0.065em] ${
        compact ? 'text-lg' : 'text-xl'
      } ${inverse ? 'text-white' : 'text-[#071c19] dark:text-white'} ${className}`}
      aria-label="nexUni.living"
    >
      <span>nex</span>
      <span className="text-teal-400">U</span>
      <span>ni</span>
      <span className={`ml-0.5 font-semibold tracking-[-0.04em] ${inverse ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
        .living
      </span>
    </span>
  )
}
