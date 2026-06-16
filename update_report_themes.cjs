const fs = require('fs');
let content = fs.readFileSync('src/components/ReportExport.tsx', 'utf8');

// Container
content = content.replace(
  'className="bg-slate-900 text-white rounded border border-slate-950 shadow-lg overflow-hidden animate-fadeIn"',
  'className={`rounded border shadow-lg overflow-hidden animate-fadeIn ${isDark ? \'bg-slate-900 text-white border-slate-950\' : \'bg-white text-slate-800 border-slate-200\'}`}'
);

// Header block
content = content.replace(
  'className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between"',
  'className={`px-4 py-2 border-b flex items-center justify-between ${isDark ? \'bg-slate-950 border-slate-800\' : \'bg-slate-100 border-slate-200\'}`}'
);

content = content.replace(
  'className="font-extrabold text-[11px] uppercase tracking-wider text-slate-100"',
  'className={`font-extrabold text-[11px] uppercase tracking-wider ${isDark ? \'text-slate-100\' : \'text-slate-700\'}`}'
);

content = content.replace(
  'className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-mono text-[9px] font-bold"',
  'className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold ${isDark ? \'bg-emerald-950 text-emerald-400\' : \'bg-emerald-100 text-emerald-700\'}`}'
);

// Block replacements
const replacements = [
  {
    search: 'className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-3.5"',
    replace: 'className={`p-3 rounded-lg border space-y-3.5 ${isDark ? \'bg-slate-950 border-slate-800\' : \'bg-slate-50 border-slate-200\'}`}'
  },
  {
    search: 'className="text-slate-300"',
    replace: 'className={isDark ? \'text-slate-300\' : \'text-slate-600\'}'
  },
  {
    search: 'className="bg-slate-900 p-2.5 rounded border border-slate-850"',
    replace: 'className={`p-2.5 rounded border ${isDark ? \'bg-slate-900 border-slate-850\' : \'bg-white border-slate-200\'}`}',
    global: true
  },
  {
    search: 'className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between space-y-4"',
    replace: 'className={`p-3.5 rounded-lg border flex flex-col justify-between space-y-4 ${isDark ? \'bg-slate-950 border-slate-800\' : \'bg-slate-50 border-slate-200\'}`}'
  },
  {
    search: 'className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between space-y-3.5"',
    replace: 'className={`p-3.5 rounded-lg border flex flex-col justify-between space-y-3.5 ${isDark ? \'bg-slate-950 border-slate-800\' : \'bg-slate-50 border-slate-200\'}`}'
  },
  {
    search: 'className="px-3 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-800"',
    replace: 'className={`px-3 py-2 rounded text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${isDark ? \'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800\' : \'bg-white hover:bg-slate-50 text-slate-600 border-slate-300\'}`}'
  },
  {
    search: 'className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded font-mono text-[10px] text-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-slate-950"',
    replace: 'className={`w-full px-2 py-1.5 border rounded font-mono text-[10px] focus:outline-none focus:border-emerald-500 ${isDark ? \'bg-slate-900 border-slate-800 text-slate-200 focus:bg-slate-950\' : \'bg-white border-slate-300 text-slate-800 focus:bg-slate-50\'}`}'
  },
  {
    search: 'className="text-emerald-400 font-bold uppercase text-[10px] tracking-wider mb-2 border-b border-slate-700 pb-1"',
    replace: 'className={`font-bold uppercase text-[10px] tracking-wider mb-2 border-b pb-1 ${isDark ? \'text-emerald-400 border-slate-700\' : \'text-emerald-600 border-slate-200\'}`}'
  },
  {
    search: 'className="bg-slate-950 p-2.5 border border-slate-850 rounded flex items-start gap-2 text-slate-500 font-medium"',
    replace: 'className={`p-2.5 border rounded flex items-start gap-2 font-medium ${isDark ? \'bg-slate-950 border-slate-850 text-slate-500\' : \'bg-slate-50 border-slate-200 text-slate-600\'}`}'
  }
];

replacements.forEach(rep => {
  if (rep.global) {
    content = content.split(rep.search).join(rep.replace);
  } else {
    content = content.replace(rep.search, rep.replace);
  }
});

// Fix some specific spans
content = content.replace(/className="text-slate-400"/g, "className={isDark ? 'text-slate-400' : 'text-slate-500'}");
content = content.replace(/className="font-bold text-slate-100"/g, "className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}");

fs.writeFileSync('src/components/ReportExport.tsx', content);
console.log('Done!');
