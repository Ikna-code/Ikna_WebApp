'use client';

interface Props {
  selected: string;
  onChange: (value: string) => void;
}

export default function SalesFilter({
  selected,
  onChange,
}: Props) {
  return (
    <div className="flex bg-white rounded-full p-1 shadow-sm border border-pink-100 w-fit">
      {['week', 'month', 'year'].map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className={`px-6 py-2 rounded-full text-sm capitalize transition ${
            selected === item
              ? 'bg-[#8b004f] text-white'
              : 'text-gray-500'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}