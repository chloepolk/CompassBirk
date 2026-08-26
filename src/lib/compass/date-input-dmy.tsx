"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { cn } from "@/lib/utils"
import {
  DATE_INPUT_PLACEHOLDER,
  formatDateDMY,
  localeTag,
  parseToIsoDate,
  toIsoDate,
  type DisplayLocale,
} from "@/lib/compass/locale-display"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/prosera/popover"

type DateInputDMYProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "placeholder"
> & {
  /** Stored value as YYYY-MM-DD (or empty). */
  value: string
  /** Emits YYYY-MM-DD on a valid date, or "" when cleared. */
  onChange: (isoDate: string) => void
  locale?: DisplayLocale
}

const WEEKDAY_ANCHOR_MONDAY = new Date(2026, 0, 5)

function weekdayLabels(locale: DisplayLocale): string[] {
  const fmt = new Intl.DateTimeFormat(localeTag(locale), { weekday: "short" })
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(
      WEEKDAY_ANCHOR_MONDAY.getFullYear(),
      WEEKDAY_ANCHOR_MONDAY.getMonth(),
      WEEKDAY_ANCHOR_MONDAY.getDate() + i,
    )
    return fmt.format(d).replace(/\.$/, "")
  })
}

function monthCaption(year: number, month: number, locale: DisplayLocale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1))
}

function parseIsoParts(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) }
}

function monthCells(year: number, month: number): { iso: string; day: number; inMonth: boolean }[] {
  const first = new Date(year, month, 1)
  const mondayOffset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - mondayOffset)
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    return {
      iso: toIsoDate(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
    }
  })
}

function CalendarGrid({
  selectedIso,
  locale,
  onSelect,
}: {
  selectedIso: string
  locale: DisplayLocale
  onSelect: (iso: string) => void
}) {
  const selected = parseIsoParts(selectedIso)
  const todayIso = toIsoDate(new Date())
  const initial = selected ?? parseIsoParts(todayIso) ?? { y: 2026, m: 7, d: 1 }
  const [view, setView] = React.useState({ y: initial.y, m: initial.m })

  React.useEffect(() => {
    const next = parseIsoParts(selectedIso) ?? parseIsoParts(todayIso)
    if (next) setView({ y: next.y, m: next.m })
  }, [selectedIso, todayIso])

  const labels = weekdayLabels(locale)
  const cells = monthCells(view.y, view.m)
  const prevLabel = locale === "fr" ? "Mois précédent" : "Previous month"
  const nextLabel = locale === "fr" ? "Mois suivant" : "Next month"

  return (
    <div className="w-[252px]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={prevLabel}
          onClick={() =>
            setView((v) => {
              const date = new Date(v.y, v.m - 1, 1)
              return { y: date.getFullYear(), m: date.getMonth() }
            })
          }
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-canvas)]"
        >
          <SafeIcon name="ChevronLeft" className="size-4" />
        </button>
        <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">
          {monthCaption(view.y, view.m, locale)}
        </p>
        <button
          type="button"
          aria-label={nextLabel}
          onClick={() =>
            setView((v) => {
              const date = new Date(v.y, v.m + 1, 1)
              return { y: date.getFullYear(), m: date.getMonth() }
            })
          }
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-canvas)]"
        >
          <SafeIcon name="ChevronRight" className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {labels.map((label) => (
          <div
            key={label}
            className="pb-1 text-center text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
          >
            {label}
          </div>
        ))}
        {cells.map((cell) => {
          const isSelected = cell.iso === selectedIso
          const isToday = cell.iso === todayIso
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelect(cell.iso)}
              aria-label={formatDateDMY(cell.iso)}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-[12px] tabular-nums",
                cell.inMonth
                  ? "text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-muted)]",
                isSelected
                  ? "bg-[var(--color-bg-inverse)] font-semibold text-[var(--color-text-inverse)]"
                  : "hover:bg-[var(--color-bg-canvas)]",
                isToday && !isSelected && "font-semibold ring-1 ring-inset ring-[var(--color-brand-primary)]",
              )}
            >
              {cell.day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Text date field that always shows and accepts DD/MM/YYYY, with a calendar
 * picker. Avoids native &lt;input type="date"&gt;, which follows the OS locale
 * (often mm/dd/yyyy on US Windows) and cannot be forced to euro format.
 */
export function DateInputDMY({
  value,
  onChange,
  className,
  onBlur,
  locale = "en",
  disabled,
  ...rest
}: DateInputDMYProps) {
  const [text, setText] = React.useState(() => (value ? formatDateDMY(value) : ""))
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    setText(value ? formatDateDMY(value) : "")
  }, [value])

  const commit = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      setText("")
      onChange("")
      return
    }
    const iso = parseToIsoDate(trimmed)
    if (iso) {
      setText(formatDateDMY(iso))
      onChange(iso)
      return
    }
    setText(value ? formatDateDMY(value) : "")
  }

  const chooseLabel = locale === "fr" ? "Choisir une date" : "Choose a date"

  return (
    <div className="relative w-full">
      <input
        {...rest}
        disabled={disabled}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        placeholder={DATE_INPUT_PLACEHOLDER}
        lang={localeTag(locale)}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => {
          commit(e.target.value)
          onBlur?.(e)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commit((e.target as HTMLInputElement).value)
          }
          rest.onKeyDown?.(e)
        }}
        className={cn("pr-9", className)}
        aria-describedby={rest["aria-describedby"]}
        title={DATE_INPUT_PLACEHOLDER}
        data-iso={value ? toIsoDate(value) : undefined}
      />
      <Popover
        modal
        open={open}
        onOpenChange={(next) => {
          if (disabled) return
          setOpen(next)
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={chooseLabel}
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-bg-canvas)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
          >
            <SafeIcon name="Calendar" className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="z-[90] w-auto border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-3 text-[var(--color-text-primary)] shadow-lg"
        >
          <CalendarGrid
            selectedIso={value ? toIsoDate(value) : ""}
            locale={locale}
            onSelect={(iso) => {
              onChange(iso)
              setText(formatDateDMY(iso))
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
