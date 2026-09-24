export type Locale = "en" | "de"

export type MessageTree = { [key: string]: string | MessageTree }

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string
