export default function StrategyObjectivesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-72 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-96 animate-pulse rounded bg-neutral-100" />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="h-10 animate-pulse rounded bg-neutral-100" />
          <div className="h-10 animate-pulse rounded bg-neutral-100" />
          <div className="h-10 animate-pulse rounded bg-neutral-100" />
          <div className="h-10 animate-pulse rounded bg-neutral-100" />
        </div>
        <div className="space-y-3">
          <div className="h-12 animate-pulse rounded bg-neutral-100" />
          <div className="h-12 animate-pulse rounded bg-neutral-100" />
          <div className="h-12 animate-pulse rounded bg-neutral-100" />
        </div>
      </div>
    </div>
  )
}
