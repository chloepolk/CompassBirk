"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useStore } from "../_store"
import {
  followGuide,
  pageGuide,
  type GuideCopy,
  type PageGuide,
  type WorkflowPage,
} from "@/lib/compass/logistics/workflow-guide"

function text(copy: GuideCopy | null, de: boolean): string | null {
  if (!copy) return null
  return de ? copy.de : copy.en
}

function anchorElement(id: string | null): HTMLElement | null {
  if (!id || !/^[a-z0-9-]+$/.test(id)) return null
  const node = document.querySelector(`[data-guide-anchor="${id}"]`)
  return node instanceof HTMLElement ? node : null
}

function placePopup(popup: HTMLElement, anchor: HTMLElement | null) {
  const width = popup.offsetWidth
  const height = popup.offsetHeight
  if (!anchor) {
    popup.style.top = "auto"
    popup.style.left = "auto"
    popup.style.right = "24px"
    popup.style.bottom = "24px"
    popup.style.visibility = "visible"
    return
  }
  const box = anchor.getBoundingClientRect()
  const gap = 12
  const header = 132
  let top = box.bottom + gap
  if (top + height > window.innerHeight - 16) top = box.top - height - gap
  if (top < header) top = header
  let left = box.left
  if (left + width > window.innerWidth - 16) left = window.innerWidth - width - 16
  if (left < 16) left = 16
  popup.style.right = "auto"
  popup.style.bottom = "auto"
  popup.style.top = `${top}px`
  popup.style.left = `${left}px`
  popup.style.visibility = "visible"
}

export function WorkflowGuideBar({ page }: { page: WorkflowPage }) {
  const {
    locale,
    guided,
    session,
    advanceJourney,
    openActionCentre,
    openTenderStudio,
    openInbox,
    openBidEvaluation,
    openAward,
    openPerformance,
  } = useStore()
  const guide = pageGuide(session, page)
  const popupRef = React.useRef<HTMLDivElement>(null)
  const seenAnchor = React.useRef<string | null>(null)
  const seenEmail = React.useRef<string | null>(null)
  const [mounted, setMounted] = React.useState(false)
  const [hiddenFor, setHiddenFor] = React.useState<string | null>(null)
  const de = locale === "de"
  const titleKey = guide?.title.en ?? null
  const emailId = guide?.primary?.destination.page === "inbox" ? guide.primary.destination.emailId : null

  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (page !== "inbox" || !emailId || seenEmail.current === emailId) return
    seenEmail.current = emailId
    openInbox(emailId)
  }, [page, emailId, openInbox])

  React.useEffect(() => {
    const anchorId = guide?.anchor ?? null
    if (!guided || !anchorId) {
      seenAnchor.current = null
      return
    }
    if (seenAnchor.current === anchorId) return
    let cancelled = false
    let highlighted: HTMLElement | null = null
    const previous = { outline: "", offset: "" }
    const go = (attempt: number) => {
      if (cancelled) return
      const el = anchorElement(anchorId)
      if (!el) {
        if (attempt < 8) window.setTimeout(() => go(attempt + 1), 60)
        return
      }
      seenAnchor.current = anchorId
      previous.outline = el.style.outline
      previous.offset = el.style.outlineOffset
      el.style.outline = "2px solid var(--color-brand-primary)"
      el.style.outlineOffset = "3px"
      highlighted = el
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
    go(0)
    return () => {
      cancelled = true
      if (highlighted) {
        highlighted.style.outline = previous.outline
        highlighted.style.outlineOffset = previous.offset
      }
    }
  }, [guide?.anchor, guided])

  React.useLayoutEffect(() => {
    const popup = popupRef.current
    if (!popup || !guide) return
    const place = () => placePopup(popup, anchorElement(guide.anchor))
    place()
    window.addEventListener("scroll", place, true)
    window.addEventListener("resize", place)
    return () => {
      window.removeEventListener("scroll", place, true)
      window.removeEventListener("resize", place)
    }
  }, [guide, mounted, hiddenFor])

  if (!mounted || !guided || !guide || hiddenFor === titleKey) return null

  return createPortal(
    <GuidePopup
      popupRef={popupRef}
      guide={guide}
      de={de}
      onDismiss={() => setHiddenFor(titleKey)}
      onFollow={() => {
        if (!guide.primary) return
        followGuide(guide.primary, {
          advanceJourney,
          openActionCentre: () => openActionCentre(),
          openTenderStudio,
          openInbox,
          openBidEvaluation,
          openAward,
          openPerformance,
        })
      }}
      onActionCentre={() => openActionCentre()}
    />,
    document.body,
  )
}

function GuidePopup({
  popupRef,
  guide,
  de,
  onDismiss,
  onFollow,
  onActionCentre,
}: {
  popupRef: React.RefObject<HTMLDivElement | null>
  guide: PageGuide
  de: boolean
  onDismiss: () => void
  onFollow: () => void
  onActionCentre: () => void
}) {
  const done = text(guide.done, de)
  const title = text(guide.title, de)
  const detail = text(guide.detail, de)
  const showCount = guide.progress != null && guide.progress.total > 1
  const showHandoff = guide.mode === "handoff" && guide.primary

  return (
    <div
      ref={popupRef}
      role="status"
      className="invisible fixed z-[60] w-[min(320px,calc(100vw-2rem))] rounded-[12px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.12)]"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label={de ? "Hinweis schließen" : "Dismiss note"}
        className="absolute right-2 top-2 rounded px-1.5 text-[14px] leading-none text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        ×
      </button>
      {done && (
        <p className="pr-4 text-[12px] font-semibold text-[var(--color-text-primary)]">{done}</p>
      )}
      <p className={done ? "mt-1 pr-4 text-[13px] text-[var(--color-text-secondary)]" : "pr-4 text-[13px] font-medium text-[var(--color-text-primary)]"}>
        {guide.mode === "handoff" ? (de ? `Weiter: ${title}` : `Next: ${title}`) : title}
      </p>
      {detail && <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{detail}</p>}
      {showCount && guide.progress && (
        <p className="mt-1 text-[12px] tabular-nums text-[var(--color-text-secondary)]">
          {de ? `${guide.progress.done} von ${guide.progress.total}` : `${guide.progress.done} of ${guide.progress.total}`}
        </p>
      )}
      {showHandoff && guide.primary && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onFollow}
            className="rounded-[10px] bg-[var(--color-brand-primary)] px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            {text(guide.primary.label, de)}
          </button>
          {guide.primary.destination.page !== "operating-loop" && (
            <button
              type="button"
              onClick={onActionCentre}
              className="rounded-[10px] border border-[var(--color-border-default)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-primary)]"
            >
              {de ? "Zum Aktionszentrum" : "Back to Action Centre"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
