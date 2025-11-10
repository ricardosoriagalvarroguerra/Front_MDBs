export default function TextCard({ title, children }) {
  return (
    <section className="h-full min-h-[60vh] md:min-h-[calc(100dvh-120px)] w-full rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="p-6 md:p-7">
        <h2 className="text-base md:text-lg font-semibold mb-3 text-slate-900">{title}</h2>
        <div className="text-[12px] md:text-[13px] text-slate-600 leading-relaxed space-y-4">{children}</div>
      </div>
    </section>
  )
}
