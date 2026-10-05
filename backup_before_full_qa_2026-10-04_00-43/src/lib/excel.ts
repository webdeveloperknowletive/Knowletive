// ============================================================
// Knowletive Multi-Sheet Excel & CSV Export Generator
// Produces Resume_Candidates.xlsx & Knowletive_Leads.xlsx
// ============================================================

import * as XLSX from 'xlsx';
import type { Candidate, Lead, JobRole } from './types';

/**
 * Generate multi-sheet Resume_Candidates.xlsx workbook buffer
 */
export function generateCandidatesExcel(candidates: Candidate[], roles: JobRole[]): Buffer {
  const wb = XLSX.utils.book_new();
  const roleMap = new Map(roles.map(r => [r.id, r.role_name]));

  const formatRows = (list: Candidate[]) => {
    return list.map((c, idx) => ({
      'Sr No': idx + 1,
      'Name': c.full_name,
      'Email': c.email,
      'Phone': c.phone,
      'Education': c.degree || c.education || 'N/A',
      'College': c.college || 'N/A',
      'Experience': c.years_experience !== undefined ? `${c.years_experience} Yrs` : 'Fresher',
      'Applied Role': (c.applied_role_id && roleMap.get(c.applied_role_id)) || c.preferred_role || 'Not Specified',
      'Matched Role': (c.assigned_role_id && roleMap.get(c.assigned_role_id)) || 'Needs Review',
      'Match %': `${c.match_score || 0}%`,
      'Matched Keywords': Array.isArray(c.resume_keywords) ? c.resume_keywords.join(', ') : '',
      'Skills': Array.isArray(c.skills) ? c.skills.join(', ') : '',
      'GitHub': c.github_url || '',
      'LinkedIn': c.linkedin_url || '',
      'Application Date': new Date(c.created_at).toLocaleDateString('en-IN'),
      'Status': c.status
    }));
  };

  // 1. All Candidates sheet
  const allRows = formatRows(candidates);
  const wsAll = XLSX.utils.json_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, wsAll, 'All Candidates');

  // Role Sheets
  const roleSheetNames = [
    { title: 'Data Analyst', match: 'analyst' },
    { title: 'Data Scientist', match: 'scientist' },
    { title: 'MERN Developer', match: 'mern' },
    { title: 'Java Developer', match: 'java' },
    { title: 'Cloud DevOps', match: 'cloud' },
    { title: 'Digital Marketing', match: 'marketing' },
    { title: 'Banking', match: 'banking' }
  ];

  for (const item of roleSheetNames) {
    const subset = candidates.filter(c => {
      const roleName = ((c.assigned_role_id && roleMap.get(c.assigned_role_id)) || '').toLowerCase();
      return roleName.includes(item.match);
    });
    const ws = XLSX.utils.json_to_sheet(formatRows(subset));
    XLSX.utils.book_append_sheet(wb, ws, item.title);
  }

  // Needs Review Sheet
  const needsReview = candidates.filter(c => c.status === 'Needs Review' || !c.assigned_role_id);
  const wsReview = XLSX.utils.json_to_sheet(formatRows(needsReview));
  XLSX.utils.book_append_sheet(wb, wsReview, 'Needs Review');

  // Other Sheet
  const otherSubset = candidates.filter(c => {
    const roleName = ((c.assigned_role_id && roleMap.get(c.assigned_role_id)) || '').toLowerCase();
    const isStandard = roleSheetNames.some(r => roleName.includes(r.match));
    return !isStandard && c.status !== 'Needs Review';
  });
  const wsOther = XLSX.utils.json_to_sheet(formatRows(otherSubset));
  XLSX.utils.book_append_sheet(wb, wsOther, 'Other');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Generate multi-sheet Knowletive_Leads.xlsx workbook buffer
 */
