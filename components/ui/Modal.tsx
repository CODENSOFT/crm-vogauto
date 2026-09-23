"use client";

import { useEffect, useRef } from "react";
import { Button } from "./Button";
import { IconClose } from "./Icons";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // <dialog> nativ: blochează focusul în fereastră și tratează Escape singur.
  // Ascultătorii stau pe element, nu în JSX, fiindcă sunt evenimente proprii
  // ale elementului (`cancel` nici nu există ca prop React tipizat corect).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!el.open) el.showModal();

    const onBackdrop = (e: MouseEvent) => { if (e.target === el) onClose(); };
    const onCancel = (e: Event) => { e.preventDefault(); onClose(); };
    el.addEventListener("click", onBackdrop);
    el.addEventListener("cancel", onCancel);
    return () => {
      el.removeEventListener("click", onBackdrop);
      el.removeEventListener("cancel", onCancel);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <dialog ref={ref} className="vg-modal" aria-label={title}>
      <div className="mx-auto flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200/60 bg-white shadow-elevated animate-scale-in sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Închide"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50/60 px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmă",
  loading,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Anulează
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
      {children}
    </Modal>
  );
}
