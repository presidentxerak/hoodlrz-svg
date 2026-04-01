"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { getVinylById } from "@/lib/genesis";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Netherlands",
  "Japan",
  "South Korea",
  "Brazil",
  "Mexico",
  "Spain",
  "Italy",
  "Sweden",
  "Norway",
  "Denmark",
  "Switzerland",
  "Austria",
  "Belgium",
  "Portugal",
  "Ireland",
  "New Zealand",
  "Singapore",
  "India",
  "South Africa",
  "United Arab Emirates",
  "Saudi Arabia",
  "Poland",
  "Czech Republic",
  "Argentina",
];

interface ShippingForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const INITIAL_FORM: ShippingForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  country: "",
};

const REQUIRED_FIELDS: (keyof ShippingForm)[] = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "address1",
  "city",
  "state",
  "zip",
  "country",
];

const FIELD_LABELS: Record<keyof ShippingForm, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  phone: "Phone",
  address1: "Address Line 1",
  address2: "Address Line 2",
  city: "City",
  state: "State / Province",
  zip: "ZIP / Postal Code",
  country: "Country",
};

export default function GenesisVinylPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const vinyl = getVinylById(id);

  const [form, setForm] = useState<ShippingForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  if (!vinyl) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted">Vinyl not found.</p>
      </div>
    );
  }

  const editionVariant =
    vinyl.edition === "Black"
      ? "default"
      : vinyl.edition === "White"
        ? "rare"
        : "legendary";

  function updateField(field: keyof ShippingForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof ShippingForm, string>> = {};
    for (const field of REQUIRED_FIELDS) {
      if (!form[field].trim()) {
        newErrors[field] = `${FIELD_LABELS[field]} is required`;
      }
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch("/api/genesis/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vinylId: vinyl!.id,
          ...form,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error || "Something went wrong.");
        return;
      }

      if (data.url) {
        router.push(data.url);
      }
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-16 pb-20 sm:pt-20">
      {/* Back link */}
      <Link
        href="/collection/genesis"
        className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted hover:text-foreground transition-colors mb-8"
      >
        &larr; Back to Genesis
      </Link>

      {/* Product section */}
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Image */}
        <div className="aspect-square overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={vinyl.image}
            alt={vinyl.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Details */}
        <div className="flex flex-col gap-5">
          <Badge variant={editionVariant}>{vinyl.edition} Edition</Badge>

          <h1 className="font-hoodlrz text-[32px] font-bold leading-none tracking-wider text-foreground sm:text-[48px]">
            {vinyl.name}
          </h1>

          <p className="font-hoodlrz text-[36px] font-bold leading-none text-foreground">
            $300
          </p>

          <p className="text-sm text-muted">Free worldwide shipping</p>

          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            1 of 1 &mdash; Unique piece
          </p>

          <p className="text-sm leading-relaxed text-muted max-w-md">
            Hand-crafted vinyl artwork from the Hoodlrz Genesis collection. Each
            piece is a unique, one-of-a-kind physical artwork shipped directly to
            you.
          </p>
        </div>
      </div>

      {/* Shipping form */}
      <Card className="mt-12">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-6">
          Shipping Information
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First Name *"
            name="firstName"
            value={form.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            error={errors.firstName}
          />
          <Input
            label="Last Name *"
            name="lastName"
            value={form.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            error={errors.lastName}
          />
          <Input
            label="Email *"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            error={errors.email}
          />
          <Input
            label="Phone *"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            error={errors.phone}
          />
          <div className="sm:col-span-2">
            <Input
              label="Address Line 1 *"
              name="address1"
              value={form.address1}
              onChange={(e) => updateField("address1", e.target.value)}
              error={errors.address1}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Address Line 2"
              name="address2"
              value={form.address2}
              onChange={(e) => updateField("address2", e.target.value)}
            />
          </div>
          <Input
            label="City *"
            name="city"
            value={form.city}
            onChange={(e) => updateField("city", e.target.value)}
            error={errors.city}
          />
          <Input
            label="State / Province *"
            name="state"
            value={form.state}
            onChange={(e) => updateField("state", e.target.value)}
            error={errors.state}
          />
          <Input
            label="ZIP / Postal Code *"
            name="zip"
            value={form.zip}
            onChange={(e) => updateField("zip", e.target.value)}
            error={errors.zip}
          />

          {/* Country select */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="country"
              className="text-xs uppercase tracking-widest text-muted"
            >
              Country *
            </label>
            <select
              id="country"
              name="country"
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
              className={[
                "w-full rounded-none border bg-transparent px-4 py-2.5 text-sm text-foreground",
                "outline-none transition-colors duration-150",
                "focus:border-accent-red focus:ring-0",
                errors.country
                  ? "border-accent-red"
                  : "border-[var(--border)]",
              ].join(" ")}
            >
              <option value="">Select a country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.country && (
              <span className="text-xs text-accent-red">{errors.country}</span>
            )}
          </div>
        </div>

        {/* Error display */}
        {apiError && (
          <div className="mt-4 border border-accent-red/40 bg-accent-red/10 p-3">
            <p className="text-sm text-accent-red">{apiError}</p>
          </div>
        )}

        {/* Submit */}
        <div className="mt-8">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Processing..." : "Purchase \u2014 $300"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
