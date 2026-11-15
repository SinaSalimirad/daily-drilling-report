import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { createApp } from '../../app';
import { createTestDb, type TestDb } from '../../test/db';
import { asAdmin } from '../../test/session';

// Numbering and dating of daily reports (docs/09, first test of the list).

let testDb: TestDb;
let app: ReturnType<typeof createApp>;
const logLines: Record<string, unknown>[] = [];

beforeAll(async () => {
  testDb = await createTestDb();
  app = createApp({
    session: asAdmin,
    log: { production: true, level: 'info', write: (line) => logLines.push(JSON.parse(line)) },
    db: testDb.db,
  });
});
afterAll(() => testDb.drop());

// biome-ignore lint/suspicious/noExplicitAny: tests read untyped JSON bodies
type Json = any;

async function call(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: Json }> {
  const res = await app.handle(
    new Request(`http://localhost/api/v1${path}`, {
      method,
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : undefined };
}

describe('/api/v1 reports', () => {
  let projectId: string;
  let wellId: string;
  let sectionId: string;
  const ids: string[] = [];

  const newWell = async (name: string, spudDate?: string) =>
    (
      await call('POST', `/projects/${projectId}/wells`, {
        name,
        wellType: 'vertical',
        rigType: 'onshore',
        spudDate,
      })
    ).json.data.id as string;
  const newSection = async (well: string) =>
    (await call('POST', `/wells/${well}/sections`, { holeSize: 0.3111, fluidType: 'wbm' })).json
      .data.id as string;

  beforeAll(async () => {
    const project = { name: 'SAVA', operator: 'POGC', currency: '$' };
    projectId = (await call('POST', '/projects', project)).json.data.id;
    wellId = await newWell('PYW-24ST1', '2026-03-30');
    sectionId = await newSection(wellId);
  });

  it('gives the first report number 1 and the spud date', async () => {
    const { status, json } = await call('POST', `/wells/${wellId}/reports`, { sectionId });
    expect(status).toBe(201);
    expect(json.data).toMatchObject({
      reportNo: 1,
      reportDate: '2026-03-30',
      status: 'draft',
      revision: 1,
      submittedAt: null,
    });
    ids.push(json.data.id);
  });

  it('numbers the next report previous + 1 and dates it previous + 1 day, across a month end', async () => {
    const second = await call('POST', `/wells/${wellId}/reports`, { sectionId });
    expect(second.json.data).toMatchObject({ reportNo: 2, reportDate: '2026-03-31' });
    const third = await call('POST', `/wells/${wellId}/reports`, { sectionId });
    expect(third.json.data).toMatchObject({ reportNo: 3, reportDate: '2026-04-01' });
    ids.push(second.json.data.id, third.json.data.id);
  });

  it('accepts an overridden number and date', async () => {
    const { json } = await call('POST', `/wells/${wellId}/reports`, {
      sectionId,
      reportNo: 10,
      reportDate: '2026-04-05',
    });
    expect(json.data).toMatchObject({ reportNo: 10, reportDate: '2026-04-05' });
    ids.push(json.data.id);
    const next = await call('POST', `/wells/${wellId}/reports`, { sectionId });
    expect(next.json.data).toMatchObject({ reportNo: 11, reportDate: '2026-04-06' });
    ids.push(next.json.data.id);
  });

  it('refuses a date that already has a report (REPORT_DATE_TAKEN) and a taken number (409)', async () => {
    const date = await call('POST', `/wells/${wellId}/reports`, {
      sectionId,
      reportDate: '2026-03-31',
    });
    expect(date.status).toBe(422);
    expect(date.json.error.code).toBe('REPORT_DATE_TAKEN');
    const number = await call('POST', `/wells/${wellId}/reports`, {
      sectionId,
      reportNo: 1,
      reportDate: '2026-06-01',
    });
    expect(number.status).toBe(409);
  });

  it('lists newest first, paged', async () => {
    const { status, json } = await call('GET', `/wells/${wellId}/reports?pageSize=2`);
    expect(status).toBe(200);
    expect(json.data.map((r: { reportNo: number }) => r.reportNo)).toEqual([11, 10]);
    expect(json.meta).toEqual({ page: 1, pageSize: 2, total: 5 });
    const detail = await call('GET', `/reports/${ids[0]}`);
    expect(detail.json.data.reportNo).toBe(1);
  });

  it('needs a report date when the well has no spud date, and a section of the same well', async () => {
    const bare = await newWell('No spud');
    const bareSection = await newSection(bare);
    const noDate = await call('POST', `/wells/${bare}/reports`, { sectionId: bareSection });
    expect(noDate.status).toBe(422);
    expect(noDate.json.error.details[0].path).toBe('body.reportDate');
    const wrong = await call('POST', `/wells/${bare}/reports`, {
      sectionId,
      reportDate: '2026-01-01',
    });
    expect(wrong.status).toBe(422);
    expect(wrong.json.error.details[0].path).toBe('body.sectionId');
  });

  it('deletes only the newest draft', async () => {
    const old = await call('DELETE', `/reports/${ids[0]}`);
    expect(old.status).toBe(422);
    expect(old.json.error.code).toBe('REPORT_NOT_LATEST');
    const newest = ids[ids.length - 1] as string;
    expect((await call('DELETE', `/reports/${newest}`)).status).toBe(204);
    expect((await call('GET', `/reports/${newest}`)).status).toBe(404);

    const afterDelete = await call('POST', `/wells/${wellId}/reports`, { sectionId });
    expect(afterDelete.json.data.reportNo).toBe(11);
  });

  it('refuses to delete a submitted report', async () => {
    const latest = (await call('GET', `/wells/${wellId}/reports?pageSize=1`)).json.data[0];
    await testDb.db.execute(
      (await import('drizzle-orm'))
        .sql`update daily_reports set status = 'submitted' where id = ${latest.id}`,
    );
    const { status } = await call('DELETE', `/reports/${latest.id}`);
    expect(status).toBe(409);
  });

  it('updates the header at the revision read and stores depths in metres', async () => {
    const a = (
      await call('POST', `/wells/${wellId}/reports`, { sectionId, reportDate: '2027-01-01' })
    ).json.data;
    const b = (await call('POST', `/wells/${wellId}/reports`, { sectionId })).json.data;
    expect(b.dailyDrilled).toBeNull();

    const first = await call('PATCH', `/reports/${a.id}`, { revision: a.revision, td: 2500.5 });
    expect(first.status).toBe(200);
    expect(first.json.data).toMatchObject({ td: 2500.5, revision: 2, dailyDrilled: null });
    const second = await call('PATCH', `/reports/${b.id}`, {
      revision: b.revision,
      td: 2650.5,
      bitDepth: 2648,
      tvd: 2400,
      representatives: ['Rep A', 'Rep B'],
      engineers: ['Eng 1'],
      drillingRemarks: 'Drilled ahead',
      formation: 'Asmari',
    });
    expect(second.json.data).toMatchObject({
      td: 2650.5,
      bitDepth: 2648,
      dailyDrilled: 150,
      representatives: ['Rep A', 'Rep B'],
      formation: 'Asmari',
    });
    const stored = await testDb.db.execute<{ td: number }>(
      sql`select td from daily_reports where id = ${b.id}`,
    );
    expect(stored.rows[0]?.td).toBe(2650.5);
    const listed = await call('GET', `/wells/${wellId}/reports?pageSize=1`);
    expect(listed.json.data[0].dailyDrilled).toBe(150);
  });

  it('refuses a stale revision (409 REVISION_MISMATCH)', async () => {
    const latest = (await call('GET', `/wells/${wellId}/reports?pageSize=1`)).json.data[0];
    const stale = await call('PATCH', `/reports/${latest.id}`, {
      revision: latest.revision - 1,
      formation: 'Gachsaran',
    });
    expect(stale.status).toBe(409);
    expect(stale.json.error.code).toBe('REVISION_MISMATCH');
    expect((await call('GET', `/reports/${latest.id}`)).json.data.formation).toBe('Asmari');
  });

  it('validates the update body and the section of the well', async () => {
    const latest = (await call('GET', `/wells/${wellId}/reports?pageSize=1`)).json.data[0];
    const none = await call('PATCH', `/reports/${latest.id}`, { revision: latest.revision });
    expect(none.status).toBe(422);
    const negative = await call('PATCH', `/reports/${latest.id}`, {
      revision: latest.revision,
      td: -1,
    });
    expect(negative.status).toBe(422);
    const other = await newSection(await newWell('Other well'));
    const wrong = await call('PATCH', `/reports/${latest.id}`, {
      revision: latest.revision,
      sectionId: other,
    });
    expect(wrong.json.error.details[0].path).toBe('body.sectionId');
  });

  describe('submit', () => {
    let target: { id: string; revision: number };
    let activityId: string;

    beforeAll(async () => {
      const created = await call('POST', `/wells/${wellId}/reports`, { sectionId });
      target = created.json.data;
      expect(created.json.warnings[0].code).toBe('ACTIVITY_HOURS_NOT_24');
      const inserted = await testDb.db.execute<{ id: string }>(
        sql`insert into activities (name, sort_order) values ('Drilling', 1) returning id`,
      );
      activityId = inserted.rows[0]?.id as string;
    });

    it('refuses open warnings without the flag (WARNINGS_NOT_ACKNOWLEDGED)', async () => {
      const { status, json } = await call('POST', `/reports/${target.id}/submit`, {
        revision: target.revision,
      });
      expect(status).toBe(422);
      expect(json.error.code).toBe('WARNINGS_NOT_ACKNOWLEDGED');
      expect(json.error.details.warnings[0].code).toBe('ACTIVITY_HOURS_NOT_24');
      expect((await call('GET', `/reports/${target.id}`)).json.data.status).toBe('draft');
    });

    it('refuses a stale revision', async () => {
      const { status, json } = await call('POST', `/reports/${target.id}/submit`, {
        revision: 99,
        acknowledgeWarnings: true,
      });
      expect(status).toBe(409);
      expect(json.error.code).toBe('REVISION_MISMATCH');
    });

    it('submits with the flag and stores the acknowledged codes', async () => {
      const { status, json } = await call('POST', `/reports/${target.id}/submit`, {
        revision: target.revision,
        acknowledgeWarnings: true,
      });
      expect(status).toBe(200);
      expect(json.data).toMatchObject({
        status: 'submitted',
        revision: target.revision + 1,
        acknowledgedWarnings: ['ACTIVITY_HOURS_NOT_24'],
      });
      expect(json.data.submittedAt).toBeString();
      target = json.data;
      expect(json.data.editedAfterSubmit).toBe(false);
      const detail = await call('GET', `/reports/${target.id}`);
      expect(detail.json.warnings[0].code).toBe('ACTIVITY_HOURS_NOT_24');
      const events = logLines.filter((line) => typeof line.event === 'string');
      expect(events.map((line) => line.event)).toContain('report.submitted');
      const acknowledged = events.find((line) => line.event === 'report.warnings_acknowledged');
      expect(acknowledged?.warningCodes).toEqual(['ACTIVITY_HOURS_NOT_24']);
      expect(
        (await call('POST', `/reports/${target.id}/submit`, { revision: target.revision })).status,
      ).toBe(409);
    });

    it('lets a submitted report be patched, raising the revision, and logs it', async () => {
      const { status, json } = await call('PATCH', `/reports/${target.id}`, {
        revision: target.revision,
        formation: 'Gachsaran',
      });
      expect(status).toBe(200);
      expect(json.data).toMatchObject({ status: 'submitted', revision: target.revision + 1 });
      expect(json.data.editedAfterSubmit).toBe(true);
      expect(logLines.some((line) => line.event === 'report.edited_after_submit')).toBe(true);
    });

    it('submits without a flag once nothing is open', async () => {
      const next = (await call('POST', `/wells/${wellId}/reports`, { sectionId })).json.data;
      await call('PUT', `/reports/${next.id}/activities`, {
        activities: [{ activityId, hours: 24 }],
      });
      const { status, json } = await call('POST', `/reports/${next.id}/submit`, {
        revision: next.revision,
      });
      expect(status).toBe(200);
      expect(json.data.acknowledgedWarnings).toEqual([]);
    });
  });

  it('answers 404 for an unknown well or report', async () => {
    const missing = crypto.randomUUID();
    expect((await call('GET', `/wells/${missing}/reports`)).status).toBe(404);
    expect((await call('GET', `/reports/${missing}`)).status).toBe(404);
  });
});
