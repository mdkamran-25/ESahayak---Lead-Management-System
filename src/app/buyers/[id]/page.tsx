"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { formatCurrency, formatDate, formatPhone } from "../../../lib/utils";
import { Buyer, BuyerHistory } from "../../../lib/db/schema";

interface BuyerWithHistory {
  buyer: Buyer;
  history: BuyerHistory[];
}

export default function BuyerDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const buyerId = params.id as string;

  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [history, setHistory] = useState<BuyerHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
    setError: setFormError,
  } = useForm({
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      city: "",
      propertyType: "",
      bhk: "",
      purpose: "",
      budgetMin: "",
      budgetMax: "",
      timeline: "",
      source: "",
      notes: "",
      status: "",
    },
  });

  const propertyType = watch("propertyType");

  // Redirect to login if not authenticated
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  const fetchBuyer = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/buyers/${buyerId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Buyer not found");
          return;
        }
        throw new Error("Failed to fetch buyer");
      }

      const data: BuyerWithHistory = await response.json();
      setBuyer(data.buyer);
      setHistory(data.history);
      setTags(data.buyer.tags || []);

      // Reset form with buyer data
      reset({
        fullName: data.buyer.fullName,
        email: data.buyer.email || "",
        phone: data.buyer.phone,
        city: data.buyer.city,
        propertyType: data.buyer.propertyType,
        bhk: data.buyer.bhk || "",
        purpose: data.buyer.purpose,
        budgetMin: data.buyer.budgetMin?.toString() || "",
        budgetMax: data.buyer.budgetMax?.toString() || "",
        timeline: data.buyer.timeline,
        source: data.buyer.source,
        notes: data.buyer.notes || "",
        status: data.buyer.status,
      });
    } catch (error) {
      console.error("Error fetching buyer:", error);
      setError("Failed to load buyer details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (buyerId) {
      fetchBuyer();
    }
  }, [buyerId]);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const canEdit = buyer && buyer.ownerId === session?.user?.id;

  const onSubmit = async (data: any) => {
    if (!buyer || !canEdit) return;

    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        ...data,
        tags,
        budgetMin: data.budgetMin ? parseInt(data.budgetMin) : undefined,
        budgetMax: data.budgetMax ? parseInt(data.budgetMax) : undefined,
        updatedAt: buyer.updatedAt, // For concurrency control
      };

      const response = await fetch(`/api/buyers/${buyerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 409) {
          // Concurrency conflict
          setError(errorData.error);
          await fetchBuyer(); // Refresh data
          return;
        }

        if (errorData.details) {
          // Handle Zod validation errors
          errorData.details.forEach((error: any) => {
            setFormError(error.path[0], {
              message: error.message,
            });
          });
        } else {
          throw new Error(errorData.error || "Failed to update buyer");
        }
        return;
      }

      const updatedBuyer = await response.json();
      setBuyer(updatedBuyer);
      setIsEditing(false);

      // Refresh to get updated history
      await fetchBuyer();
    } catch (error) {
      console.error("Error updating buyer:", error);
      setError("Failed to update buyer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!buyer || !canEdit) return;

    if (
      !confirm(
        "Are you sure you want to delete this buyer? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/buyers/${buyerId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete buyer");
      }

      router.push("/buyers");
    } catch (error) {
      console.error("Error deleting buyer:", error);
      setError("Failed to delete buyer. Please try again.");
    }
  };

  const formatBudget = (min?: number | null, max?: number | null) => {
    if (!min && !max) return "Not specified";
    if (min && max) return `${formatCurrency(min)} - ${formatCurrency(max)}`;
    if (min) return `${formatCurrency(min)}+`;
    if (max) return `Up to ${formatCurrency(max)}`;
    return "Not specified";
  };

  const getStatusColor = (status: string) => {
    const colors = {
      New: "bg-blue-100 text-blue-800",
      Qualified: "bg-green-100 text-green-800",
      Contacted: "bg-yellow-100 text-yellow-800",
      Visited: "bg-purple-100 text-purple-800",
      Negotiation: "bg-orange-100 text-orange-800",
      Converted: "bg-emerald-100 text-emerald-800",
      Dropped: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const formatHistoryValue = (value: any) => {
    if (value === null || value === undefined) return "None";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "number") return value.toString();
    return value.toString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading buyer details...</p>
        </div>
      </div>
    );
  }

  if (error && !buyer) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button asChild>
            <Link href="/buyers">← Back to Buyers</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!buyer) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">
            Buyer not found
          </h1>
          <Button asChild>
            <Link href="/buyers">← Back to Buyers</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {buyer.fullName}
            </h1>
            <span
              className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                buyer.status
              )}`}
            >
              {buyer.status}
            </span>
          </div>
          <p className="text-gray-600">
            Created {formatDate(new Date(buyer.createdAt))} • Last updated{" "}
            {formatDate(new Date(buyer.updatedAt))}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/buyers">← Back to List</Link>
          </Button>

          {canEdit && !isEditing && (
            <Button onClick={() => setIsEditing(true)}>Edit</Button>
          )}

          {canEdit && isEditing && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setError("");
                  fetchBuyer(); // Reset form
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}

          {canEdit && !isEditing && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {isEditing ? (
            /* Edit Form */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Edit Buyer Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Form fields similar to create page but pre-filled */}
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <Input
                      {...register("fullName", {
                        required: "Full name is required",
                      })}
                      placeholder="Enter full name"
                    />
                    {errors.fullName && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <Input
                      type="email"
                      {...register("email")}
                      placeholder="Enter email address"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <Input
                      {...register("phone", { required: "Phone is required" })}
                      placeholder="Enter phone number"
                    />
                    {errors.phone && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      {...register("status")}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="New">New</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Visited">Visited</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Converted">Converted</option>
                      <option value="Dropped">Dropped</option>
                    </select>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <select
                      {...register("city", { required: "City is required" })}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select city</option>
                      <option value="Chandigarh">Chandigarh</option>
                      <option value="Mohali">Mohali</option>
                      <option value="Zirakpur">Zirakpur</option>
                      <option value="Panchkula">Panchkula</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.city && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.city.message}
                      </p>
                    )}
                  </div>

                  {/* Property Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Type *
                    </label>
                    <select
                      {...register("propertyType", {
                        required: "Property type is required",
                      })}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select property type</option>
                      <option value="Apartment">Apartment</option>
                      <option value="Villa">Villa</option>
                      <option value="Plot">Plot</option>
                      <option value="Office">Office</option>
                      <option value="Retail">Retail</option>
                    </select>
                    {errors.propertyType && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.propertyType.message}
                      </p>
                    )}
                  </div>

                  {/* BHK - Only show for Apartment and Villa */}
                  {(propertyType === "Apartment" ||
                    propertyType === "Villa") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        BHK *
                      </label>
                      <select
                        {...register("bhk", {
                          required:
                            propertyType === "Apartment" ||
                            propertyType === "Villa"
                              ? "BHK is required"
                              : false,
                        })}
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select BHK</option>
                        <option value="1">1 BHK</option>
                        <option value="2">2 BHK</option>
                        <option value="3">3 BHK</option>
                        <option value="4">4 BHK</option>
                        <option value="Studio">Studio</option>
                      </select>
                      {errors.bhk && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.bhk.message}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Purpose */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purpose *
                    </label>
                    <select
                      {...register("purpose", {
                        required: "Purpose is required",
                      })}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select purpose</option>
                      <option value="Buy">Buy</option>
                      <option value="Rent">Rent</option>
                    </select>
                    {errors.purpose && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.purpose.message}
                      </p>
                    )}
                  </div>

                  {/* Budget Min */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget Min (₹)
                    </label>
                    <Input
                      type="number"
                      {...register("budgetMin")}
                      placeholder="Enter minimum budget"
                    />
                  </div>

                  {/* Budget Max */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget Max (₹)
                    </label>
                    <Input
                      type="number"
                      {...register("budgetMax")}
                      placeholder="Enter maximum budget"
                    />
                  </div>

                  {/* Timeline */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timeline *
                    </label>
                    <select
                      {...register("timeline", {
                        required: "Timeline is required",
                      })}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select timeline</option>
                      <option value="0-3m">0-3 months</option>
                      <option value="3-6m">3-6 months</option>
                      <option value=">6m">More than 6 months</option>
                      <option value="Exploring">Just exploring</option>
                    </select>
                    {errors.timeline && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.timeline.message}
                      </p>
                    )}
                  </div>

                  {/* Source */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Source *
                    </label>
                    <select
                      {...register("source", {
                        required: "Source is required",
                      })}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select source</option>
                      <option value="Website">Website</option>
                      <option value="Referral">Referral</option>
                      <option value="Walk-in">Walk-in</option>
                      <option value="Call">Phone Call</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.source && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.source.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <Textarea
                    {...register("notes")}
                    placeholder="Add any additional notes"
                    rows={4}
                  />
                </div>

                {/* Tags */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </form>
          ) : (
            /* View Mode */
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-6">Buyer Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Contact Information
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {buyer.fullName}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {buyer.email || "Not provided"}
                    </p>
                    <p>
                      <span className="font-medium">Phone:</span>{" "}
                      {formatPhone(buyer.phone)}
                    </p>
                    <p>
                      <span className="font-medium">City:</span> {buyer.city}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Property Requirements
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Property Type:</span>{" "}
                      {buyer.propertyType}
                    </p>
                    {buyer.bhk && (
                      <p>
                        <span className="font-medium">BHK:</span> {buyer.bhk}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Purpose:</span>{" "}
                      {buyer.purpose}
                    </p>
                    <p>
                      <span className="font-medium">Budget:</span>{" "}
                      {formatBudget(buyer.budgetMin, buyer.budgetMax)}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Additional Information
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Timeline:</span>{" "}
                      {buyer.timeline}
                    </p>
                    <p>
                      <span className="font-medium">Source:</span>{" "}
                      {buyer.source}
                    </p>
                    <p>
                      <span className="font-medium">Status:</span>{" "}
                      {buyer.status}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Tags
                  </h3>
                  {buyer.tags && buyer.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {buyer.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No tags</p>
                  )}
                </div>
              </div>

              {buyer.notes && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Notes
                  </h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                    {buyer.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - History */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Change History</h2>

            {history.length === 0 ? (
              <p className="text-gray-500 text-sm">No changes recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="border-l-2 border-blue-200 pl-4 pb-4"
                  >
                    <div className="text-sm text-gray-500 mb-2">
                      {formatDate(new Date(entry.changedAt))}
                    </div>

                    <div className="space-y-1">
                      {Object.entries(entry.diff).map(([field, change]) => (
                        <div key={field} className="text-sm">
                          <span className="font-medium capitalize">
                            {field}:
                          </span>
                          <div className="ml-2">
                            <span className="text-red-600">
                              {formatHistoryValue(change.old)}
                            </span>
                            <span className="mx-2">→</span>
                            <span className="text-green-600">
                              {formatHistoryValue(change.new)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
