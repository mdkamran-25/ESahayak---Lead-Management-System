"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { Button } from "../ui/button";

interface NavigationHeaderProps {
  currentPage?: string;
}

export function NavigationHeader({ currentPage }: NavigationHeaderProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="bg-white border-b border-purple-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-purple-100 rounded-full animate-pulse"></div>
              <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <nav className="bg-white border-b border-purple-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center space-x-6">
            {/* Logo */}
            <Link href="/buyers" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="text-xl font-bold text-gray-800">ESahayak</span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex space-x-4">
              <Link
                href="/buyers"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === "buyers"
                    ? "bg-purple-100 text-purple-700"
                    : "text-gray-600 hover:text-purple-600 hover:bg-purple-50"
                }`}
              >
                Buyer Leads
              </Link>
              <Link
                href="/buyers/new"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === "new-lead"
                    ? "bg-purple-100 text-purple-700"
                    : "text-gray-600 hover:text-purple-600 hover:bg-purple-50"
                }`}
              >
                Create Lead
              </Link>
            </div>
          </div>

          {/* Right side - User Info and Actions */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500">{session?.user?.email}</p>
              </div>
              <div className="h-8 w-8 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
            </div>

            {/* Mobile Create Button */}
            <div className="md:hidden">
              <Button asChild size="sm">
                <Link href="/buyers/new">Create</Link>
              </Button>
            </div>

            {/* Sign Out Button */}
            <SignOutButton variant="outline" />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden mt-4 pt-4 border-t border-purple-100">
          <div className="flex space-x-4">
            <Link
              href="/buyers"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === "buyers"
                  ? "bg-purple-100 text-purple-700"
                  : "text-gray-600 hover:text-purple-600 hover:bg-purple-50"
              }`}
            >
              Buyer Leads
            </Link>
            <Link
              href="/buyers/new"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === "new-lead"
                  ? "bg-purple-100 text-purple-700"
                  : "text-gray-600 hover:text-purple-600 hover:bg-purple-50"
              }`}
            >
              Create Lead
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
