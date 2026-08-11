"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui";

/** Google's brand mark. Must keep its official colours — do not tokenise. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.26a12 12 0 0 0 0 10.74l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.63l4.01 3.09C6.22 6.87 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function GoogleButton({
  callbackUrl = "/dashboard",
  label = "Continue with Google",
}: {
  callbackUrl?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      fullWidth
      loading={loading}
      onClick={() => {
        setLoading(true);
        // Full-page navigation to Google. No need to reset `loading`.
        void signIn("google", { callbackUrl });
      }}
      className="gap-3 font-semibold"
    >
      <GoogleIcon />
      {label}
    </Button>
  );
}
