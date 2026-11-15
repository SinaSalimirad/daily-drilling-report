'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loading, QueryError } from '@/components/QueryState';
import { Button } from '@/components/ui/button';
import { toastError } from '@/lib/form-errors';
import { useAssignableUsers, useReplaceWellMembers, useWellMembers } from './use-users';

/** Who may work on this well (docs/07: engineers and clients; staff see every well). */
export function WellMembers({ wellId }: { wellId: string }) {
  const users = useAssignableUsers(true);
  const members = useWellMembers(wellId, true);
  if (users.isPending || members.isPending) return <Loading what="Loading members" />;
  if (users.isError) return <QueryError error={users.error} />;
  if (members.isError) return <QueryError error={members.error} />;
  return (
    <MemberList
      key={members.data.map((m) => m.id).join()}
      wellId={wellId}
      users={users.data}
      selected={members.data.map((m) => m.id)}
    />
  );
}

function MemberList({
  wellId,
  users,
  selected,
}: {
  wellId: string;
  users: { id: string; name: string; email: string; role: string }[];
  selected: string[];
}) {
  const replace = useReplaceWellMembers(wellId);
  const [ids, setIds] = useState(new Set(selected));
  const toggle = (id: string) =>
    setIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  return (
    <div className="flex flex-col gap-3">
      {users.length === 0 ? (
        <p className="text-muted-foreground text-sm">No engineers or clients yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {users.map((u) => (
            <li key={u.id}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={ids.has(u.id)} onChange={() => toggle(u.id)} />
                {u.name}{' '}
                <span className="text-muted-foreground">
                  ({u.role}, {u.email})
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <Button
        className="self-start"
        onClick={async () => {
          try {
            await replace.mutateAsync({ userIds: [...ids] });
            toast.success('Members saved');
          } catch (error) {
            toastError(error);
          }
        }}
      >
        Save members
      </Button>
    </div>
  );
}
