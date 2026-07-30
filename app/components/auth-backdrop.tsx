import { ShieldCheck, Fingerprint } from "lucide-react";

export function AuthBackdrop() {
  return (
    <div className="auth-v3-backdrop" aria-hidden="true">
      <span className="auth-v3-blob auth-v3-blob-mint" />
      <span className="auth-v3-blob auth-v3-blob-lav" />
      <span className="auth-v3-ring" />
      <span className="auth-v3-badge auth-v3-badge-1"><ShieldCheck /></span>
      <span className="auth-v3-badge auth-v3-badge-2"><Fingerprint /></span>
      <span className="auth-v3-badge auth-v3-badge-3">
        <i /><i /><i />
      </span>
    </div>
  );
}
