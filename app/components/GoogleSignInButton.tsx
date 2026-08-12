"use client";

import { useEffect, useRef, useState } from "react";
import { firebaseErrorMessage, useAuth } from "./AuthProvider";
import { googleOAuthClientId } from "../lib/firebase";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdentityApi = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        use_fedcm_for_button?: boolean;
        button_auto_select?: boolean;
      }) => void;
      renderButton: (parent: HTMLElement, options: {
        type: "standard";
        theme: "outline";
        size: "large";
        text: "continue_with";
        shape: "rectangular";
        logo_alignment: "left";
        locale: "ko";
        width: number;
      }) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

const scriptId = "google-identity-services";

export default function GoogleSignInButton() {
  const { signInWithGoogle } = useAuth();
  const buttonRoot = useRef<HTMLDivElement>(null);
  const signInRef = useRef(signInWithGoogle);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    signInRef.current = signInWithGoogle;
  }, [signInWithGoogle]);

  useEffect(() => {
    let active = true;
    let rendered = false;

    const renderGoogleButton = () => {
      if (!active || rendered || !buttonRoot.current || !window.google?.accounts.id) return;
      rendered = true;
      const root = buttonRoot.current;
      root.replaceChildren();

      window.google.accounts.id.initialize({
        client_id: googleOAuthClientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        // GitHub Pages cannot attach the COOP response header required by the
        // legacy cross-window popup flow. FedCM lets the browser mediate the
        // account chooser without that opener channel or third-party cookies.
        use_fedcm_for_button: true,
        button_auto_select: false,
        callback: ({ credential }) => {
          if (!credential) {
            setError("Google 계정 정보를 확인하지 못했습니다. 다시 시도해 주세요.");
            return;
          }
          setBusy(true);
          setError("");
          signInRef.current(credential)
            .catch((nextError) => setError(firebaseErrorMessage(nextError)))
            .finally(() => setBusy(false));
        },
      });

      window.google.accounts.id.renderButton(root, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        locale: "ko",
        width: Math.min(400, Math.max(240, Math.floor(root.clientWidth || 400))),
      });
      setReady(true);
    };

    if (window.google?.accounts.id) {
      renderGoogleButton();
      return () => { active = false; };
    }

    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.fetchPriority = "high";
      document.head.appendChild(script);
    }

    const handleLoad = () => renderGoogleButton();
    const handleError = () => setError("Google 로그인 서비스를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.");
    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);
    // The globally preloaded script can finish between the first readiness
    // check and listener registration. Recheck to avoid waiting forever on a
    // load event that has already fired.
    renderGoogleButton();

    return () => {
      active = false;
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <div className={`google-signin-shell${busy ? " busy" : ""}`}>
      <div className="google-signin-frame" ref={buttonRoot} aria-label="Google 계정으로 계속하기" />
      {!ready && !error && <div className="google-signin-loading" aria-live="polite">Google 로그인 불러오는 중...</div>}
      {busy && <div className="google-signin-busy" aria-live="polite">Google 계정을 확인하고 있습니다.</div>}
      {error && <p className="form-message error" role="alert">{error}</p>}
      <p className="google-signin-caption">처음 이용하는 Google 계정은 회원가입과 로그인이 함께 완료됩니다.</p>
    </div>
  );
}
