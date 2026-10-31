export const ORDER = { high: 0, medium: 1, low: 2 }

export const SEVERITY_META = {
  high: {
    label: 'High',
    border: '#e5484d',
    bg: 'rgba(229, 72, 77, 0.08)',
    badge: '#e5484d',
    text: '#fca5a5',
  },
  medium: {
    label: 'Medium',
    border: '#f5a623',
    bg: 'rgba(245, 166, 35, 0.08)',
    badge: '#f5a623',
    text: '#fcd34d',
  },
  low: {
    label: 'Low',
    border: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.08)',
    badge: '#3b82f6',
    text: '#93c5fd',
  },
}

export const TYPE_LABEL = {
  logic: 'logic',
  security: 'security',
  convention: 'convention',
  'over-engineering': 'over-engineering',
  'missing-flow': 'missing flow',
}

export function sortIssues(issues) {
  return [...issues].sort((a, b) => {
    const sa = ORDER[a.severity] ?? 3
    const sb = ORDER[b.severity] ?? 3
    if (sa !== sb) return sa - sb
    return a.line - b.line
  })
}

export function countBySeverity(issues) {
  return {
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
  }
}

export function calculateScore(issues) {
  let score = 100
  issues.forEach(issue => {
    if (issue.severity === 'high') score -= 20
    if (issue.severity === 'medium') score -= 10
    if (issue.severity === 'low') score -= 2
  })
  return Math.max(0, score)
}