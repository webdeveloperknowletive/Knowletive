// ============================================================
// Knowletive Role-Based Weighted Keyword Matching Engine
// Deterministic Matching, Weighting & Role Assignment
// (Labeled as "Keyword Match Score", NOT "AI Score")
// ============================================================

import type { JobRole, RoleKeyword, MatchResult, ResumeKeywordMatch } from './types';

/**
 * Matches normalized resume text against a role's weighted keywords
 */
export function calculateRoleMatch(
  resumeText: string,
  role: JobRole,
  keywords: RoleKeyword[]
): MatchResult {
  const normalizedText = resumeText.toLowerCase();

  let earnedWeight = 0;
  let totalWeight = 0;
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const kw of keywords) {
    totalWeight += kw.weight;
    const cleanKw = kw.keyword.trim().toLowerCase();

    // Word boundary or multi-word match
    const escaped = cleanKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, 'i');

    if (regex.test(normalizedText)) {
      earnedWeight += kw.weight;
      matchedKeywords.push(kw.keyword);
    } else {
      missingKeywords.push(kw.keyword);
    }
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  return {
    role,
    score,
    matchedKeywords,
    missingKeywords,
    totalKeywords: keywords.length
  };
}

/**
 * Evaluates candidate text against all available active roles
 * Returns ranked match results and automatic role assignment
 */
export function evaluateAllRoles(
  resumeText: string,
  roles: JobRole[],
  allKeywords: RoleKeyword[],
  preferredRoleId?: string
): {
  topRole: JobRole | null;
  topScore: number;
  assignedRoleStatus: 'Assigned' | 'Needs Review';
  results: MatchResult[];
  keywordMatchesToPersist: Array<Omit<ResumeKeywordMatch, 'id' | 'candidate_id' | 'created_at'>>;
} {
  const results: MatchResult[] = [];
  const keywordMatchesToPersist: Array<Omit<ResumeKeywordMatch, 'id' | 'candidate_id' | 'created_at'>> = [];

  for (const role of roles) {
    const roleKws = allKeywords.filter(k => k.job_role_id === role.id && k.is_active);
    if (!roleKws.length) continue;

    const res = calculateRoleMatch(resumeText, role, roleKws);
    results.push(res);

    // Record for persistence
    for (const kw of roleKws) {
      keywordMatchesToPersist.push({
        job_role_id: role.id,
        keyword: kw.keyword,
        matched: res.matchedKeywords.includes(kw.keyword),
        weight: kw.weight
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // If candidate applied for a specific role, evaluate that role's score
  let targetResult = results[0] || null;
  if (preferredRoleId) {
    const appliedMatch = results.find(r => r.role.id === preferredRoleId);
    if (appliedMatch && appliedMatch.score >= (appliedMatch.role.match_threshold || 40)) {
      targetResult = appliedMatch;
    }
  }

  const topRole = targetResult ? targetResult.role : null;
  const topScore = targetResult ? targetResult.score : 0;
  const threshold = topRole ? (topRole.match_threshold || 40) : 40;

  const assignedRoleStatus: 'Assigned' | 'Needs Review' = 
    topScore >= threshold && topRole ? 'Assigned' : 'Needs Review';

  return {
    topRole,
    topScore,
    assignedRoleStatus,
    results,
    keywordMatchesToPersist
  };
}
