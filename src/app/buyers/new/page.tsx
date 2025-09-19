"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createBuyerSchema,
  CreateBuyerInput,
} from "../../../lib/validations/buyer";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { NavigationHeader } from "../../../components/auth/NavigationHeader";

export default function CreateBuyerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
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
    },
  });

  const propertyType = watch("propertyType");

  // Redirect to login if not authenticated
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="text-purple-600">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);

    try {
      // Validate and transform data with Zod schema
      const validatedData = createBuyerSchema.parse({
        ...data,
        tags,
        // Convert string values to proper types
        budgetMin: data.budgetMin ? parseInt(data.budgetMin) : undefined,
        budgetMax: data.budgetMax ? parseInt(data.budgetMax) : undefined,
        // Handle optional empty strings - convert to undefined
        email: data.email && data.email.trim() !== "" ? data.email : undefined,
        notes: data.notes && data.notes.trim() !== "" ? data.notes : undefined,
        bhk: data.bhk && data.bhk.trim() !== "" ? data.bhk : undefined,
        // Required fields should not be converted to undefined - let them fail validation if empty
      });

      const response = await fetch("/api/buyers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.details) {
          // Handle Zod validation errors
          errorData.details.forEach((error: any) => {
            setError(error.path[0], {
              message: error.message,
            });
          });
        } else {
          throw new Error(errorData.error || "Failed to create buyer");
        }
        return;
      }

      const buyer = await response.json();
      router.push(`/buyers/${buyer.id}`);
    } catch (error: any) {
      console.error("Error creating buyer:", error);

      if (error.name === "ZodError") {
        // Handle client-side validation errors
        error.issues.forEach((validationError: any) => {
          setError(validationError.path[0], {
            message: validationError.message,
          });
        });
      } else {
        alert("Failed to create buyer. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <NavigationHeader currentPage="new-lead" />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">
              Create New Lead
            </h1>
            <p className="text-purple-600 mt-2">
              Add a new buyer lead to the system
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="bg-white rounded-xl shadow-lg border border-purple-100 p-8 space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-purple-700 mb-2"
                >
                  Full Name *
                </label>
                <Input
                  id="fullName"
                  {...register("fullName")}
                  placeholder="Enter full name"
                  aria-invalid={errors.fullName ? "true" : "false"}
                />
                {errors.fullName && (
                  <p className="text-red-600 text-sm mt-1" role="alert">
                    {errors.fullName.message}
                  </p>
                )}
              </div>
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-purple-700 mb-2"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="Enter email address"
                  aria-invalid={errors.email ? "true" : "false"}
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>
              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-purple-700 mb-2"
                >
                  Phone Number *
                </label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="Enter 10-15 digit phone number"
                  aria-invalid={errors.phone ? "true" : "false"}
                />
                {errors.phone && (
                  <p className="text-red-600 text-sm mt-1" role="alert">
                    {errors.phone.message}
                  </p>
                )}
              </div>
              {/* City */}
              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-purple-700 mb-2"
                >
                  City *
                </label>
                <select
                  id="city"
                  {...register("city", { required: "City is required" })}
                  className="flex h-10 w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  aria-invalid={errors.city ? "true" : "false"}
                >
                  <option value="">Select city</option>
                  <option value="Chandigarh">Chandigarh</option>
                  <option value="Mohali">Mohali</option>
                  <option value="Zirakpur">Zirakpur</option>
                  <option value="Panchkula">Panchkula</option>
                  <option value="Other">Other</option>
                </select>
                {errors.city && (
                  <p className="text-red-600 text-sm mt-1" role="alert">
                    {errors.city.message}
                  </p>
                )}
              </div>
              {/* Property Type */}
              <div>
                <label
                  htmlFor="propertyType"
                  className="block text-sm font-medium text-purple-700 mb-2"
                >
                  Property Type *
                </label>
                <select
                  id="propertyType"
                  {...register("propertyType", {
                    required: "Property type is required",
                  })}
                  className="flex h-10 w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  aria-invalid={errors.propertyType ? "true" : "false"}
                >
                  <option value="">Select property type</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Villa">Villa</option>
                  <option value="Plot">Plot</option>
                  <option value="Office">Office</option>
                  <option value="Retail">Retail</option>
                </select>
                {errors.propertyType && (
                  <p className="text-red-600 text-sm mt-1" role="alert">
                    {errors.propertyType.message}
                  </p>
                )}
              </div>
              {/* BHK - Only show for Apartment and Villa */}
              {(propertyType === "Apartment" || propertyType === "Villa") && (
                <div>
                  <label
                    htmlFor="bhk"
                    className="block text-sm font-medium text-purple-700 mb-2"
                  >
                    BHK *
                  </label>
                  <select
                    id="bhk"
                    {...register("bhk")}
                    className="flex h-10 w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                    aria-invalid={errors.bhk ? "true" : "false"}
                  >
                    <option value="">Select BHK</option>
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4 BHK</option>
                    <option value="Studio">Studio</option>
                  </select>
                  {errors.bhk && (
                    <p className="text-red-600 text-sm mt-1" role="alert">
                      {errors.bhk.message}
                    </p>
                  )}
                </div>
              )}
              {/* Purpose */}
              <div>
                <label
                  htmlFor="purpose"
                  className="block text-sm font-medium text-purple-700 mb-2"
                >
                  Purpose *
                </label>
                <select
                  id="purpose"
                  {...register("purpose", { required: "Purpose is required" })}
                  className="flex h-10 w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  aria-invalid={errors.purpose ? "true" : "false"}
                >
                  <option value="">Select purpose</option>
                  <option value="Buy">Buy</option>
                  <option value="Rent">Rent</option>
                </select>
                {errors.purpose && (
                  <p className="text-red-600 text-sm mt-1" role="alert">
                    {errors.purpose.message}
                  </p>
                )}
              </div>
              {/* Budget Min */}
              <div>
                <label
                  htmlFor="budgetMin"
                  className="block text-sm font-medium text-purple-700 mb-2"
                >
                  Budget Min (₹)
                </label>
                <Input
                  id="budgetMin"
                  type="number"
                  {...register("budgetMin")}
                  placeholder="Enter minimum budget"
                  aria-invalid={errors.budgetMin ? "true" : "false"}
                />
                {errors.budgetMin && (
                  <p className="text-red-600 text-sm mt-1" role="alert">
                    {errors.budgetMin.message}
                  </p>
                )}
              </div>
              {/* Budget Max */}
              <div>
                <label
                  htmlFor="budgetMax"
                  className="block text-sm font-medium text-purple-700 mb-2"
                >
                  Budget Max (₹)
                </label>
                <Input
                  id="budgetMax"
                  type="number"
                  {...register("budgetMax")}
                  placeholder="Enter maximum budget"
                  aria-invalid={errors.budgetMax ? "true" : "false"}
                />
                {errors.budgetMax && (
                  <p className="text-red-600 text-sm mt-1" role="alert">
                    {errors.budgetMax.message}
                  </p>
                )}
              </div>
              {/* Timeline */}
              <div>
                <label
                  htmlFor="timeline"
                  className="block text-sm font-medium text-purple-700 mb-2"
                >
                  Timeline *
                </label>
                <select
                  id="timeline"
                  {...register("timeline", {
                    required: "Timeline is required",
                  })}
                  className="flex h-10 w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  aria-invalid={errors.timeline ? "true" : "false"}
                >
                  <option value="">Select timeline</option>
                  <option value="0-3m">0-3 months</option>
                  <option value="3-6m">3-6 months</option>
                  <option value=">6m">More than 6 months</option>
                  <option value="Exploring">Just exploring</option>
                </select>
                {errors.timeline && (
                  <p className="text-red-600 text-sm mt-1" role="alert">
                    {errors.timeline.message}
                  </p>
                )}
              </div>
              {/* Source */}
              <div>
                <label
                  htmlFor="source"
                  className="block text-sm font-medium text-purple-700 mb-2"
                >
                  Source *
                </label>
                <select
                  id="source"
                  {...register("source", { required: "Source is required" })}
                  className="flex h-10 w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  aria-invalid={errors.source ? "true" : "false"}
                >
                  <option value="">Select source</option>
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Call">Phone Call</option>
                  <option value="Other">Other</option>
                </select>
                {errors.source && (
                  <p className="text-red-600 text-sm mt-1" role="alert">
                    {errors.source.message}
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-purple-700 mb-2"
              >
                Notes
              </label>
              <Textarea
                id="notes"
                {...register("notes")}
                placeholder="Add any additional notes (max 1000 characters)"
                rows={4}
                aria-invalid={errors.notes ? "true" : "false"}
                className="border-purple-200 focus:border-purple-400 focus:ring-purple-200"
              />
              {errors.notes && (
                <p className="text-red-600 text-sm mt-1" role="alert">
                  {errors.notes.message}
                </p>
              )}
            </div>

            {/* Tags */}
            <div>
              <label
                htmlFor="tags"
                className="block text-sm font-medium text-purple-700 mb-2"
              >
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  id="tagInput"
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
                  Add Tag
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                        aria-label={`Remove ${tag} tag`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-purple-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/buyers")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="shadow-lg"
              >
                {isSubmitting ? "Creating..." : "Create Lead"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
