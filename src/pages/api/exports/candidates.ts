// ============================================================
// GET /api/exports/candidates
// Exports Candidates to multi-sheet Resume_Candidates.xlsx or CSV
// ============================================================

import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { generateCandidatesExcel, exportCandidatesToCsv } from '../../../lib/excel';

export const GET: APIRoute = async ({ url }) => {
  const format = url.searchParams.get('format') || 'xlsx';
  const roleId = url.searchParams.get('roleId') || undefined;
  const status = url.searchParams.get('status') || undefined;

  const [candidates, roles] = await Promise.all([
    db.getCandidates({ roleId, status }),
    db.getJobRoles(false)
  ]);

  if (format === 'csv') {
    const csvData = exportCandidatesToCsv(candidates, roles);
    return new Response(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="Resume_Candidates.csv"'
      }
    });
  }

  const excelBuffer = generateCandidatesExcel(candidates, roles);
  return new Response(excelBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Resume_Candidates.xlsx"'
    }
  });
};
