"use client"

import { useTheme } from "next-themes"
import { Moon as MoonIcon, Sun as SunIcon, SunMoon as SunMoonIcon } from "lucide-react"
import { Button } from "@ploutizo/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ploutizo/ui/components/tooltip"

const cycleMap = { system: "light", light: "dark", dark: "system" } as const
type Theme = keyof typeof cycleMap

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const current = (theme ?? "system") as Theme
  const label = current.charAt(0).toUpperCase() + current.slice(1)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setTheme(cycleMap[current])}
        >
          {current === "system" && <SunMoonIcon />}
          {current === "light" && <SunIcon />}
          {current === "dark" && <MoonIcon />}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
