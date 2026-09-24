"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useStore } from "../_store"
import { REPLAY } from "@/lib/compass/logistics/internal/replay"

/** Operator-only fixture harness. Never shown in customer chrome. */
export function OperatorReplayBar() {
  const { session, resetSession, applyOperatorCheckpoint } = useStore()
  return (
    <div className="mb-4 rounded-[12px] border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Operator replay · checkpoint {session.replayCheckpoint}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => applyOperatorCheckpoint(Math.max(session.replayCheckpoint, 7))}
            className="text-[11px] font-semibold text-[var(--color-text-secondary)] hover:underline"
          >
            Advance operating month
          </button>
          <button
            type="button"
            onClick={resetSession}
            className="text-[11px] font-semibold text-[var(--color-text-secondary)] hover:underline"
          >
            Reset to start
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {REPLAY.map((step) => {
          const id = step.internalCheckpointId ?? 0
          return (
            <button
              key={id}
              type="button"
              onClick={() => applyOperatorCheckpoint(id)}
              className={cn(
                "rounded-[8px] border px-2 py-1 text-[11px]",
                session.replayCheckpoint === id
                  ? "border-[var(--color-brand-primary)] bg-[var(--color-tint-brand)] font-semibold"
                  : "border-[var(--color-border-default)] text-[var(--color-text-secondary)]",
              )}
            >
              {step.checkpointName}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
        {REPLAY.find((s) => s.internalCheckpointId === session.replayCheckpoint)?.expectedProductResponse}
      </p>
    </div>
  )
}
