"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useStore } from "../_store"
import { useT } from "../_i18n/use-t"
import { formatDateDMY } from "@/lib/compass/locale-display"
import { enterMotion, pcmCard } from "../_components/motion"
import {
  inboxMessages,
  carrierLabel,
  isQuarantined,
  type InboxClass,
  type InboxMessage,
} from "@/lib/compass/logistics/inbox-model"

const CLASS_ORDER: InboxClass[] = ["confirmed", "potentially", "not-relevant"]

export function InboxPage() {
  const t = useT()
  const { locale, session, classifyInbox, sendOutboundDraft } = useStore()
  const messages = React.useMemo(() => inboxMessages(), [])
  const [activeId, setActiveId] = React.useState(messages[0]?.id ?? "EML-001")
  const active = messages.find((m) => m.id === activeId) ?? messages[0]
  const hero = enterMotion(0)

  const classOf = (m: InboxMessage): InboxClass | "unclassified" =>
    session.emailClassifications[m.id] ?? "unclassified"
  const sent = (id: string) => session.sentDraftIds.includes(id)

  return (
    <div className="space-y-6">
      <div className={hero.className} style={hero.style}>
        <h1 className="text-[22px] font-bold text-[var(--color-text-primary)]">{t("inbox.title")}</h1>
        <p className="mt-1 max-w-3xl text-[13px] text-[var(--color-text-secondary)]">{t("inbox.subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={cn(pcmCard, "overflow-hidden rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]")}>
          <div className="border-b border-[var(--color-border-default)] px-4 py-3">
            <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("inbox.messages")}</h2>
            <p className="text-[11px] text-[var(--color-text-muted)]">{t("inbox.quarantineHint")}</p>
          </div>
          <ul className="max-h-[70vh] overflow-y-auto p-1.5">
            {messages.map((m) => {
              const cls = classOf(m)
              const draft = m.direction === "outbound" && !sent(m.id)
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(m.id)}
                    className={cn(
                      "w-full rounded-[12px] px-3 py-2.5 text-left",
                      m.id === active?.id ? "bg-[var(--color-tint-neutral)]" : "hover:bg-[var(--color-bg-subtle)]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] font-medium text-[var(--color-text-primary)]">{m.subject}</p>
                      <span className="shrink-0 text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">
                        {draft ? t("inbox.draft") : cls === "unclassified" ? t("inbox.unclassified") : t(`inbox.class.${cls}`)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                      {m.id} · {formatDateDMY(m.date)} · {m.language}
                    </p>
                    {m.affectsBids && isQuarantined(m.id, session.emailClassifications) && (
                      <p className="mt-0.5 text-[10px] font-medium text-[var(--color-accent-warning-text)]">{t("inbox.quarantined")}</p>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        {active && (
          <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 space-y-4")}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                {active.id} · {active.direction === "outbound" ? t("inbox.outbound") : t("inbox.inbound")} · {active.eventId}
              </p>
              <h2 className="mt-1 text-[18px] font-semibold text-[var(--color-text-primary)]">{active.subject}</h2>
              <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
                {t("inbox.from")} {active.from} · {t("inbox.to")} {active.to}
                {active.supplierId ? ` · ${carrierLabel(active.supplierId)}` : ""}
              </p>
            </div>

            <div className="rounded-[10px] bg-[var(--color-bg-subtle)] p-3 space-y-2">
              <p className="text-[13px] leading-relaxed text-[var(--color-text-primary)]">
                {locale === "de" ? active.bodyDe : active.bodyEn}
              </p>
              {active.language !== (locale === "de" ? "DE" : "EN") && (
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {t("inbox.linkedTranslation")} {active.language === "DE" ? active.bodyDe : active.bodyEn}
                </p>
              )}
            </div>

            {active.attachments.length > 0 && (
              <div>
                <h3 className="text-[12px] font-semibold text-[var(--color-text-primary)]">{t("inbox.attachments")}</h3>
                <ul className="mt-1 space-y-1">
                  {active.attachments.map((a) => (
                    <li key={a.name} className="text-[12px] text-[var(--color-text-secondary)]">
                      {a.name} · {a.version}
                      {a.supersedes ? ` · ${t("inbox.supersedes")} ${a.supersedes}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {active.direction === "inbound" && (
              <div className="space-y-2">
                <p className="text-[12px] text-[var(--color-text-secondary)]">
                  {t("inbox.suggested")} {t(`inbox.class.${active.suggestedClass}`)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CLASS_ORDER.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => classifyInbox(active.id, c)}
                      className={cn(
                        "rounded-[8px] border px-3 py-1.5 text-[12px] font-medium",
                        classOf(active) === c
                          ? "border-[var(--color-brand-primary)] bg-[var(--color-tint-brand)]"
                          : "border-[var(--color-border-default)] text-[var(--color-text-secondary)]",
                      )}
                    >
                      {t(`inbox.class.${c}`)}
                    </button>
                  ))}
                </div>
                {active.affectsBids && isQuarantined(active.id, session.emailClassifications) && (
                  <p className="text-[12px] text-[var(--color-accent-warning-text)]">{t("inbox.quarantineBody")}</p>
                )}
              </div>
            )}

            {active.direction === "outbound" && (
              <div className="space-y-2">
                <p className="text-[12px] text-[var(--color-text-secondary)]">{t("inbox.sendRule")}</p>
                <button
                  type="button"
                  disabled={sent(active.id)}
                  onClick={() => sendOutboundDraft(active.id)}
                  className="rounded-[8px] bg-[var(--color-bg-inverse)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)] disabled:opacity-50"
                >
                  {sent(active.id) ? t("inbox.sent") : t("inbox.approveSend")}
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

export default InboxPage
