export const getThemeClasses = (isDark: boolean) => ({
  card: isDark ? 'bg-slate-900 border-slate-800/50' : 'bg-white border-slate-200',
  // Fő szekciókártyák: erős árnyék az elválasztáshoz
  sectionCard: isDark
    ? 'bg-slate-900 border-slate-800 shadow-lg shadow-black/50'
    : 'bg-white border-slate-200 shadow-lg shadow-black/10',
  // Belső panelek: finom árnyék
  innerCard: isDark
    ? 'bg-slate-800/10 border-slate-700/60 shadow-sm shadow-black/30'
    : 'bg-slate-50 border-slate-200 shadow-sm shadow-black/5',
  textPrimary: isDark ? 'text-slate-100' : 'text-slate-800',
  textSecondary: isDark ? 'text-slate-400' : 'text-slate-500',
  border: isDark ? 'border-slate-800/50' : 'border-slate-200',
  background: isDark ? 'bg-slate-950' : 'bg-slate-50',
});
