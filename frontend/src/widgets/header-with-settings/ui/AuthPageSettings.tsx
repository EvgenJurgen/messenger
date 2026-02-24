import { useTheme } from '../model/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';

/** Language + theme bar for login and register pages. */
export function AuthPageSettings() {
  const { palette, togglePalette } = useTheme();
  return (
    <div className="fixed top-3 right-3 z-10 flex items-center gap-2 rounded-lg border border-border bg-secondary p-1.5 shadow-sm">
      <LanguageSwitcher />
      <ThemeToggle palette={palette} onToggle={togglePalette} />
    </div>
  );
}
