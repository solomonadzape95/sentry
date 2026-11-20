"use client";

import { useActionState, useState } from "react";
import { ROLE_LABEL } from "@/lib/config";
import { Field, inputClass } from "@/components/ui/field";
import { FormFeedback, SubmitButton } from "@/components/auth/form-parts";
import { createInviteAction, type FormState } from "@/app/(auth)/actions";

const ROLES = [
  "INVENTORY_OFFICER",
  "FACILITY_MANAGER",
  "NETWORK_AUTHORITY",
  "SUPPLIER",
];

export function CreateInviteForm({
  facilities,
  suppliers,
}: {
  facilities: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    createInviteAction,
    undefined,
  );
  const [role, setRole] = useState("INVENTORY_OFFICER");
  const needsFacility = role === "INVENTORY_OFFICER" || role === "FACILITY_MANAGER";
  const needsSupplier = role === "SUPPLIER";

  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input className={inputClass} name="name" placeholder="Amina Yusuf" required />
        </Field>
        <Field label="Email address">
          <input
            className={inputClass}
            name="email"
            type="email"
            placeholder="amina@facility.health"
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role">
          <select
            className={inputClass}
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            {ROLES.map((item) => (
              <option key={item} value={item}>
                {ROLE_LABEL[item] ?? item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Job title">
          <input className={inputClass} name="title" placeholder="Store officer" />
        </Field>
      </div>

      {needsFacility ? (
        <Field label="Facility" hint="The invitation creates a primary membership at this facility.">
          <select className={inputClass} name="facilityId" required>
            <option value="">Choose a facility</option>
            {facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {needsSupplier ? (
        <Field
          label="Supplier organisation"
          hint="The account will only see purchase orders addressed to this organisation."
        >
          <select className={inputClass} name="supplierId" required>
            <option value="">Choose a supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <SubmitButton className="sm:w-auto" pendingLabel="Creating invitation…">
        Send invitation
      </SubmitButton>
    </form>
  );
}
