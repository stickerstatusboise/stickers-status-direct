"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Icon } from "./Icon";

interface Toast {
  id: number;
  title: string;
  body?: string;
  kind?: "ok" | "";
}

const ToastContext = createContext<(title: string, body?: string, kind?: "ok" | "") => void>(() => {});

export const useToast = () => useContext(ToastContext);

let seq = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((title: string, body = "", kind: "ok" | "" = "") => {
    const id = ++seq;
    setToasts((t) => [...t, { id, title, body, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4800);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} role="status">
            <Icon name={t.kind === "ok" ? "check" : "bell"} size={18} />
            <div>
              <b>{t.title}</b>
              {t.body ? <span>{t.body}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
