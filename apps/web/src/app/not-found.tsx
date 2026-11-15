import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-start gap-3 p-6">
      <h1 className="font-semibold text-lg">Page not found</h1>
      <p className="text-muted-foreground text-sm">
        The address does not match any page, or the record no longer exists.
      </p>
      <Button nativeButton={false} render={<Link href="/" />}>
        Back to home
      </Button>
    </main>
  );
}
