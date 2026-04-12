import { useState } from "react"
import {
  Baby,
  Bike,
  BookOpen,
  Briefcase,
  Building,
  Bus,
  Camera,
  Car,
  CircleDollarSign,
  Coffee,
  CreditCard,
  Dog,
  Droplets,
  Dumbbell,
  Flame,
  Fuel,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  Hammer,
  Heart,
  HeartPulse,
  Home,
  Laptop,
  Leaf,
  MapPin,
  Moon,
  MoreHorizontal,
  Music,
  Package,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Snowflake,
  Sparkles,
  Star,
  Stethoscope,
  Sun,
  Tag,
  Train,
  TrendingUp,
  Tv,
  UtensilsCrossed,
  Wallet,
  Wrench,
  Zap,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ploutizo/ui/components/popover"
import { Button } from "@ploutizo/ui/components/button"
import { Input } from "@ploutizo/ui/components/input"
import type { LucideIcon } from "lucide-react"

const ICON_MAP: Record<string, LucideIcon> = {
  ShoppingCart,
  UtensilsCrossed,
  Car,
  Home,
  Heart,
  Briefcase,
  GraduationCap,
  Plane,
  Gift,
  Music,
  Gamepad2,
  Dog,
  Baby,
  Bike,
  Dumbbell,
  Scissors,
  BookOpen,
  Coffee,
  Pizza,
  ShoppingBag,
  Fuel,
  Bus,
  Train,
  Wallet,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Building,
  Stethoscope,
  Pill,
  Wrench,
  Hammer,
  Laptop,
  Smartphone,
  Tv,
  Camera,
  Shirt,
  Package,
  Leaf,
  Sun,
  Moon,
  Zap,
  Droplets,
  Flame,
  Snowflake,
  Globe,
  MapPin,
  Star,
  Tag,
  CircleDollarSign,
  HeartPulse,
  Sparkles,
  MoreHorizontal,
}

const ICON_NAMES = Object.keys(ICON_MAP)

interface LucideIconPickerProps {
  value: string | null
  onChange: (iconName: string) => void
}

export const LucideIconPicker = ({
  value,
  onChange,
}: LucideIconPickerProps) => {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)

  const filtered = search.trim()
    ? ICON_NAMES.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase())
      )
    : ICON_NAMES

  const SelectedIcon = value ? ICON_MAP[value] : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2"
            aria-haspopup="listbox"
            aria-expanded={open}
          />
        }
      >
        {SelectedIcon ? (
          <SelectedIcon size={16} aria-hidden="true" />
        ) : (
          <span className="text-muted-foreground">Select icon</span>
        )}
        {value && (
          <span className="text-xs text-muted-foreground">{value}</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2 p-3">
        <Input
          autoFocus // Picker opened by user action — autoFocus on search is intentional and expected
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons…"
        />
        {filtered.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            No icons match "{search}".
          </p>
        ) : (
          <div
            className="grid max-h-48 grid-cols-6 gap-1 overflow-y-auto"
            role="listbox"
          >
            {filtered.map((name) => {
              const Icon = ICON_MAP[name]
              return (
                <Button
                  key={name}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  role="option"
                  aria-selected={value === name}
                  onClick={() => {
                    onChange(name)
                    setOpen(false)
                    setSearch("")
                  }}
                  title={name}
                  className={
                    value === name ? "bg-primary/10 ring-2 ring-primary" : ""
                  }
                >
                  <Icon size={18} aria-hidden="true" />
                </Button>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export const renderLucideIcon = (iconName: string | null, size = 16) => {
  if (!iconName || !(iconName in ICON_MAP)) return null
  const Icon = ICON_MAP[iconName]
  return <Icon size={size} aria-hidden="true" />
}
