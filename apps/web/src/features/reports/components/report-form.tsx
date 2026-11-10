"use client";

import { useForm } from "@tanstack/react-form";
import { useCreateReport } from "../hooks/use-reports";

export function ReportForm() {
  const create = useCreateReport();

  const form = useForm({
    defaultValues: {
      wellName: "",
      reportDate: new Date().toISOString().slice(0, 10),
      depthM: 0,
      mudWeightPpg: 0,
    },
    onSubmit: async ({ value, formApi }) => {
      await create.mutateAsync(value);
      formApi.reset();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "1rem 0" }}
    >
      <form.Field name="wellName" validators={{ onChange: ({ value }) => (value ? undefined : "Required") }}>
        {(f) => (
          <input placeholder="Well name" value={f.state.value} onBlur={f.handleBlur} onChange={(e) => f.handleChange(e.target.value)} />
        )}
      </form.Field>
      <form.Field name="reportDate">
        {(f) => <input type="date" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} />}
      </form.Field>
      <form.Field name="depthM">
        {(f) => <input type="number" min={0} value={f.state.value} onChange={(e) => f.handleChange(Number(e.target.value))} />}
      </form.Field>
      <form.Field name="mudWeightPpg">
        {(f) => <input type="number" step="0.01" min={0} value={f.state.value} onChange={(e) => f.handleChange(Number(e.target.value))} />}
      </form.Field>
      <form.Subscribe selector={(s) => s.canSubmit && !s.isSubmitting}>
        {(ok) => (
          <button type="submit" disabled={!ok}>
            Add report
          </button>
        )}
      </form.Subscribe>
    </form>
  );
}
