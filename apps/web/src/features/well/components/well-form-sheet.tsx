"use client";

import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { WellFormApi } from "../hooks/use-well-form";
import { WellFormFields } from "./well-form-fields";

type Props = {
  form: WellFormApi;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  submittingLabel: string;
  /** Projects the well can belong to. */
  projectItems: ReadonlyArray<{ value: string; label: string }>;
  /** True when editing: a well can't move to another project. */
  projectLocked?: boolean;
  /** Rendered as the button that opens the sheet; leave out when the parent controls `open`. */
  trigger?: ReactNode;
};

// The sheet layout shared by "Add well" and "Edit well".
export function WellFormSheet({
  form,
  open,
  onOpenChange,
  title,
  submitLabel,
  submittingLabel,
  projectItems,
  projectLocked = false,
  trigger,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <SheetTrigger render={<Button size="lg" className="h-10 px-4" />}>{trigger}</SheetTrigger>
      )}

      <SheetContent
        side="top"
        showCloseButton={false}
        className="mx-auto flex h-[90dvh] w-[96vw] max-w-360 flex-col overflow-hidden rounded-b-xl p-0"
      >
        <form
          id="well-form"
          noValidate
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <SheetHeader className="w-full shrink-0 border-b px-5 py-4 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <SheetClose
                  render={<Button size="icon" variant="ghost" className="size-8 shrink-0" />}
                >
                  <ChevronLeft className="size-5" />
                </SheetClose>

                <SheetTitle className="truncate text-lg">{title}</SheetTitle>
              </div>

              <div className="flex items-center gap-2">
                <SheetClose render={<Button className="h-10 px-4" variant="outline" size="lg" />}>
                  Discard
                </SheetClose>

                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <Button className="h-10 px-4" size="lg" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? submittingLabel : submitLabel}
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
            <FieldGroup className="w-full max-w-none">
              <WellFormFields
                form={form}
                projectItems={projectItems}
                projectLocked={projectLocked}
              />
            </FieldGroup>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
