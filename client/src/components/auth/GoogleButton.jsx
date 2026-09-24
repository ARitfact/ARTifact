import { useEffect, useRef, useState } from "react";
import { authService } from "../../services/authService";

const SCRIPT_URL = "https://accounts.google.com/gsi/client";

export default function GoogleButton({
  onAuthenticated,
  onError,
  acceptedTerms = false,
  acceptedPrivacy = false,
  signup = false,
}) {
  const containerRef = useRef(null);
  const callbackRef = useRef(null);
  const [busy, setBusy] = useState(false);

  callbackRef.current = async ({ credential }) => {
    if (!credential) {
      onError?.("Google did not return a credential.");
      return;
    }
if (signup && (!acceptedTerms || !acceptedPrivacy)) {
  onError?.(
    "Please accept the Terms of Service and Privacy Policy first."
  );
  return;
}
    try {
      setBusy(true);

      const response = await authService.googleLogin({
        credential,
        acceptedTerms,
        acceptedPrivacy,
      });

      onAuthenticated?.(
        response?.data?.user || response?.user
      );
    } catch (error) {
      onError?.(
        error.message || "Google sign-in failed."
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    let cancelled = false;

    if (!clientId) {
      onError?.("Google Client ID is not configured.");
      return;
    }

    function renderGoogleButton() {
      if (
        cancelled ||
        !window.google?.accounts?.id ||
        !containerRef.current
      ) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (result) =>
          callbackRef.current?.(result),
      });

      containerRef.current.innerHTML = "";

      window.google.accounts.id.renderButton(
        containerRef.current,
        {
          type: "standard",
          theme: "outline",
          size: "large",
          text: signup
            ? "signup_with"
            : "signin_with",
          shape: "rectangular",
         width: Math.min(
  containerRef.current.parentElement?.clientWidth || 320,
  400
),
        }
      );
    }

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      let script = document.querySelector(
        `script[src="${SCRIPT_URL}"]`
      );

      if (!script) {
        script = document.createElement("script");
        script.src = SCRIPT_URL;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      script.addEventListener(
        "load",
        renderGoogleButton
      );

      return () => {
        cancelled = true;
        script.removeEventListener(
          "load",
          renderGoogleButton
        );
      };
    }

    return () => {
      cancelled = true;
    };
  }, [signup]);

  return (
    <div
      aria-busy={busy}
      style={{
        display: "flex",
        justifyContent: "center",
        marginTop: 16,
        opacity: busy ? 0.6 : 1,
        pointerEvents: busy ? "none" : "auto",
        width: "100%",
      }}
    >
      <div ref={containerRef} />
    </div>
  );
}