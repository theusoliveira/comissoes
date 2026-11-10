"use client";

import { useEffect, useRef, type ReactNode } from "react";

export interface DialogButton { label: string; className?: string; onClick?: () => void }
export interface DialogState { title: string; body: ReactNode; buttons: DialogButton[] }

export default function Dialog({ state, onClose }: { state: DialogState | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (state && !d.open) d.showModal();
    if (!state && d.open) d.close();
  }, [state]);

  return (
    <dialog ref={ref} onClose={onClose}>
      {state && (
        <>
          <h2>{state.title}</h2>
          <div>{state.body}</div>
          <div className="actions">
            {state.buttons.map((b) => (
              <button key={b.label} type="button" className={b.className} onClick={() => { onClose(); b.onClick?.(); }}>{b.label}</button>
            ))}
          </div>
        </>
      )}
    </dialog>
  );
}
