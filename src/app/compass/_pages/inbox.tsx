"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useStore } from "../_store"
import { useT } from "../_i18n/use-t"
import type { Locale } from "../_i18n"
import { formatDateDMY } from "@/lib/compass/locale-display"
import { enterMotion, pcmCard } from "../_components/motion"
import { communicationsBlock, evaluateOutboundChecks, invitesSent, issuedInvitationAttachments, journeyIndex, rfpLifecycle, SEND_CHECKS, statusForSession } from "@/lib/compass/logistics/session"
import { ACTIVE_USER } from "../_components/hub/active-user"
import {
  inboxMessages,
  carrierLabel,
  isQuarantined,
  type InboxClass,
  type InboxMessage,
} from "@/lib/compass/logistics/inbox-model"
import { WorkflowGuideBar } from "../_components/workflow-guide-bar"

const CLASS_ORDER: InboxClass[] = ["confirmed", "potentially", "not-relevant"]

function formatStamp(iso: string, locale: Locale): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function InboxPage() {
  const t = useT()
  const { locale, session, classifyInbox, recordAttachmentMatch, sendOutboundDraft, openTenderStudio, patchSession, inboxFocus } = useStore()
  const messages = React.useMemo(() => {
    const responsesStaged = invitesSent(session)
    return inboxMessages().filter((m) => {
      if (m.id === "EML-010" || m.id === "EML-011") return session.performanceReleased
      if (m.direction === "outbound") return session.rfpApproved && session.rfpGenerated
      return responsesStaged
    })
  }, [session])
  const [activeId, setActiveId] = React.useState(inboxFocus?.id ?? messages[0]?.id ?? "EML-001")
  React.useEffect(() => {
    if (inboxFocus) setActiveId(inboxFocus.id)
  }, [inboxFocus])
  const active = messages.find((m) => m.id === activeId) ?? messages[0]
  const hero = enterMotion(0)
  const held = communicationsBlock(session)

  const classOf = (m: InboxMessage): InboxClass | "unclassified" =>
    session.emailClassifications[m.id] ?? "unclassified"
  const sent = (id: string) => session.sentDraftIds.includes(id)
  const evaluatedChecks = active
    ? evaluateOutboundChecks(session, {
        id: active.id,
        from: active.from,
        to: active.to,
        language: active.language,
        bodyEn: active.bodyEn,
        bodyDe: active.bodyDe,
        attachments: active.attachments,
      })
    : []
  const checkKeys = SEND_CHECKS
  const checkLabels: Record<(typeof checkKeys)[number], string> = locale === "de"
    ? {
        recipient: "Empfänger",
        authority: "Versandbefugnis",
        factsDates: "Sachverhalt und Termine",
        attachment: "Anhangsversion",
        confidentiality: "Vertraulichkeit",
        language: "Sprache",
      }
    : {
        recipient: "Recipient",
        authority: "Sending authority",
        factsDates: "Facts and dates",
        attachment: "Attachment version",
        confidentiality: "Confidentiality",
        language: "Language",
      }
  const checksPass = evaluatedChecks.length > 0 && evaluatedChecks.every((row) => row.pass)
  const awaitingReview = messages.filter((m) => {
    if (m.direction === "outbound") return false
    const cls = session.emailClassifications[m.id]
    if (cls === "potentially") return true
    if (cls === "not-relevant" || cls === "confirmed") return false
    if (m.affectsBids) return true
    return m.suggestedClass === "potentially"
  })
  const draftCount = messages.filter((m) => m.direction === "outbound" && !sent(m.id)).length
  const sentCount = messages.filter((m) => sent(m.id)).length
  const sendRecord = active ? session.sendApprovals.find((row) => row.emailId === active.id) : undefined
  const evidence = (m: InboxMessage) => ({
    reason: m.suggestedClass === "not-relevant"
      ? (locale === "de" ? "Kein Bezug zu RFP-2026-001" : "No link to RFP-2026-001")
      : m.suggestedClass === "potentially"
        ? (locale === "de" ? "Objekt unklar — menschliche Prüfung" : "Matched object is ambiguous — human review")
        : (locale === "de" ? "Ereignis, Träger und Anhang passen" : "Event, carrier and attachment match"),
    confidence: m.suggestedClass === "confirmed" ? "0.92" : m.suggestedClass === "potentially" ? "0.61" : "0.88",
    language: m.language,
    object: m.eventId ?? "—",
    attachment: m.attachments[0] ? `${m.attachments[0].name} ${m.attachments[0].version}` : (locale === "de" ? "kein Anhang" : "no attachment"),
  })

  return (
    <div className="space-y-6">
      <div className={hero.className} style={hero.style}>
        <h1 className="text-[22px] font-bold text-[var(--color-text-primary)]">{t("inbox.title")}</h1>
        <p className="mt-1 max-w-3xl text-[13px] text-[var(--color-text-secondary)]">{t("inbox.subtitle")}</p>
        <p className="mt-1 text-[12px] font-medium text-[var(--color-text-primary)]">
          {journeyIndex(session.journeyStep) <= 5
            ? (locale === "de" ? rfpLifecycle(session).status.de : rfpLifecycle(session).status.en)
            : t(`flight.${statusForSession(session)}`)}
        </p>
      </div>

      <WorkflowGuideBar page="inbox" />

      {held && (
        <div className="rounded-[12px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-3">
          <p className="text-[13px] text-[var(--color-text-secondary)]">{locale === "de" ? held.de : held.en}</p>
          <button
            type="button"
            onClick={() => openTenderStudio(null)}
            className="mt-3 rounded-[10px] bg-[var(--color-brand-primary)] px-4 py-2 text-[13px] font-semibold text-white"
          >
            {t("inbox.returnToWorkspace")}
          </button>
        </div>
      )}

      {!held && <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={cn(pcmCard, "overflow-hidden rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]")}>
          <div className="border-b border-[var(--color-border-default)] px-4 py-3">
            <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t("inbox.messages")}</h2>
            <p className="text-[11px] text-[var(--color-text-muted)]">{t("inbox.quarantineHint")}</p>
            <p className="mt-2 flex flex-wrap gap-2 text-[11px] tabular-nums text-[var(--color-text-secondary)]">
              <span>{draftCount} {t("inbox.draftCount")}</span>
              <span>{sentCount} {t("inbox.sentCount")}</span>
              {awaitingReview.length > 0 && (
                <span className="font-semibold text-[var(--color-accent-warning-text)]">
                  {awaitingReview.length} {t("inbox.awaitingReview")}
                </span>
              )}
            </p>
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
                    {((m.affectsBids && isQuarantined(m.id, session.emailClassifications)) || session.emailClassifications[m.id] === "potentially" || (classOf(m) === "unclassified" && m.suggestedClass === "potentially")) && (
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
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                {locale === "de" ? "Herkunft" : "Lineage"}: {active.eventId} · {session.rfpVersion ?? "RFP-2026-001"} · {active.attachments[0]?.version ?? (locale === "de" ? "ohne Anhang" : "no attachment")} · {classOf(active)}
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
                  {(active.id === "EML-001" || active.id === "EML-002"
                    ? issuedInvitationAttachments(session, active.id)
                    : active.attachments
                  ).map((a) => (
                    <li key={a.name} className="text-[12px] text-[var(--color-text-secondary)]">
                      {a.name} · {a.version}
                      {"supersedes" in a && a.supersedes ? ` · ${t("inbox.supersedes")} ${a.supersedes}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {active.direction === "inbound" && (
              <div data-guide-anchor="inbox-action" className="scroll-mt-28 space-y-2">
                {(() => {
                  const ev = evidence(active)
                  return (
                    <dl className="grid gap-1 text-[12px] text-[var(--color-text-secondary)] sm:grid-cols-2">
                      <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Grund" : "Reason"}</dt><dd>{ev.reason}</dd></div>
                      <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Konfidenz" : "Confidence"}</dt><dd>{ev.confidence}</dd></div>
                      <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Ausgangssprache" : "Source language"}</dt><dd>{ev.language}{active.language === "DE" ? (locale === "de" ? " · Original" : " · original, translation labelled") : ""}</dd></div>
                      <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Objekt" : "Matched object"}</dt><dd>{ev.object}</dd></div>
                      <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Anhang" : "Attachment result"}</dt><dd>{ev.attachment}</dd></div>
                    </dl>
                  )
                })()}
                {active.language === "DE" && (
                  <p className="text-[12px] text-[var(--color-accent-warning-text)]">
                    {locale === "de" ? "Unsicherer Begriff zur Prüfung: Kraftstoffzuschlag-BasisMonat." : "Uncertain term flagged for review: fuel-surcharge baseline month."}
                  </p>
                )}
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
                {(classOf(active) === "potentially" || (classOf(active) === "unclassified" && active.suggestedClass === "potentially")) && (
                  <p className="text-[12px] text-[var(--color-accent-warning-text)]">
                    {locale === "de"
                      ? "Potenziell relevant bleibt in Quarantäne. Die Nachricht geht erst nach Ihrer Bestätigung in einen Entscheidungsdatensatz ein."
                      : "Potentially Relevant stays quarantined. It enters a decision record only after you confirm it."}
                  </p>
                )}
                {active.id === "EML-008" && (
                  <div className="space-y-1">
                    <p className="text-[12px] text-[var(--color-text-secondary)]">
                      {locale === "de"
                        ? "Version 1 bleibt sichtbar. Bestätigen Sie, welche Fassung zum Nachweis wird."
                        : "Version 1 stays visible. Confirm which file is the evidence."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(["revised", "original", "rejected"] as const).map((match) => (
                        <button
                          key={match}
                          type="button"
                          onClick={() => recordAttachmentMatch(active.id, match)}
                          className={cn(
                            "rounded-[8px] border px-3 py-1.5 text-[12px] font-medium",
                            session.attachmentMatches[active.id] === match
                              ? "border-[var(--color-brand-primary)] bg-[var(--color-tint-brand)]"
                              : "border-[var(--color-border-default)]",
                          )}
                        >
                          {match === "revised"
                            ? (locale === "de" ? "Aktuelle Version verwenden" : "Use revised version")
                            : match === "original"
                              ? (locale === "de" ? "Original behalten" : "Keep original")
                              : (locale === "de" ? "Zuordnung ablehnen" : "Reject match")}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {active.kind === "clarification" && (
                  <div className="space-y-2">
                    <p className="text-[12px] text-[var(--color-text-secondary)]">
                      {locale === "de"
                        ? "Dies speichert eine Notiz für alle Bieter. Es wird keine Nachricht gesendet."
                        : "This records a note for all bidders. It does not send a message."}
                    </p>
                    <button
                      type="button"
                      className="rounded-[8px] border border-[var(--color-border-default)] px-3 py-1.5 text-[12px] font-semibold"
                      onClick={() => patchSession({
                        clarificationNote: locale === "de"
                          ? "An alle Bieter, anonymisiert: Der Kraftstoffzuschlag folgt SRC-005. Die Prognose von 2.448 Sendungen ist keine Abnahmeverpflichtung."
                          : "To all bidders, anonymised: the fuel surcharge follows SRC-005. The forecast of 2,448 shipments is not a volume commitment.",
                      })}
                    >
                      {locale === "de" ? "Anonymisierte Klarstellung notieren" : "Record anonymised clarification"}
                    </button>
                    {session.clarificationNote && (
                      <p className="text-[12px] text-[var(--color-text-secondary)]">
                        {locale === "de" ? "Notiz, nicht gesendet: " : "Recorded note, not sent: "}
                        {session.clarificationNote}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {active.direction === "outbound" && (
              <div data-guide-anchor="inbox-action" className="scroll-mt-28 space-y-2">
                <p className="text-[12px] text-[var(--color-text-secondary)]">{t("inbox.sendRule")}</p>
                <ul className="space-y-1.5">
                  {evaluatedChecks.map((row) => (
                    <li key={row.key} className="text-[12px]">
                      <div className="flex items-center gap-2">
                        <span className={row.pass ? "font-semibold text-[var(--color-accent-positive-text)]" : "font-semibold text-[var(--color-accent-critical-text)]"}>
                          {row.pass ? (locale === "de" ? "Bestanden" : "Pass") : (locale === "de" ? "Nicht bestanden" : "Fail")}
                        </span>
                        <span>{checkLabels[row.key]}</span>
                      </div>
                      {!row.pass && (
                        <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-text-secondary)]">
                          {locale === "de" ? row.reason.de : row.reason.en}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={sent(active.id) || !checksPass}
                  onClick={() => sendOutboundDraft(active.id, {
                    approverName: ACTIVE_USER.name,
                    checks: evaluatedChecks.filter((row) => row.pass).map((row) => row.key),
                  })}
                  className="rounded-[8px] bg-[var(--color-bg-inverse)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)] disabled:opacity-50"
                >
                  {sent(active.id) ? t("inbox.sent") : t("inbox.approveSend")}
                </button>
                {sent(active.id) && sendRecord && (
                  <dl className="grid gap-1 text-[12px] text-[var(--color-text-secondary)] sm:grid-cols-2">
                    <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Absender" : "Sender"}</dt><dd>{sendRecord.sender}</dd></div>
                    <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Freigebende Person" : "Approver"}</dt><dd>{sendRecord.approverName}</dd></div>
                    <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Empfänger" : "Recipients"}</dt><dd>{sendRecord.recipients.join(", ") || "—"}</dd></div>
                    <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Zeitpunkt" : "Timestamp"}</dt><dd>{formatStamp(sendRecord.approvedAt, locale)}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Nachricht" : "Message"}</dt><dd>{sendRecord.message}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Anhänge" : "Attachments"}</dt><dd>{sendRecord.attachments.map((file) => `${file.name} · ${file.version}`).join("; ") || "—"}</dd></div>
                    <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Ausschreibungsversion" : "RFP version"}</dt><dd>{sendRecord.rfpVersion}</dd></div>
                    <div><dt className="text-[10px] uppercase text-[var(--color-text-muted)]">{locale === "de" ? "Zustellung" : "Delivery"}</dt><dd>{t("inbox.delivered")}</dd></div>
                  </dl>
                )}
              </div>
            )}
          </section>
        )}
      </div>}
    </div>
  )
}

export default InboxPage
