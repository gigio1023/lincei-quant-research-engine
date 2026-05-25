export type UniverseInstrumentStatus =
  | 'active'
  | 'benchmark'
  | 'watchlist'
  | 'tactical_disabled'
  | 'hard_excluded';

export type UniverseInstrument = {
  symbol: string;
  assetType?: 'equity' | 'etf';
  status: UniverseInstrumentStatus;
  sleeve?: string;
  tier?: string;
  maxPositionPct?: number;
  startDate?: string;
  requiresAllowLeveragedEtf?: boolean;
  rationale?: string;
  exclusionReason?: string;
  sourceRefs?: string[];
};

export type UniverseProfile = {
  name: string;
  description?: string;
  extends?: string;
  activeSymbols?: string[];
  benchmarkSymbols?: string[];
  watchlistSymbols?: string[];
  activeAdd?: string[];
  minimumStartDate?: string;
  requiresAllowLeveragedEtf?: boolean;
};

export type UniverseManifest = {
  schemaVersion: string;
  id: string;
  status: string;
  asOf: string;
  defaultProfile: string;
  rules?: {
    defaultAllowLeveragedEtf?: boolean;
    debugOverrideAllowedStatuses?: UniverseInstrumentStatus[];
  };
  sleeveCaps: Record<string, number>;
  profiles: UniverseProfile[];
  instruments: UniverseInstrument[];
  sourceRefs?: string[];
};

export type UniverseSelectionReport = {
  manifestId: string;
  manifestPath: string;
  profile: string;
  asOf: string;
  generatedAt: string;
  activeSymbols: string[];
  benchmarkSymbols: string[];
  watchlistSymbols: string[];
  hardExcludedSymbols: string[];
  tacticalDisabledSymbols: string[];
  symbolCaps: Record<string, number>;
  sleeveBySymbol: Record<string, string>;
  sleeveCaps: Record<string, number>;
  etfSymbols: string[];
  minimumStartDate?: string;
  allowLeveragedEtf: boolean;
  overrideSymbols?: string[];
  taxContext: {
    operatorTaxResidence: 'KR';
    listedMarket: 'US';
    notes: string[];
  };
};

export type UniverseSelectionOptions = {
  manifestPath?: string;
  profile?: string;
  overrideSymbols?: string[];
  allowLeveragedEtf?: boolean;
};
