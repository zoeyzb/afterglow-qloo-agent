export type SignalAdditionStatus = 'empty' | 'full' | 'duplicate' | 'ready';
export interface SignalAdditionInput<Domain extends string = string> { id: string; domain: Domain; name: string }
export interface SignalAdditionResult<Domain extends string = string> {
  status: SignalAdditionStatus;
  name: string;
  signals: SignalAdditionInput<Domain>[];
}
export function prepareSignalAddition<Domain extends string>(
  signals: SignalAdditionInput<Domain>[],
  text: string,
  domain: Domain,
  maxSignals?: number,
  createId?: () => string
): SignalAdditionResult<Domain>;
export interface AtlasSubmissionInput<Domain extends string, Orbit extends string> {
  signals: SignalAdditionInput<Domain>[];
  text: string;
  domain: Domain;
  lenses: Domain[];
  orbit: Orbit;
  minSignals?: number;
  maxSignals?: number;
  createId?: () => string;
}
export interface AtlasSubmissionResult<Domain extends string, Orbit extends string> {
  status: 'ready' | 'full' | 'duplicate' | 'minimum' | 'no_lenses';
  signals: SignalAdditionInput<Domain>[];
  added: boolean;
  request?: { signals: { domain: Domain; name: string }[]; lenses: Domain[]; orbit: Orbit };
}
export function prepareAtlasSubmission<Domain extends string, Orbit extends string>(
  input: AtlasSubmissionInput<Domain, Orbit>
): AtlasSubmissionResult<Domain, Orbit>;
