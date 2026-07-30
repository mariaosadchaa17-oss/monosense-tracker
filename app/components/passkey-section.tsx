"use client";

import { useState } from "react";
import { PasskeyButton } from "./passkey-button";

export function PasskeySection({ redirectTo }: { redirectTo: string }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="passkey-section">
      <PasskeyButton mode="authenticate" redirectTo={redirectTo} onMessage={setError} className="auth-v3-passkey" />
      {error && <p className="passkey-error">{error}</p>}
    </div>
  );
}
