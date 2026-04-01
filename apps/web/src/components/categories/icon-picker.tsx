import { useState } from 'react'
import {
  ShoppingCart, UtensilsCrossed, Car, Home, Heart, Briefcase, GraduationCap,
  Plane, Gift, Music, Gamepad2, Dog, Baby, Bike, Dumbbell, Scissors,
  BookOpen, Coffee, Pizza, ShoppingBag, Fuel, Bus, Train, Wallet, CreditCard,
  PiggyBank, TrendingUp, Building, Stethoscope, Pill, Wrench, Hammer, Laptop,
  Smartphone, Tv, Camera, Shirt, Package, Leaf, Sun, Moon, Zap, Droplets,
  Flame, Snowflake, Globe, MapPin, Star, Tag, CircleDollarSign,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  ShoppingCart, UtensilsCrossed, Car, Home, Heart, Briefcase, GraduationCap,
  Plane, Gift, Music, Gamepad2, Dog, Baby, Bike, Dumbbell, Scissors,
  BookOpen, Coffee, Pizza, ShoppingBag, Fuel, Bus, Train, Wallet, CreditCard,
  PiggyBank, TrendingUp, Building, Stethoscope, Pill, Wrench, Hammer, Laptop,
  Smartphone, Tv, Camera, Shirt, Package, Leaf, Sun, Moon, Zap, Droplets,
  Flame, Snowflake, Globe, MapPin, Star, Tag, CircleDollarSign,
}

const ICON_NAMES = Object.keys(ICON_MAP)

interface IconPickerProps {
  value: string | null
  onChange: (iconName: string) => void
}

export function LucideIconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = search.trim()
    ? ICON_NAMES.filter((name) => name.toLowerCase().includes(search.toLowerCase()))
    : ICON_NAMES

  const SelectedIcon = value ? ICON_MAP[value] : null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 px-3 text-sm border border-input rounded-md bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {SelectedIcon ? <SelectedIcon size={16} aria-hidden="true" /> : <span className="text-muted-foreground">Select icon</span>}
        {value && <span className="text-muted-foreground text-xs">{value}</span>}
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-72 rounded-md border border-border bg-popover shadow-md p-3 space-y-2">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search icons..."
            className="w-full h-8 px-2 text-sm border border-input rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              No icons match &ldquo;{search}&rdquo;.
            </p>
          ) : (
            <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto" role="listbox">
              {filtered.map((name) => {
                const Icon = ICON_MAP[name]
                return (
                  <button
                    key={name}
                    type="button"
                    role="option"
                    aria-selected={value === name}
                    onClick={() => { onChange(name); setOpen(false); setSearch('') }}
                    title={name}
                    className={[
                      'flex items-center justify-center size-9 rounded hover:bg-muted transition-colors',
                      value === name ? 'ring-2 ring-primary bg-primary/10' : '',
                    ].join(' ')}
                  >
                    <Icon size={18} aria-hidden="true" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function renderLucideIcon(iconName: string | null, size = 16) {
  if (!iconName || !ICON_MAP[iconName]) return null
  const Icon = ICON_MAP[iconName]
  return <Icon size={size} aria-hidden="true" />
}
