const SizeChart = () => {
  const sizeData = [
    { label: 'Bust Size (in)', xs: '30-32', s: '32-34', m: '34-36', l: '36-38', xl: '38-40', xxl: '40-42' },
    { label: 'Band Size (in)', xs: '28-30', s: '30-32', m: '32-34', l: '34-36', xl: '36-38', xxl: '38-40' },
  ];

  const columns = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  return (
    /* Outer Container: Mist Sage Background */
    <div className="w-full bg-[#f1f3f2] p-6 md:p-8 rounded-2xl border border-[#e2e8e5] shadow-sm">
      <div className="mb-6">
        <h3 className="text-[10px] tracking-[0.2em] font-bold uppercase text-[#4a5551]">
          Size Guide
        </h3>
        <p className="text-xl font-serif text-[#321327] mt-1">Bust Size Chart</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#e2e8e5] bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="py-4 px-4 bg-[#f8faf9] text-[10px] font-bold uppercase tracking-wider text-[#4a5551] border-b border-[#e2e8e5]">
                Measurement
              </th>
              {columns.map((col) => (
                <th 
                  key={col} 
                  /* Header Cells: Dusty Sage */
                  className="py-4 px-2 border-b border-[#e2e8e5] text-[11px] font-bold text-center text-[#321327] bg-[#e2e8e5]/50"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizeData.map((row, index) => (
              <tr key={index} className="group hover:bg-[#f1f3f2]/50 transition-colors">
                <td className="py-5 px-4 border-b border-[#e2e8e5]/60 text-[11px] font-bold text-[#321327] uppercase bg-[#f8faf9]/50">
                  {row.label}
                </td>
                {/* Dynamically rendering cells for cleaner code */}
                {[row.xs, row.s, row.m, row.l, row.xl, row.xxl].map((val, i) => (
                  <td key={i} className="py-5 px-2 border-b border-[#e2e8e5]/60 text-[11px] text-center text-[#4a5551] group-hover:text-[#840d5c] group-hover:font-bold transition-all">
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Suggestion Footer: Using Brand Color #840d5c as the accent */}
      <div className="mt-6 flex items-start gap-4 p-4 bg-white border-l-4 border-[#840d5c] rounded-r-lg shadow-sm">
        <div className="mt-0.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#840d5c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </div>
        <p className="text-[11px] leading-relaxed text-[#4a5551]">
          <span className="font-bold text-[#840d5c] uppercase mr-1">Pro Tip:</span> 
          If you are between sizes, we recommend sizing up for a more relaxed fit or sizing down for extra lift.
        </p>
      </div>
    </div>
  );
};

export default SizeChart;