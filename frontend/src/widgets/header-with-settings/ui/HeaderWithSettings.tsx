import { ThemeProvider, useTheme } from '../model/ThemeContext';

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <div className={`min-h-screen ${palette} bg-primary`}>
      {children}
    </div>
  );
}

interface HeaderWithSettingsProps {
  children: React.ReactNode;
}

export function HeaderWithSettings({ children }: HeaderWithSettingsProps) {
  return (
    <ThemeProvider>
      <ThemeWrapper>
        {children}
      </ThemeWrapper>
    </ThemeProvider>
  );
}
