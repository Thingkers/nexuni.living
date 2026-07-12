import type { CleanlinessLevel, GuestPreference, RoommateProfile } from '@/features/roommates/types'

// Weights per docs/feature-breakdown.md §4.2 — sum to 1. preferred_gender is
// intentionally NOT part of this formula: it's a hard filter (excluded from
// the candidate list entirely), never a scored component, matching a
// roommate dealbreaker rather than a preference.
const WEIGHTS = {
  locality: 0.30,
  budget: 0.25,
  habits: 0.25,
  university: 0.20,
}

// A profile satisfies another's university preference when that preference
// is unset (no constraint = full credit) or matches exactly.
function universityScore(a: RoommateProfile, b: RoommateProfile): number {
  const aSatisfiesB = b.preferred_university_id == null || a.university_id === b.preferred_university_id
  const bSatisfiesA = a.preferred_university_id == null || b.university_id === a.preferred_university_id
  return ((aSatisfiesB ? 1 : 0) + (bSatisfiesA ? 1 : 0)) / 2
}

// Exact-match only for v1 — the schema has no preferred_locality_id
// (unlike university), read as intentional: "where I want to live" is one
// concept for a roommate search, not two. Haversine partial credit using
// localities.lat/lng is a documented possible v2, not built now.
function localityScore(a: RoommateProfile, b: RoommateProfile): number {
  if (a.locality_id == null || b.locality_id == null) return 0
  return a.locality_id === b.locality_id ? 1 : 0
}

// Continuous range-overlap-over-union, not binary — budget is inherently a
// range, not a category.
function budgetScore(a: RoommateProfile, b: RoommateProfile): number {
  if (a.budget_min == null || a.budget_max == null || b.budget_min == null || b.budget_max == null) return 0
  const overlap = Math.max(0, Math.min(a.budget_max, b.budget_max) - Math.max(a.budget_min, b.budget_min))
  const union = Math.max(a.budget_max, b.budget_max) - Math.min(a.budget_min, b.budget_min)
  return union === 0 ? 1 : overlap / union
}

const CLEANLINESS_ORDER: Record<CleanlinessLevel, number> = { relaxed: 0, moderate: 1, very_clean: 2 }
const GUEST_ORDER: Record<GuestPreference, number> = { rarely: 0, sometimes: 1, often: 2 }

function ordinalScore(a: number, b: number, maxDistance: number): number {
  return 1 - Math.abs(a - b) / maxDistance
}

// Average of the 4 habit sub-scores, nulls excluded from the average
// (shouldn't occur in practice — the wizard requires these before a
// profile can go 'active').
function habitsScore(a: RoommateProfile, b: RoommateProfile): number {
  const scores: number[] = []

  if (a.cleanliness_level && b.cleanliness_level) {
    scores.push(ordinalScore(CLEANLINESS_ORDER[a.cleanliness_level], CLEANLINESS_ORDER[b.cleanliness_level], 2))
  }
  if (a.guest_preference && b.guest_preference) {
    scores.push(ordinalScore(GUEST_ORDER[a.guest_preference], GUEST_ORDER[b.guest_preference], 2))
  }
  if (a.sleep_schedule && b.sleep_schedule) {
    const eitherFlexible = a.sleep_schedule === 'flexible' || b.sleep_schedule === 'flexible'
    scores.push(eitherFlexible || a.sleep_schedule === b.sleep_schedule ? 1 : 0)
  }
  // Exact-match only, no partial credit — arguably deserves hard-filter
  // treatment like gender, but kept as a scored habit per the spec's
  // explicit "habits 25%" bundling.
  if (a.smoking_preference && b.smoking_preference) {
    scores.push(a.smoking_preference === b.smoking_preference ? 1 : 0)
  }

  if (scores.length === 0) return 0
  return scores.reduce((sum, s) => sum + s, 0) / scores.length
}

// Returns a 0-100 compatibility percentage between two roommate profiles.
// Computed client-side (not a Postgres function/RPC) — appropriate given
// this platform's current profile volume (a few dozen seeded universities
// in one metro area), matching the project's own "don't over-engineer
// prematurely" guidance. Revisit server-side scoring only if volume grows
// past hundreds-to-low-thousands of active profiles.
export function computeMatchScore(a: RoommateProfile, b: RoommateProfile): number {
  const score =
    WEIGHTS.locality * localityScore(a, b) +
    WEIGHTS.budget * budgetScore(a, b) +
    WEIGHTS.habits * habitsScore(a, b) +
    WEIGHTS.university * universityScore(a, b)

  return Math.round(score * 100)
}

// Hard filter, not a scored component — excludes profiles that don't meet
// a stated gender preference in either direction, rather than scoring them
// low. 'any' (or an unset preference) imposes no constraint.
export function passesGenderFilter(a: RoommateProfile, b: RoommateProfile): boolean {
  const aAcceptsB = !a.preferred_gender || a.preferred_gender === 'any' || a.preferred_gender === b.gender
  const bAcceptsA = !b.preferred_gender || b.preferred_gender === 'any' || b.preferred_gender === a.gender
  return aAcceptsB && bAcceptsA
}
