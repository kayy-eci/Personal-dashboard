"use client";

import { useEffect } from "react";
import { useWorkspace } from "./workspace-provider";
import { CloseIcon } from "./icons";

export function ErrorToasts() {
  const { errors, dismissError } = useWorkspace();

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="toast-stack" role="alert" aria-live="assertive">
      {errors.map((message) => (
        <Toast key={message} message={message} onDismiss={() => dismissError(message)} />
      ))}
    </div>
  );
}

function Toast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="toast">
      <span className="toast-message">{message}</span>
      <button
        type="button"
        className="icon-button"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <CloseIcon />
      </button>
    </div>
  );
}
