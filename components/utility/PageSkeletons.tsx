type SkeletonBlockProps = {
  className: string;
};

function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={`ikna-skeleton rounded-2xl ${className}`} aria-hidden="true" />;
}

export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-white text-[#321327]">
      <div className="sticky top-0 z-40 border-b border-[#321327]/10 bg-white/95 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <SkeletonBlock className="h-10 w-32 rounded-full" />
          <div className="hidden items-center gap-3 md:flex">
            <SkeletonBlock className="h-8 w-20 rounded-full" />
            <SkeletonBlock className="h-8 w-20 rounded-full" />
            <SkeletonBlock className="h-8 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-9 w-9 rounded-full" />
            <SkeletonBlock className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-4 pb-10 pt-6 md:px-8 md:pt-8">
        <SkeletonBlock className="h-44 w-full rounded-[2rem] md:h-64" />

        <section className="space-y-4">
          <SkeletonBlock className="mx-auto h-8 w-44" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="space-y-3 rounded-3xl border border-[#321327]/10 bg-[#FAF3F5] p-3 md:p-4">
                <SkeletonBlock className="h-40 w-full rounded-2xl md:h-56" />
                <SkeletonBlock className="h-4 w-3/4" />
                <SkeletonBlock className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 pt-4 lg:grid-cols-2">
          <SkeletonBlock className="h-80 w-full rounded-[2rem]" />
          <div className="space-y-4 rounded-[2rem] border border-[#321327]/10 bg-[#FAF3F5] p-5 md:p-6">
            <SkeletonBlock className="h-8 w-2/3" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-5/6" />
            <SkeletonBlock className="h-36 w-full rounded-xl" />
            <SkeletonBlock className="h-4 w-2/3" />
          </div>
        </section>
      </div>
    </div>
  );
}

export function ShopPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF3F5] text-[#321327]">
      <div className="sticky top-0 z-40 border-b border-[#321327]/10 bg-white/95 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <SkeletonBlock className="h-10 w-32 rounded-full" />
          <div className="hidden items-center gap-3 md:flex">
            <SkeletonBlock className="h-8 w-20 rounded-full" />
            <SkeletonBlock className="h-8 w-20 rounded-full" />
            <SkeletonBlock className="h-8 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-9 w-9 rounded-full" />
            <SkeletonBlock className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 pb-10 pt-6 md:px-8 md:pt-8">
        <SkeletonBlock className="h-12 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-3xl border border-[#321327]/10 bg-white p-3 md:p-4">
              <SkeletonBlock className="h-44 w-full rounded-2xl md:h-60" />
              <SkeletonBlock className="h-4 w-4/5" />
              <SkeletonBlock className="h-3 w-2/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AccountPageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SkeletonBlock className="h-8 w-44" />
        <SkeletonBlock className="h-10 w-28 rounded-full" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-[2rem] border border-[#321327]/10 bg-white p-5 md:p-7">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="space-y-2">
                <SkeletonBlock className="h-5 w-52" />
                <SkeletonBlock className="h-3 w-36" />
              </div>
              <SkeletonBlock className="h-6 w-24 rounded-full" />
            </div>
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="mt-2 h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}