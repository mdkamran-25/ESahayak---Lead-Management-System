"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyToken() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const callbackUrl = searchParams.get("callbackUrl") || "/buyers";

  useEffect(() => {
    const verifyToken = async () => {
      if (!token || !email) {
        setStatus("error");
        setMessage("Invalid verification link. Missing token or email.");
        return;
      }

      try {
        setMessage("Verifying your account...");
        
        // Call our custom verification API
        const response = await fetch(`/api/auth/custom-verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`, {
          method: 'GET',
          credentials: 'include',
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setStatus("success");
          setMessage("Account verified successfully! Redirecting to app...");
          
          // Wait a moment for session to be fully processed, then redirect
          setTimeout(() => {
            // Force a page reload to ensure session is recognized
            window.location.replace(callbackUrl);
          }, 2000);
        } else {
          throw new Error(result.error || "Verification failed");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage("Verification failed. The link may have expired or already been used.");
      }
    };

    verifyToken();
  }, [token, email, callbackUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-purple-100 mb-6">
            {status === "loading" && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            )}
            {status === "success" && (
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === "error" && (
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          
          <h2 className="text-3xl font-extrabold text-gray-800">
            {status === "loading" && "Verifying Account"}
            {status === "success" && "Account Verified!"}
            {status === "error" && "Verification Failed"}
          </h2>
          
          <p className="mt-4 text-purple-600">
            {message}
          </p>

          {status === "error" && (
            <div className="mt-6 space-y-3">
              <button
                onClick={() => router.push("/auth/signin")}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
              >
                Back to Sign In
              </button>
              <button
                onClick={() => router.push("/auth/signup")}
                className="w-full flex justify-center py-2 px-4 border border-purple-300 rounded-md shadow-sm text-sm font-medium text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
              >
                Create New Account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
