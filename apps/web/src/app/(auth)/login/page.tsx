import { ArrowLeftIcon, GalleryVerticalEndIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className={`${buttonVariants({ variant: "ghost", size: "lg" })} px-4 py-5 self-start text-muted-foreground`}
          >
            <ArrowLeftIcon aria-hidden />
            Back
          </Link>

          <div className="flex items-center gap-2 font-medium">
            <span>Savaenergy</span>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>

      <div className="hidden flex-col items-center justify-center gap-6 bg-muted p-10 text-center lg:flex">
        <GalleryVerticalEndIcon className="size-8" />
      </div>
    </div>
  );
}
