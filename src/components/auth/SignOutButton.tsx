"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { useState } from "react";

interface SignOutButtonProps {
  variant?: "default" | "outline" | "ghost";
  className?: string;
  children?: React.ReactNode;
}

export function SignOutButton({
  variant = "outline",
  className = "",
  children = "Sign Out",
}: SignOutButtonProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    // Navigate to the sign-out page for confirmation
    router.push("/auth/signout");
  };

  return (
    <Button
      variant={variant}
      className={`shadow-sm ${className}`}
      onClick={handleSignOut}
      disabled={isSigningOut}
    >
      {isSigningOut ? "Signing out..." : children}
    </Button>
  );
}