export function generateLeadsExcel(leads: Lead[]): Buffer {
  const wb = XLSX.utils.book_new();

  const formatRows = (list: Lead[]) => {
    return list.map((l, idx) => ({
      'Sr No': idx + 1,
      'Name': `${l.first_name} ${l.last_name}`.trim(),
      'Phone': l.phone,
      'Email': l.email,
      'Lead Type': l.lead_type,
      'Education': l.degree || l.education || 'N/A',
      'College': l.college || 'N/A',
      'Courses Completed': l.courses_completed || 'N/A',
      'Opportunity Looking For': l.opportunity_type || 'N/A',
      'Interested Course': l.course_interest || l.service_interest || 'N/A',
      'Preferred Role': l.preferred_role || 'N/A',
      'Preferred Location': l.preferred_location || 'N/A',
      'Message': l.message || '',
      'Lead Status': l.status,
      'Date': new Date(l.created_at).toLocaleDateString('en-IN')
    }));
  };

  // 1. All Leads
  const wsAll = XLSX.utils.json_to_sheet(formatRows(leads));
  XLSX.utils.book_append_sheet(wb, wsAll, 'All Leads');

  // Categorized Sheets
  const categories = [
    { title: 'Course Leads', filter: (l: Lead) => l.lead_type === 'Course' },
    { title: 'Counseling', filter: (l: Lead) => l.lead_type === 'Counseling' },
    { title: 'Admission', filter: (l: Lead) => l.lead_type === 'Admission' },
    { title: 'Overseas', filter: (l: Lead) => l.lead_type === 'Overseas Education' },
    { title: 'Jobs', filter: (l: Lead) => l.lead_type === 'Job' },
    { title: 'Internships', filter: (l: Lead) => l.lead_type === 'Internship' },
    { title: 'eBook Leads', filter: (l: Lead) => l.lead_type === 'eBook' },
    { title: 'Other', filter: (l: Lead) => l.lead_type === 'Contact' || l.lead_type === 'Other' }
  ];

  for (const cat of categories) {
    const subset = leads.filter(cat.filter);
    const ws = XLSX.utils.json_to_sheet(formatRows(subset));
    XLSX.utils.book_append_sheet(wb, ws, cat.title);
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Export Candidates to CSV
 */
export function exportCandidatesToCsv(candidates: Candidate[], roles: JobRole[]): string {
  const roleMap = new Map(roles.map(r => [r.id, r.role_name]));
  const rows = candidates.map((c, idx) => ({
    'Sr No': idx + 1,
    'Name': c.full_name,
    'Email': c.email,
    'Phone': c.phone,
    'Education': c.degree || c.education || 'N/A',
    'College': c.college || 'N/A',
    'Experience': c.years_experience !== undefined ? `${c.years_experience} Yrs` : 'Fresher',
    'Applied Role': (c.applied_role_id && roleMap.get(c.applied_role_id)) || c.preferred_role || 'Not Specified',
    'Matched Role': (c.assigned_role_id && roleMap.get(c.assigned_role_id)) || 'Needs Review',
    'Match %': `${c.match_score || 0}%`,
    'Matched Keywords': Array.isArray(c.resume_keywords) ? c.resume_keywords.join('; ') : '',
    'Skills': Array.isArray(c.skills) ? c.skills.join('; ') : '',
    'GitHub': c.github_url || '',
    'LinkedIn': c.linkedin_url || '',
    'Application Date': new Date(c.created_at).toLocaleDateString('en-IN'),
    'Status': c.status
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  return XLSX.utils.sheet_to_csv(ws);
}

/**
 * Export Leads to CSV
 */
export function exportLeadsToCsv(leads: Lead[]): string {
  const rows = leads.map((l, idx) => ({
    'Sr No': idx + 1,
    'Name': `${l.first_name} ${l.last_name}`.trim(),
    'Phone': l.phone,
    'Email': l.email,
    'Lead Type': l.lead_type,
    'Education': l.degree || l.education || 'N/A',
    'College': l.college || 'N/A',
    'Courses Completed': l.courses_completed || 'N/A',
    'Opportunity Looking For': l.opportunity_type || 'N/A',
    'Interested Course': l.course_interest || l.service_interest || 'N/A',
    'Preferred Role': l.preferred_role || 'N/A',
    'Preferred Location': l.preferred_location || 'N/A',
    'Message': l.message || '',
    'Lead Status': l.status,
    'Date': new Date(l.created_at).toLocaleDateString('en-IN')
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  return XLSX.utils.sheet_to_csv(ws);
}
