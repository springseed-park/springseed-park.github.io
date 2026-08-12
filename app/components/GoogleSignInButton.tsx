"use client";

import { useState } from "react";
import { firebaseErrorMessage, useAuth } from "./AuthProvider";

export default function GoogleSignInButton() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (nextError) {
      setError(firebaseErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`google-signin-shell${busy ? " busy" : ""}`}>
      <button className="google-signin-button" type="button" onClick={handleSignIn} disabled={busy}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M21.35 12.24c0-.72-.06-1.25-.2-1.8H12v3.35h5.37a4.67 4.67 0 0 1-1.99 3.03l-.02.11 2.9 2.25.2.02c1.86-1.72 2.89-4.25 2.89-6.96Z" />
          <path fill="#34A853" d="M12 21.75c2.62 0 4.82-.86 6.43-2.35l-3.06-2.38c-.82.56-1.92.95-3.37.95a5.85 5.85 0 0 1-5.54-4.04l-.11.01-3.02 2.34-.04.1A9.71 9.71 0 0 0 12 21.75Z" />
          <path fill="#FBBC05" d="M6.46 13.93A5.99 5.99 0 0 1 6.13 12c0-.67.12-1.32.32-1.93v-.12L3.4 7.58l-.1.05A9.7 9.7 0 0 0 2.25 12c0 1.57.38 3.06 1.04 4.37l3.17-2.44Z" />
          <path fill="#EA4335" d="M12 6.03c1.83 0 3.06.79 3.77 1.44l2.73-2.67A9.2 9.2 0 0 0 12 2.25a9.71 9.71 0 0 0-8.71 5.38l3.16 2.44A5.86 5.86 0 0 1 12 6.03Z" />
        </svg>
        <span>{busy ? "Google 계정을 확인하고 있습니다." : "Google 계정으로 계속하기"}</span>
      </button>
      {error && <p className="form-message error" role="alert">{error}</p>}
      <p className="google-signin-caption">처음 이용하는 Google 계정은 회원가입과 로그인이 함께 완료됩니다.</p>
    </div>
  );
}
