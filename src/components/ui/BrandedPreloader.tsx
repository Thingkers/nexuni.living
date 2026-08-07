import Image from 'next/image'

export default function BrandedPreloader({
  fullScreen = true,
  label = 'Preparing nexUni…',
}: {
  fullScreen?: boolean
  label?: string
}) {
  return (
    <div
      className={`flex items-center justify-center bg-[#eef3f1] text-slate-950 dark:bg-slate-950 dark:text-white ${
        fullScreen ? 'min-h-[calc(100dvh-4rem)]' : 'h-full min-h-64'
      }`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex flex-col items-center">
        <div className="nexuni-preloader-orbit">
          <span className="nexuni-preloader-ring nexuni-preloader-ring-outer" />
          <span className="nexuni-preloader-ring nexuni-preloader-ring-inner" />
          <span className="nexuni-preloader-line nexuni-preloader-line-one" />
          <span className="nexuni-preloader-line nexuni-preloader-line-two" />
          <span className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-white/70 bg-white shadow-[0_16px_45px_rgba(7,28,25,.24),inset_0_1px_0_white] dark:border-slate-700 dark:bg-slate-900">
            <Image src="/icon.jpeg" alt="" width={54} height={54} priority className="h-[54px] w-[54px] object-contain" />
          </span>
        </div>
        <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <span className="mt-3 h-1 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <span className="nexuni-preloader-progress block h-full w-1/2 rounded-full bg-teal-500" />
        </span>
      </div>
    </div>
  )
}
