export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-80 animate-pulse rounded bg-neutral-100" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-lg border border-neutral-200 bg-white" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-lg border border-neutral-200 bg-white" />
        <div className="h-80 animate-pulse rounded-lg border border-neutral-200 bg-white" />
      </div>
    </div>
  )
}
