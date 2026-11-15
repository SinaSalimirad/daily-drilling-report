import {
  auditEntrySchema,
  reportParamsSchema,
  userCreateSchema,
  userParamsSchema,
  userPasswordSchema,
  userSchema,
  userUpdateSchema,
  wellMembersPutSchema,
  wellParamsSchema,
} from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Auth } from '../../auth/auth';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import type { GuardContext } from '../../plugins/guard';
import { guard } from '../../plugins/guard';
import { projectsRepository } from '../projects/repository';
import { projectsService } from '../projects/service';
import { wellsRepository } from '../wells/repository';
import { wellsService } from '../wells/service';
import { accessRepository } from './repository';
import { accessService } from './service';

// Users (admin), the wells of a user, and the audit of a submitted report (docs/07).

const one = z.object({ data: userSchema });
const many = z.object({ data: z.array(userSchema) });

export const accessRoutes = (db: Db, auth: Auth) => {
  const service = accessService(
    accessRepository(db),
    auth,
    wellsService(wellsRepository(db), projectsService(projectsRepository(db))),
  );
  return new Elysia({ name: 'access' })
    .use(guard)
    .get('/users', async () => ok(await service.listUsers()), {
      permission: 'user:manage',
      response: { 200: many },
    })
    .post(
      '/users',
      async ({ body, set }) => {
        set.status = 201;
        return ok(await service.createUser(body));
      },
      { permission: 'user:manage', body: userCreateSchema, response: { 201: one } },
    )
    .patch(
      '/users/:userId',
      async (context) => {
        const actor = (context as unknown as GuardContext).authUser;
        return ok(await service.updateUser(actor?.id ?? '', context.params.userId, context.body));
      },
      {
        permission: 'user:manage',
        params: userParamsSchema,
        body: userUpdateSchema,
        response: { 200: one },
      },
    )
    .put(
      '/users/:userId/password',
      async ({ params, body, set }) => {
        await service.setPassword(params.userId, body.password);
        set.status = 204;
      },
      {
        permission: 'user:manage',
        params: userParamsSchema,
        body: userPasswordSchema,
        response: { 204: z.undefined() },
      },
    )
    .get('/users/:userId/wells', async ({ params }) => ok(await service.wellsOf(params.userId)), {
      permission: 'user:manage',
      params: userParamsSchema,
      response: { 200: z.object({ data: z.array(z.string()) }) },
    })
    .get(
      '/wells/:wellId/members',
      async ({ params }) => ok(await service.membersOf(params.wellId)),
      {
        permission: 'well:assign',
        params: wellParamsSchema,
        response: { 200: many },
      },
    )
    .put(
      '/wells/:wellId/members',
      async ({ params, body }) => ok(await service.replaceMembers(params.wellId, body)),
      {
        permission: 'well:assign',
        params: wellParamsSchema,
        body: wellMembersPutSchema,
        response: { 200: many },
      },
    )
    .get(
      '/reports/:reportId/edits',
      async ({ params }) => ok(await service.auditOf(params.reportId)),
      {
        permission: 'report:read',
        params: reportParamsSchema,
        response: { 200: z.object({ data: z.array(auditEntrySchema) }) },
      },
    );
};
