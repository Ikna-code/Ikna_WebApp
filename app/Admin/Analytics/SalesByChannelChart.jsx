import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

const formatTimePeriodLabel = (period) => {
  if (period === "custom") return "Custom";
  if (period === "7d") return "7D";
  if (period === "30d") return "30D";
  if (period === "90d") return "90D";
  return "1Y";
};

const defaultData = [
  {
    name: "T-Shirt Bras",
    value: 69283,
    percentage: "54%",
    color: "#840d5c",
  },
  {
    name: "Push-Up Bras",
    value: 30742,
    percentage: "24%",
    color: "#a33c82",
  },
  {
    name: "Non-Padded Bras",
    value: 15385,
    percentage: "12%",
    color: "#c66aa0",
  },
  {
    name: "Panty",
    value: 10240,
    percentage: "8%",
    color: "#d58cb5",
  },
  {
    name: "Shapewear",
    value: 2800,
    percentage: "2%",
    color: "#e8bfd5",
  },
];

export default function SalesByCategoryChart({
  timePeriod = "30d",
  data = defaultData,
  totalLabel,
}) {
  const totalValue =
    totalLabel ||
    `₹${data
      .reduce((sum, item) => sum + item.value, 0)
      .toLocaleString()}`;

  const hasData = data.length > 0;

  return (
    <div className="bg-white rounded-3xl border border-[#e8bfd5] shadow-sm p-6 h-[500px] flex flex-col">
      {/* Header */}
      <h2 className="text-base font-bold text-[#2f1126] mb-4 shrink-0">
        Sales by Category ({formatTimePeriodLabel(timePeriod)})
      </h2>

      {hasData ? (
        <div className="flex flex-col items-center flex-1 overflow-hidden">
          {/* Donut Chart */}
          <div className="relative h-[220px] w-[220px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-sm font-semibold uppercase tracking-wider text-[#8a5f79]">
                Total
              </span>

              <span className="text-3xl font-extrabold text-[#2f1126]">
                {totalValue}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="w-full mt-6 flex-1 overflow-y-auto pr-1">
            <div className="space-y-3">
              {data.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{
                        backgroundColor: item.color,
                      }}
                    />

                    <span
                      className="truncate text-sm font-medium text-[#5c2a46]"
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-[#2f1126] text-base leading-none">
                      {item.percentage}
                    </p>

                    <p className="text-xs text-[#8a5f79] mt-1">
                      ₹{item.value.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[#e8bfd5] text-sm font-medium text-[#8a5f79]">
          No results found
        </div>
      )}
    </div>
  );
}