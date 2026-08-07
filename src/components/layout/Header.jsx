export default function Header({ title = 'Ruffly', subtitle }) {
  return (
    <header className="print:hidden px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
      <p className="text-2xl font-extrabold tracking-tight text-[#F59E0B]">
        {title}
      </p>
      {subtitle ? (
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      ) : null}
    </header>
  )
}
