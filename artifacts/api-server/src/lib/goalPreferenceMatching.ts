import {
  evaluateCandidateMatch,
  type ProfileContext,
  type CandidateMatchData,
  type MatchResult,
  type MatchSignal,
  type MatchReason,
  type MatchReasonCode,
  type MatchSignalType,
} from "@workspace/api-zod";

/**
 * Re-export the core evaluator and types for use by backend services,
 * future recommendation pipelines, and domain matchers.
 */
export {
  evaluateCandidateMatch,
  type ProfileContext,
  type CandidateMatchData,
  type MatchResult,
  type MatchSignal,
  type MatchReason,
  type MatchReasonCode,
  type MatchSignalType,
};

/**
 * Batch evaluator for matching multiple candidate items against a single user ProfileContext.
 * Deterministic and non-mutating.
 */
export function evaluateCandidatesMatch(
  profile: ProfileContext,
  candidates: CandidateMatchData[]
): MatchResult[] {
  return candidates.map((candidate) => evaluateCandidateMatch(profile, candidate));
}
