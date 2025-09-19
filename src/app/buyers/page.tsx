"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { formatCurrency, formatDate, formatPhone } from "../../lib/utils";
import { Buyer } from "../../lib/db/schema";
import { CsvManager } from "../../components/csv/CsvManager";
import { NavigationHeader } from "../../components/auth/NavigationHeader";

interface BuyersResponse {
  buyers: Buyer[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export default function BuyersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [filters, setFilters] = useState({
    city: searchParams.get("city") || "",
    propertyType: searchParams.get("propertyType") || "",
    status: searchParams.get("status") || "",
    timeline: searchParams.get("timeline") || "",
  });

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const currentPage = parseInt(searchParams.get("page") || "1");
  const sortBy = searchParams.get("sortBy") || "updatedAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  // Handle authentication redirect in useEffect to avoid render-time state updates
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchBuyers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        sortBy,
        sortOrder,
      });

      if (debouncedSearch) params.append("search", debouncedSearch);
      if (filters.city) params.append("city", filters.city);
      if (filters.propertyType)
        params.append("propertyType", filters.propertyType);
      if (filters.status) params.append("status", filters.status);
      if (filters.timeline) params.append("timeline", filters.timeline);

      const response = await fetch(`/api/buyers?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch buyers");
      }

      const data: BuyersResponse = await response.json();
      setBuyers(data.buyers);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching buyers:", error);
      alert("Failed to fetch buyers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch buyers if user is authenticated
    if (status === "authenticated") {
      fetchBuyers();
    }
  }, [currentPage, debouncedSearch, filters, sortBy, sortOrder, status]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  // Show loading while redirecting unauthenticated users
  if (status === "unauthenticated") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Redirecting to sign in...
      </div>
    );
  }

  const updateURL = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    // Reset to page 1 when filters change
    if (Object.keys(newParams).some((key) => key !== "page")) {
      params.set("page", "1");
    }

    router.push(`/buyers?${params.toString()}`, { scroll: false });
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateURL({ [key]: value });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    updateURL({ search: value });
  };

  const handleSort = (column: string) => {
    const newSortOrder =
      sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    updateURL({ sortBy: column, sortOrder: newSortOrder });
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return "↕️";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  const formatBudget = (min?: number | null, max?: number | null) => {
    if (!min && !max) return "-";
    if (min && max) return `${formatCurrency(min)} - ${formatCurrency(max)}`;
    if (min) return `${formatCurrency(min)}+`;
    if (max) return `Up to ${formatCurrency(max)}`;
    return "-";
  };

  const getStatusColor = (status: string) => {
    const colors = {
      New: "bg-purple-100 text-purple-800",
      Qualified: "bg-emerald-100 text-emerald-800",
      Contacted: "bg-amber-100 text-amber-800",
      Visited: "bg-indigo-100 text-indigo-800",
      Negotiation: "bg-orange-100 text-orange-800",
      Converted: "bg-green-100 text-green-800",
      Dropped: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <>
      <NavigationHeader currentPage="buyers" />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Buyer Leads
              </h1>
              <p className="text-purple-600">
                Manage and track your buyer leads
              </p>
            </div>
            <div className="flex gap-4">
              <Button asChild className="shadow-lg">
                <Link href="/buyers/new">Create New Lead</Link>
              </Button>
              <CsvManager
                currentFilters={
                  new URLSearchParams({
                    ...(debouncedSearch && { search: debouncedSearch }),
                    ...(filters.city && { city: filters.city }),
                    ...(filters.propertyType && {
                      propertyType: filters.propertyType,
                    }),
                    ...(filters.status && { status: filters.status }),
                    ...(filters.timeline && { timeline: filters.timeline }),
                    sortBy,
                    sortOrder,
                  })
                }
                onImportComplete={fetchBuyers}
              />
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-lg border border-purple-100 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label
                  htmlFor="search"
                  className="block text-sm font-medium text-purple-700 mb-2"
                >
                  Search
                </label>
                <Input
                  id="search"
                  placeholder="Search by name, phone, or email..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="border-purple-200 focus:border-purple-400 focus:ring-purple-200"
                />
              </div>

              {/* City Filter */}
              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-purple-700 mb-2"
                >
                  City
                </label>
                <select
                  id="city"
                  value={filters.city}
                  onChange={(e) => handleFilterChange("city", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                >
                  <option value="">All Cities</option>
                  <option value="Chandigarh">Chandigarh</option>
                  <option value="Mohali">Mohali</option>
                  <option value="Zirakpur">Zirakpur</option>
                  <option value="Panchkula">Panchkula</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Property Type Filter */}
              <div>
                <label
                  htmlFor="propertyType"
                  className="block text-sm font-medium text-purple-700 mb-2"
                >
                  Property Type
                </label>
                <select
                  id="propertyType"
                  value={filters.propertyType}
                  onChange={(e) =>
                    handleFilterChange("propertyType", e.target.value)
                  }
                  className="flex h-10 w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                >
                  <option value="">All Types</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Villa">Villa</option>
                  <option value="Plot">Plot</option>
                  <option value="Office">Office</option>
                  <option value="Retail">Retail</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-purple-700 mb-2"
                >
                  Status
                </label>
                <select
                  id="status"
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                >
                  <option value="">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Visited">Visited</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Converted">Converted</option>
                  <option value="Dropped">Dropped</option>
                </select>
              </div>

              {/* Timeline Filter */}
              <div>
                <label
                  htmlFor="timeline"
                  className="block text-sm font-medium text-purple-700 mb-2"
                >
                  Timeline
                </label>
                <select
                  id="timeline"
                  value={filters.timeline}
                  onChange={(e) =>
                    handleFilterChange("timeline", e.target.value)
                  }
                  className="flex h-10 w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                >
                  <option value="">All Timelines</option>
                  <option value="0-3m">0-3 months</option>
                  <option value="3-6m">3-6 months</option>
                  <option value=">6m">More than 6 months</option>
                  <option value="Exploring">Just exploring</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white rounded-xl shadow-lg border border-purple-100">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="mt-2 text-purple-600">Loading buyers...</p>
              </div>
            ) : buyers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">No buyers found.</p>
                <Link href="/buyers/new">
                  <Button className="mt-4">Create your first lead</Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                      <tr>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("fullName")}
                        >
                          Name {getSortIcon("fullName")}
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("phone")}
                        >
                          Phone {getSortIcon("phone")}
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("city")}
                        >
                          City {getSortIcon("city")}
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("propertyType")}
                        >
                          Property Type {getSortIcon("propertyType")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Budget
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timeline
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("status")}
                        >
                          Status {getSortIcon("status")}
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("updatedAt")}
                        >
                          Updated {getSortIcon("updatedAt")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {buyers.map((buyer) => (
                        <tr key={buyer.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {buyer.fullName}
                            </div>
                            {buyer.email && (
                              <div className="text-sm text-gray-500">
                                {buyer.email}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPhone(buyer.phone)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {buyer.city}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {buyer.propertyType}
                            {buyer.bhk && ` (${buyer.bhk} BHK)`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatBudget(buyer.budgetMin, buyer.budgetMax)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {buyer.timeline}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                buyer.status
                              )}`}
                            >
                              {buyer.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(new Date(buyer.updatedAt))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              href={`/buyers/${buyer.id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View / Edit
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <Button
                      variant="outline"
                      onClick={() =>
                        updateURL({ page: (currentPage - 1).toString() })
                      }
                      disabled={!pagination.hasPrevPage}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        updateURL({ page: (currentPage + 1).toString() })
                      }
                      disabled={!pagination.hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{" "}
                        <span className="font-medium">
                          {(currentPage - 1) * pagination.limit + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium">
                          {Math.min(
                            currentPage * pagination.limit,
                            pagination.totalCount
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium">
                          {pagination.totalCount}
                        </span>{" "}
                        results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <Button
                          variant="outline"
                          onClick={() =>
                            updateURL({ page: (currentPage - 1).toString() })
                          }
                          disabled={!pagination.hasPrevPage}
                          className="rounded-r-none"
                        >
                          Previous
                        </Button>

                        {/* Page numbers */}
                        {Array.from(
                          { length: Math.min(5, pagination.totalPages) },
                          (_, i) => {
                            const pageNum = Math.max(1, currentPage - 2) + i;
                            if (pageNum > pagination.totalPages) return null;

                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  pageNum === currentPage
                                    ? "default"
                                    : "outline"
                                }
                                onClick={() =>
                                  updateURL({ page: pageNum.toString() })
                                }
                                className="rounded-none"
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                        )}

                        <Button
                          variant="outline"
                          onClick={() =>
                            updateURL({ page: (currentPage + 1).toString() })
                          }
                          disabled={!pagination.hasNextPage}
                          className="rounded-l-none"
                        >
                          Next
                        </Button>
                      </nav>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
