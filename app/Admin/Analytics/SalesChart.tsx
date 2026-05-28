'use client';

interface Props {
  data: {
    name: string;
    sales: number;
  }[];
}

export default function SalesChart({
  data,
}: Props) {
  const max = Math.max(
    ...data.map((d) => d.sales)
  );

  return (
    <div className="w-full">

      {/* Y Labels */}

      <div className="flex justify-between text-xs text-gray-400 mb-3 px-1">
        <span>₹20k</span>
        <span>₹40k</span>
        <span>₹60k</span>
        <span>₹80k</span>
      </div>

      {/* CHART */}

      <div className="flex items-end justify-between gap-6 h-[220px]">

        {data.map((item, i) => {
          const height =
            (item.sales / max) * 180;

          const dark =
            i % 2 === 1;

          return (
            <div
              key={i}
              className="flex flex-col items-center flex-1"
            >

              {/* VALUE */}

              <span className="text-xs font-medium text-[#2d0b1f] mb-2">
                ₹
                {Math.floor(
                  item.sales / 1000
                )}
                k
              </span>

              {/* BAR */}

              <div
                style={{
                  height: `${height}px`,
                }}
                className={`w-full max-w-[48px] rounded-t-2xl shadow-inner ${
                  dark
                    ? 'bg-gradient-to-b from-[#2d0017] to-[#7d003d]'
                    : 'bg-gradient-to-b from-[#f6b7c7] to-[#de7c98]'
                }`}
              />

              {/* LABEL */}

              <span className="text-sm text-gray-500 mt-3">
                {item.name}
              </span>

            </div>
          );
        })}

      </div>

    </div>
  );
}