"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";

export default function SignOutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const callbackUrl = searchParams.get("callbackUrl") || "/auth/signin";

  useEffect(() => {
    // If user is not authenticated, redirect to sign in
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      // Clear all local data
      if (typeof window !== "undefined") {
        // Clear local storage
        localStorage.clear();
        sessionStorage.clear();

        // Clear specific application data
        const keysToRemove = [
          "buyer-filters",
          "search-history",
          "user-preferences",
          "form-data",
          "cached-data",
          "auth-state",
          "session-data",
        ];

        keysToRemove.forEach((key) => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });

        // Clear all cookies
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos) : c;
          const cookieName = name.trim();

          // Clear cookie for current domain and path
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;

          // Clear for subdomain
          const parts = window.location.hostname.split(".");
          if (parts.length > 2) {
            const domain = parts.slice(-2).join(".");
            document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${domain}`;
          }
        });

        // Clear IndexedDB if used
        if ("indexedDB" in window) {
          try {
            const databases = await indexedDB.databases();
            databases.forEach((db) => {
              if (db.name) {
                indexedDB.deleteDatabase(db.name);
              }
            });
          } catch (error) {
            console.log("Could not clear IndexedDB:", error);
          }
        }

        // Clear any cache storage
        if ("caches" in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames.map((cacheName) => caches.delete(cacheName))
            );
          } catch (error) {
            console.log("Could not clear cache storage:", error);
          }
        }
      }

      // Sign out with NextAuth
      await signOut({
        callbackUrl: callbackUrl,
        redirect: true,
      });
    } catch (error) {
      console.error("Error during sign out:", error);
      // Force redirect even if sign out fails
      router.push(callbackUrl);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-2 text-purple-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-purple-100 mb-4">
            <span className="text-purple-600 text-xl font-bold">E</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-800">
            Sign out of ESahayak
          </h2>
          <p className="mt-2 text-purple-600">
            Are you sure you want to sign out?
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-purple-100 p-8 space-y-6">
          <div className="text-center">
            <div className="mb-4">
              <div className="h-16 w-16 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-full flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-xl">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <p className="mt-2 text-lg font-medium text-gray-800">
                {session?.user?.name || "User"}
              </p>
              <p className="text-sm text-gray-500">{session?.user?.email}</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Signing out will clear all your local
                data, including saved filters, search history, and cached
                information.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSigningOut}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isSigningOut ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing out...
                </>
              ) : (
                "Sign out"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
