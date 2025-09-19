"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyRequest() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const isSignup = searchParams.get("signup") === "true";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-green-600">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {isSignup
              ? "Account created! Check your email"
              : "Check your email"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {email ? (
              <>
                {isSignup
                  ? "Your account has been created! We've sent a magic link to "
                  : "We've sent a magic link to "}
                <span className="font-medium text-gray-900">{email}</span>
              </>
            ) : isSignup ? (
              "Your account has been created! We've sent you a magic link"
            ) : (
              "We've sent you a magic link"
            )}
          </p>
          <p className="mt-4 text-sm text-gray-600">
            {isSignup
              ? "Click the link in the email to verify your account and sign in. The link will expire in 24 hours."
              : "Click the link in the email to sign in to your account. The link will expire in 24 hours."}
          </p>
        </div>

        <div className="text-center">
          <Link
            href="/auth/signin"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
