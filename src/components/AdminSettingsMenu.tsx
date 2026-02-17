import {
  applyThemeMode,
  getThemeMode,
  type ThemeMode,
} from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  compact?: boolean; // true = botão só com ícone (mobile)
};

export default function AdminSettingsMenu({ compact }: Props) {
  const [mode, setMode] = useState<ThemeMode>(() => getThemeMode());

  useEffect(() => {
    applyThemeMode(mode);
  }, [mode]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button variant="outline" size="icon" aria-label="Configurações">
            <Settings className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" className="w-full justify-start gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-60" align="end">
        {/* <DropdownMenuLabel>Preferências</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/admin/settings/appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Aparência…
          </Link>
        </DropdownMenuItem> */}

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Tema
        </DropdownMenuLabel>

        <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setMode(v as ThemeMode)}>
          <DropdownMenuRadioItem value="light">Claro</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">Noturno</DropdownMenuRadioItem>
          {/* <DropdownMenuRadioItem value="custom">Personalizado</DropdownMenuRadioItem> */}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
