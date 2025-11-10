export default function PageLayout({ left, right, fullWidth = false }) {
  return (
    <div className="page-container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 md:grid-cols-12 md:gap-6">
        {!fullWidth && (
          <div className="md:col-span-4 mb-4 md:mb-0">
            {left}
          </div>
        )}
        <div className={fullWidth ? "md:col-span-12" : "md:col-span-8"}>
          <div className="h-full flex items-stretch">
            {right}
          </div>
        </div>
      </div>
    </div>
  )
}

