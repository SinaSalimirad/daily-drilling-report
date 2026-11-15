'use client';

import { MAX_SURVEY_STATIONS, type Survey, surveyPutSchema } from '@ddr/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Quantity } from '@/components/Quantity';
import { QuantityInput } from '@/components/QuantityInput';
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
import { api } from '@/lib/api';
import { ApiError, unwrap } from '@/lib/api-error';
import { toastError } from '@/lib/form-errors';

type Row = { key: string; md: number | null; inc: string; azi: string };

function useSurvey(wellId: string) {
  return useQuery({
    queryKey: ['survey', wellId] as const,
    enabled: wellId !== '',
    queryFn: async () => (await unwrap(api.v1.wells({ wellId }).survey.get())).data,
  });
}

function useReplaceSurvey(wellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof surveyPutSchema.parse>[0]) =>
      (await unwrap(api.v1.wells({ wellId }).survey.put(input as never))).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['survey'] }),
  });
}

const rowsOf = (survey: Survey): Row[] =>
  survey.stations.map((s) => ({
    key: s.id,
    md: s.measuredDepth,
    inc: String(s.inclination),
    azi: String(s.azimuth),
  }));

/** Directional survey of the well (workbook `Incl`): MD, inclination, azimuth, and the TVD it gives. */
export function SurveyTable({ wellId }: { wellId: string }) {
  const survey = useSurvey(wellId);
  if (survey.isPending) return <Loading what="Loading the survey" />;
  if (survey.isError) return <QueryError error={survey.error} />;
  return (
    <SurveyEditor
      key={survey.data.stations.map((s) => s.id).join()}
      wellId={wellId}
      survey={survey.data}
    />
  );
}

function SurveyEditor({ wellId, survey }: { wellId: string; survey: Survey }) {
  const replace = useReplaceSurvey(wellId);
  const [rows, setRows] = useState<Row[]>(() => rowsOf(survey));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const save = async () => {
    const parsed = surveyPutSchema.safeParse({
      stations: rows.map((r) => ({
        measuredDepth: r.md ?? Number.NaN,
        inclination: Number(r.inc.replace(',', '.')),
        azimuth: Number(r.azi.replace(',', '.')),
      })),
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check the survey');
    setSaving(true);
    try {
      await replace.mutateAsync(parsed.data);
      setError(null);
      toast.success('Survey saved');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'SURVEY_DEPTH_NOT_INCREASING') setError(e.message);
      else toastError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>MD</TableHead>
            <TableHead>Inclination (°)</TableHead>
            <TableHead>Azimuth (°)</TableHead>
            <TableHead className="text-right">TVD</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.key}>
              <TableCell>
                <QuantityInput
                  aria-label={`MD ${index + 1}`}
                  quantity="depth"
                  value={row.md}
                  onChange={(si) => update(index, { md: si })}
                />
              </TableCell>
              <TableCell>
                <Input
                  aria-label={`Inclination ${index + 1}`}
                  inputMode="decimal"
                  value={row.inc}
                  onChange={(e) => update(index, { inc: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Input
                  aria-label={`Azimuth ${index + 1}`}
                  inputMode="decimal"
                  value={row.azi}
                  onChange={(e) => update(index, { azi: e.target.value })}
                />
              </TableCell>
              <TableCell className="text-right">
                <Quantity quantity="depth" si={survey.stations[index]?.tvd} />
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRows((c) => c.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {error ? (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={rows.length >= MAX_SURVEY_STATIONS}
          onClick={() =>
            setRows((c) => [...c, { key: crypto.randomUUID(), md: null, inc: '0', azi: '0' }])
          }
        >
          Add station
        </Button>
        <Button type="button" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save survey'}
        </Button>
      </div>
    </div>
  );
}
