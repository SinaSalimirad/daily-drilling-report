import { db } from "@/db";
import { Role } from "@/features/users/roles";
import { createUserSchema } from "@/features/users/users.schema";
import { userService } from "@/features/users/users.service";

// Creates the first admin, which can't be done through the API (POST /users needs an admin).
// The values come from env vars so the password does not end up in shell history as an argument:
//
//   ADMIN_EMAIL=me@example.com ADMIN_PASSWORD='...' ADMIN_DISPLAY_NAME='Me' bun run db:create-admin
//
// Validated with the same schema as POST /users. Fails with a duplicate error if the email exists.
async function createAdmin() {
  const input = createUserSchema.parse({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    displayName: process.env.ADMIN_DISPLAY_NAME ?? "Admin",
    role: Role.Admin,
  });

  const admin = await userService().create(input);

  console.log(`Admin created: ${admin?.email}`);
}

createAdmin()
  .catch((error) => {
    const isDuplicate = (error as { cause?: { code?: string } }).cause?.code === "23505";
    console.error("Creating the admin failed:", isDuplicate ? "that email already exists." : error);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());
