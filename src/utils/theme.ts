export const getThemeClasses = (isDark: boolean) => ({
  card: isDark ? 'bg-slate-900 border-slate-800/50' : 'bg-white border-slate-200',
  textPrimary: isDark ? 'text-slate-100' : 'text-slate-800',
  textSecondary: isDark ? 'text-slate-400' : 'text-slate-500',
  border: isDark ? 'border-slate-800/50' : 'border-slate-200',
  background: isDark ? 'bg-slate-950' : 'bg-slate-50',
});
