// Problems inside one merged ticket. The desk's cause is parser or hint.
// One-day reports stay in that cause, the way the exported table files them,
// and they are also listed on their own. The desk footnotes them. It does not subtract them.

import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type ProblemName = Cause | 'one-day' | 'unplaced';

export type ProblemRow = {
  problem: ProblemName;
  reports: Report[];
  taggedAs: Record<string, number>;
  tenants: number;
  firstSeen: string;
  lastSeen: string;
};

const ORDER: readonly ProblemName[] = ['parser', 'hint', 'one-day', 'unplaced'];

function row(problem: ProblemName, reports: Report[]): ProblemRow {
  const days = reports.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports,
    taggedAs: reports.reduce<Record<string, number>>(
      (n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }),
      {},
    ),
    tenants: new Set(reports.map((r) => r.tenant)).size,
    firstSeen: days[0] ?? '',
    lastSeen: days[days.length - 1] ?? '',
  };
}

export function problemsFor(
  reports: Report[],
  oneDayMove: readonly string[],
  tenantOf: (r: Report) => Tenant | undefined,
  ticket: number,
): ProblemRow[] {
  const moved = new Set(oneDayMove);
  const merged = uniqueById(reports).filter((item) => item.mergedInto === ticket);
  const buckets = new Map<ProblemName, Report[]>();
  for (const r of merged) {
    const problem: ProblemName = causeOf(r, tenantOf(r)) ?? 'unplaced';
    buckets.set(problem, [...(buckets.get(problem) ?? []), r]);
  }
  const oneDay = merged.filter((r) => moved.has(r.id));
  if (oneDay.length > 0) buckets.set('one-day', oneDay);
  return ORDER.filter((problem) => (buckets.get(problem)?.length ?? 0) > 0).map((problem) =>
    row(problem, buckets.get(problem) ?? []),
  );
}
