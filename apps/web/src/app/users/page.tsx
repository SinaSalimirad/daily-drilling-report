'use client';

import { PASSWORD_MIN_LENGTH, ROLES, type Role, userCreateSchema } from '@ddr/schemas';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormField } from '@/components/FormField';
import { NativeSelect } from '@/components/NativeSelect';
import { PageHeader } from '@/components/PageHeader';
import { Loading, QueryError } from '@/components/QueryState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCan } from '@/features/auth/use-session';
import { useUserMutations, useUsers } from '@/features/users/use-users';
import {
  type FieldErrors,
  issuesToFieldErrors,
  serverFieldErrors,
  toastError,
} from '@/lib/form-errors';

function NewUserForm() {
  const m = useUserMutations();
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    role: 'engineer' as Role,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = (patch: Partial<typeof values>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors({});
  };
  const submit = async () => {
    const parsed = userCreateSchema.safeParse(values);
    if (!parsed.success) return setErrors(issuesToFieldErrors(parsed.error.issues));
    try {
      await m.create.mutateAsync(parsed.data);
      setValues({ name: '', email: '', password: '', role: 'engineer' });
      toast.success('User created');
    } catch (error) {
      const fieldErrors = serverFieldErrors(error);
      if (fieldErrors) setErrors(fieldErrors);
      else toastError(error);
    }
  };
  return (
    <form
      noValidate
      className="grid max-w-3xl gap-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <FormField id="name" label="Name" error={errors.name}>
        <Input id="name" value={values.name} onChange={(e) => set({ name: e.target.value })} />
      </FormField>
      <FormField id="email" label="Email" error={errors.email}>
        <Input
          id="email"
          type="email"
          value={values.email}
          onChange={(e) => set({ email: e.target.value })}
        />
      </FormField>
      <FormField
        id="password"
        label="First password"
        error={errors.password}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters`}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => set({ password: e.target.value })}
        />
      </FormField>
      <FormField id="role" label="Role" error={errors.role}>
        <NativeSelect
          id="role"
          value={values.role}
          onChange={(e) => set({ role: e.target.value as Role })}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <Button type="submit" className="self-start md:col-span-2">
        Create user
      </Button>
    </form>
  );
}

function UserRow({
  user,
}: {
  user: { id: string; name: string; email: string; role: Role; banned: boolean };
}) {
  const m = useUserMutations();
  const [password, setPassword] = useState('');
  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      toast.success(done);
    } catch (error) {
      toastError(error);
    }
  };
  return (
    <TableRow className={user.banned ? 'opacity-60' : undefined}>
      <TableCell>{user.name}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <NativeSelect
          aria-label={`Role of ${user.name}`}
          value={user.role}
          onChange={(e) =>
            void run(
              () => m.update.mutateAsync({ id: user.id, input: { role: e.target.value as Role } }),
              'Role changed',
            )
          }
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </NativeSelect>
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            void run(
              () => m.update.mutateAsync({ id: user.id, input: { banned: !user.banned } }),
              user.banned ? 'User activated' : 'User deactivated',
            )
          }
        >
          {user.banned ? 'Activate' : 'Deactivate'}
        </Button>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Input
            aria-label={`New password for ${user.name}`}
            type="password"
            autoComplete="new-password"
            className="w-40"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={password.length < PASSWORD_MIN_LENGTH}
            onClick={() =>
              void run(async () => {
                await m.setPassword.mutateAsync({ id: user.id, password });
                setPassword('');
              }, 'Password reset')
            }
          >
            Reset password
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function UsersPage() {
  const allowed = useCan('user:manage');
  const users = useUsers();
  if (!allowed) {
    return (
      <>
        <PageHeader title="Users" />
        <p className="p-4 text-sm">Only an administrator manages users.</p>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Users" />
      <main className="flex flex-col gap-8 p-4">
        <section aria-labelledby="new-user" className="flex flex-col gap-3">
          <h2 id="new-user" className="font-semibold text-sm">
            New user
          </h2>
          <NewUserForm />
        </section>
        {users.isPending ? <Loading what="Loading users" /> : null}
        {users.isError ? <QueryError error={users.error} /> : null}
        {users.data ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Password</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data.map((user) => (
                <UserRow key={`${user.id}:${user.role}:${user.banned}`} user={user} />
              ))}
            </TableBody>
          </Table>
        ) : null}
      </main>
    </>
  );
}
