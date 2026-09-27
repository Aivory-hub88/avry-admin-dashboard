"use client";

import React, { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { bffFetch } from "@/lib/bff";

const INPUT_CLASS =
  "h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800";

function ResetPasswordFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  // `null` while the link is still being checked, so the form isn't shown
  // before we know whether submitting it can possibly work.
  const [linkValid, setLinkValid] = useState<boolean | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const checkToken = useCallback(async () => {
    if (!token) {
      setLinkValid(false);
      return;
    }
    try {
      const res = await bffFetch(
        `/api/auth/reset-password?token=${encodeURIComponent(token)}`
      );
      const data = await res.json().catch(() => ({}));
      setLinkValid(Boolean(data?.valid));
      setAccountEmail(data?.email ?? null);
    } catch {
      setLinkValid(false);
    }
  }, [token]);

  useEffect(() => {
    checkToken();
  }, [checkToken]);

  const validate = (): string | null => {
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
    if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain a number";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      const res = await bffFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Could not reset the password.");
        // A 400 here usually means the link was redeemed or expired between
        // the check and the submit, so re-check rather than leaving a form
        // that can never succeed.
        if (res.status === 400) checkToken();
        return;
      }

      setDone(true);
      // Every session for this account was dropped server-side, so the only
      // sensible destination is the login page.
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Choose a new password
            </h1>
            {accountEmail && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                For {accountEmail}
              </p>
            )}
          </div>

          {linkValid === null && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Checking your link…
            </p>
          )}

          {linkValid === false && (
            <div className="space-y-6">
              <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                This reset link is invalid, already used, or has expired. Reset
                links are valid for 60 minutes.
              </div>
              <Link
                href="/forgot-password"
                className="block text-sm text-brand-500 hover:text-brand-600"
              >
                Request a new link
              </Link>
            </div>
          )}

          {linkValid === true && done && (
            <div className="rounded-lg bg-success-50 px-4 py-3 text-sm text-success-600 dark:bg-success-500/10 dark:text-success-400">
              Password updated. All existing sessions were signed out — taking
              you to the sign-in page…
            </div>
          )}

          {linkValid === true && !done && (
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {error && (
                  <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                    {error}
                  </div>
                )}
                <div>
                  <Label>
                    New password <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className={INPUT_CLASS}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <Label>
                    Confirm new password <span className="text-error-500">*</span>
                  </Label>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <Button className="w-full" size="sm" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Set new password"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordForm() {
  // useSearchParams needs a Suspense boundary for static rendering, same as
  // SignInForm.
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1 lg:w-1/2 w-full">
          <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Choose a new password
            </h1>
          </div>
        </div>
      }
    >
      <ResetPasswordFormInner />
    </Suspense>
  );
}
