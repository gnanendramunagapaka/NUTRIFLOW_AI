import {
  evaluateCandidateEligibility,
  type ProfileContext,
  type CandidateSafetyData,
  type EligibilityResult,
  type EligibilityStatus,
  type EligibilityReason,
  type EligibilityReasonCode,
} from "@workspace/api-zod";

/**
 * Re-export the core evaluator and types for use by backend services,
 * future recommendation pipelines, and domain filters.
 */
export {
  evaluateCandidateEligibility,
  type ProfileContext,
  type CandidateSafetyData,
  type EligibilityResult,
  type EligibilityStatus,
  type EligibilityReason,
  type EligibilityReasonCode,
};

/**
 * Batch evaluator for multiple candidate items against a single user ProfileContext.
 * Deterministic and non-mutating.
 */
export function evaluateCandidatesSafety(
  profile: ProfileContext,
  candidates: CandidateSafetyData[]
): EligibilityResult[] {
  return candidates.map((candidate) => evaluateCandidateEligibility(profile, candidate));
}
