'use client';

interface Props {
  data: {
    name: string;
    value: number;
    color?: string;
  }[];
}

export default function SalesPieChart({
  data,
}: Props) {
  const total = data.reduce(
    (acc, item) => acc + item.value,
    0
  );

  let cumulative = 0;

  return (
    <div className="flex flex-col items-center">

      <div className="relative w-[170px] h-[170px]">

        <svg
          viewBox="0 0 36 36"
          className="w-full h-full rotate-[-90deg]"
        >
          {data.map((item, index) => {
            const value =
              (item.value / total) * 100;

            const dashArray = `${value} ${
              100 - value
            }`;

            const dashOffset =
              -cumulative;

            cumulative += value;

            const colors = [
              '#3a001e',
              '#b54d74',
              '#e3a7b7',
            ];

            return (
              <circle
                key={index}
                cx="18"
                cy="18"
                r="15.9155"
                fill="transparent"
                stroke={
                  colors[index]
                }
                strokeWidth="4"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </svg>

        {/* INNER */}

        <div className="absolute inset-0 flex items-center justify-center">

          <div className="w-[90px] h-[90px] rounded-full bg-white" />

        </div>

      </div>

    </div>
  );
}