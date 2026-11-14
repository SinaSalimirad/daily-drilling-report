import { GalleryVerticalEndIcon } from "lucide-react";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-center gap-2 font-medium md:justify-start">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEndIcon className="size-4" />
          </div>
          Daily Mud Fluid Report
        </div>
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
