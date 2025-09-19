"use client";

import { useState } from "react";
import { Button } from "../ui/button";

interface StatusQuickActionProps {
  currentStatus: string;
  buyerId: string;
  onStatusChange: (newStatus: string) => void;
  disabled?: boolean;
}

const statusOptions = [
  { value: "New", label: "New", color: "bg-blue-100 text-blue-800" },
  {
    value: "Qualified",
    label: "Qualified",
    color: "bg-green-100 text-green-800",
  },
  {
    value: "Contacted",
    label: "Contacted",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "Visited",
    label: "Visited",
    color: "bg-purple-100 text-purple-800",
  },
  {
    value: "Negotiation",
    label: "Negotiation",
    color: "bg-orange-100 text-orange-800",
  },
  {
    value: "Converted",
    label: "Converted",
    color: "bg-emerald-100 text-emerald-800",
  },
  { value: "Dropped", label: "Dropped", color: "bg-red-100 text-red-800" },
];

export function StatusQuickAction({
  currentStatus,
  buyerId,
  onStatusChange,
  disabled = false,
}: StatusQuickActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const currentStatusConfig = statusOptions.find(
    (option) => option.value === currentStatus
  );

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus || isUpdating) return;

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/buyers/${buyerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      onStatusChange(newStatus);
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (disabled) {
    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          currentStatusConfig?.color || "bg-gray-100 text-gray-800"
        }`}
      >
        {currentStatus}
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${
          currentStatusConfig?.color || "bg-gray-100 text-gray-800"
        } ${isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {isUpdating ? "Updating..." : currentStatus}
        <svg
          className={`ml-1 h-3 w-3 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 z-20 mt-1 bg-white border border-gray-200 rounded-md shadow-lg min-w-[140px]">
            <div className="py-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  disabled={option.value === currentStatus || isUpdating}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center ${
                    option.value === currentStatus
                      ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                      : "text-gray-700"
                  }`}
                >
                  <span
                    className={`inline-block w-3 h-3 rounded-full mr-2 ${
                      option.color.split(" ")[0]
                    }`}
                  />
                  {option.label}
                  {option.value === currentStatus && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
