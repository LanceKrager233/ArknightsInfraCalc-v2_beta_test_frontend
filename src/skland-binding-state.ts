export type SklandBindingState = "active" | "reauthorize" | "unbound";

export function deriveSklandBindingState(bindingCount: number, credentialCount: number): SklandBindingState {
  if (credentialCount > 0) return "active";
  if (bindingCount > 0) return "reauthorize";
  return "unbound";
}
