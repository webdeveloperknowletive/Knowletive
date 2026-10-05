// ============================================================
// GET /api/exports/leads
// Exports Leads to multi-sheet Knowletive_Leads.xlsx or CSV
// ============================================================

import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { generateLeadsExcel, exportLeadsToCsv } from '../../../lib/excel';

export const GET: APIRoute = async ({ url }) => {
  const format = url.searchParams.get('format') || 'xlsx';
  const leadType = url.searchParams.get('leadType') || undefined;
  const status = url.searchParams.get('status') || undefined;

  const leads = await db.getLeads({ leadType, status });

  if (format === 'csv') {
    const csvData = exportLeadsToCsv(leads);
    return new Response(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="Knowletive_Leads.csv"'
      }
    });
  }

  const excelBuffer = generateLeadsExcel(leads);
  return new Response(excelBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Knowletive_Leads.xlsx"'
    }
  });
};
