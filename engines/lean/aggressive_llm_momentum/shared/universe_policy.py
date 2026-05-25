"""Quality-gated universe manifest loader for the LEAN runtime.

The manifest is the LEAN-side broker boundary for instrument eligibility: unknown,
hard-excluded, or disabled leveraged instruments never reach portfolio construction.
"""

import json
import os
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any


def _instrument(
    symbol: str,
    *,
    sleeve: str,
    max_position_pct: float,
    asset_type: str = "equity",
    status: str = "active",
    requires_allow_leveraged_etf: bool = False,
    exclusion_reason: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "symbol": symbol,
        "assetType": asset_type,
        "status": status,
        "sleeve": sleeve,
        "maxPositionPct": max_position_pct,
    }
    if requires_allow_leveraged_etf:
        payload["requiresAllowLeveragedEtf"] = True
    if exclusion_reason:
        payload["exclusionReason"] = exclusion_reason
    return payload


EMBEDDED_ACTIVE_SYMBOLS = [
    "SMH",
    "NVDA",
    "AVGO",
    "TSM",
    "ASML",
    "AMAT",
    "AMD",
    "MU",
    "LRCX",
    "KLAC",
    "MRVL",
    "IGV",
    "CIBR",
    "MSFT",
    "ORCL",
    "NOW",
    "PANW",
    "CRWD",
    "PLTR",
    "ANET",
    "DDOG",
    "GRID",
    "ETN",
    "PWR",
    "VRT",
    "GEV",
    "CEG",
    "VST",
    "XAR",
    "UFO",
    "RKLB",
    "LMT",
    "NOC",
    "LHX",
]


EMBEDDED_INSTRUMENTS = [
    _instrument("SMH", sleeve="semiconductor_ai_compute", max_position_pct=0.25, asset_type="etf"),
    _instrument("NVDA", sleeve="semiconductor_ai_compute", max_position_pct=0.08),
    _instrument("AVGO", sleeve="semiconductor_ai_compute", max_position_pct=0.08),
    _instrument("TSM", sleeve="semiconductor_ai_compute", max_position_pct=0.08),
    _instrument("ASML", sleeve="semiconductor_ai_compute", max_position_pct=0.08),
    _instrument("AMAT", sleeve="semiconductor_ai_compute", max_position_pct=0.08),
    _instrument("AMD", sleeve="semiconductor_ai_compute", max_position_pct=0.07),
    _instrument("MU", sleeve="semiconductor_ai_compute", max_position_pct=0.06),
    _instrument("LRCX", sleeve="semiconductor_ai_compute", max_position_pct=0.06),
    _instrument("KLAC", sleeve="semiconductor_ai_compute", max_position_pct=0.06),
    _instrument("MRVL", sleeve="semiconductor_ai_compute", max_position_pct=0.05),
    _instrument("IGV", sleeve="software_cybersecurity", max_position_pct=0.25, asset_type="etf"),
    _instrument("CIBR", sleeve="software_cybersecurity", max_position_pct=0.20, asset_type="etf"),
    _instrument("MSFT", sleeve="software_cybersecurity", max_position_pct=0.08),
    _instrument("ORCL", sleeve="software_cybersecurity", max_position_pct=0.08),
    _instrument("NOW", sleeve="software_cybersecurity", max_position_pct=0.08),
    _instrument("PANW", sleeve="software_cybersecurity", max_position_pct=0.08),
    _instrument("CRWD", sleeve="software_cybersecurity", max_position_pct=0.08),
    _instrument("PLTR", sleeve="software_cybersecurity", max_position_pct=0.05),
    _instrument("ANET", sleeve="software_cybersecurity", max_position_pct=0.08),
    _instrument("DDOG", sleeve="software_cybersecurity", max_position_pct=0.06),
    _instrument("GRID", sleeve="power_electrification", max_position_pct=0.25, asset_type="etf"),
    _instrument("ETN", sleeve="power_electrification", max_position_pct=0.08),
    _instrument("PWR", sleeve="power_electrification", max_position_pct=0.08),
    _instrument("VRT", sleeve="power_electrification", max_position_pct=0.06),
    _instrument("GEV", sleeve="power_electrification", max_position_pct=0.08),
    _instrument("CEG", sleeve="power_electrification", max_position_pct=0.07),
    _instrument("VST", sleeve="power_electrification", max_position_pct=0.05),
    _instrument("XAR", sleeve="space_aerospace", max_position_pct=0.12, asset_type="etf"),
    _instrument("UFO", sleeve="space_aerospace", max_position_pct=0.08, asset_type="etf"),
    _instrument("RKLB", sleeve="space_aerospace", max_position_pct=0.05),
    _instrument("LMT", sleeve="space_aerospace", max_position_pct=0.05),
    _instrument("NOC", sleeve="space_aerospace", max_position_pct=0.05),
    _instrument("LHX", sleeve="space_aerospace", max_position_pct=0.05),
    _instrument("SPY", sleeve="benchmark", max_position_pct=0.35, asset_type="etf", status="benchmark"),
    _instrument("QQQ", sleeve="benchmark", max_position_pct=0.35, asset_type="etf", status="benchmark"),
    _instrument("IWM", sleeve="benchmark", max_position_pct=0.35, asset_type="etf", status="benchmark"),
    _instrument("SOXX", sleeve="semiconductor_ai_compute", max_position_pct=0.25, asset_type="etf", status="benchmark"),
    _instrument("XLU", sleeve="power_electrification", max_position_pct=0.25, asset_type="etf", status="benchmark"),
    _instrument("ITA", sleeve="space_aerospace", max_position_pct=0.25, asset_type="etf", status="benchmark"),
    _instrument("NASA", sleeve="space_aerospace", max_position_pct=0.08, asset_type="etf", status="watchlist"),
    _instrument("SOXL", sleeve="semiconductor_ai_compute", max_position_pct=0.08, asset_type="etf", status="tactical_disabled", requires_allow_leveraged_etf=True),
    _instrument("INTC", sleeve="semiconductor_ai_compute", max_position_pct=0.0, status="hard_excluded", exclusion_reason="Excluded by quality-gated universe policy."),
]


def _embedded_manifest() -> dict[str, Any]:
    # QuantConnect Cloud does not reliably expose repo-root config or input JSON
    # files during manual Web IDE backtests. The embedded manifest is a
    # fail-closed runtime copy of the active quality universe.
    return {
        "schemaVersion": "quality-gated-universe-v2",
        "id": "quality-gated-v2",
        "defaultProfile": "quality_core_backtest_safe",
        "rules": {
            "defaultAllowLeveragedEtf": False,
            "debugOverrideAllowedStatuses": ["active", "benchmark", "watchlist"],
        },
        "sleeveCaps": {
            "semiconductor_ai_compute": 0.35,
            "software_cybersecurity": 0.30,
            "power_electrification": 0.30,
            "space_aerospace": 0.12,
            "cash_risk_off": 1.0,
            "benchmark": 1.0,
        },
        "profiles": [
            {
                "name": "quality_core_backtest_safe",
                "activeSymbols": list(EMBEDDED_ACTIVE_SYMBOLS),
                "benchmarkSymbols": ["SPY", "QQQ", "IWM", "SOXX", "XLU", "ITA"],
                "watchlistSymbols": ["NASA"],
            },
            {
                "name": "forward_nasa",
                "extends": "quality_core_backtest_safe",
                "activeAdd": ["NASA"],
                "minimumStartDate": "2026-03-31",
            },
            {
                "name": "tactical_leverage_disabled",
                "extends": "quality_core_backtest_safe",
                "activeAdd": ["SOXL"],
                "requiresAllowLeveragedEtf": True,
            },
        ],
        "instruments": list(EMBEDDED_INSTRUMENTS),
    }


@dataclass(frozen=True)
class UniversePolicy:
    manifest_id: str
    profile: str
    active_symbols: tuple[str, ...]
    symbol_caps: dict[str, float]
    sleeve_by_symbol: dict[str, str]
    sleeve_caps: dict[str, float]
    etf_symbols: set[str]
    blocked_symbols: set[str]
    minimum_start_date: date | None
    source_path: str


def resolve_universe_policy(
    *,
    manifest_path: str | None,
    profile_name: str | None,
    override_symbols: tuple[str, ...],
    allow_leveraged_etf: bool,
) -> UniversePolicy:
    source_path, manifest = _load_manifest(manifest_path)
    instruments = {
        str(item["symbol"]).upper(): item for item in manifest.get("instruments", [])
    }
    profile = _resolve_profile(
        manifest,
        profile_name or manifest.get("defaultProfile") or "quality_core_backtest_safe",
    )
    _validate_symbols(profile.get("activeSymbols", []), instruments, allow_leveraged_etf)

    active_symbols = (
        _validate_override_symbols(
            override_symbols,
            instruments,
            set(
                manifest.get("rules", {}).get(
                    "debugOverrideAllowedStatuses",
                    ["active", "benchmark", "watchlist"],
                ),
            ),
            allow_leveraged_etf,
        )
        if override_symbols
        else tuple(profile.get("activeSymbols", []))
    )
    _validate_symbols(active_symbols, instruments, allow_leveraged_etf)

    return UniversePolicy(
        manifest_id=str(manifest.get("id", "quality-gated-v2")),
        profile=str(profile["name"]),
        active_symbols=tuple(active_symbols),
        symbol_caps={
            symbol: float(instruments[symbol].get("maxPositionPct", 0.08))
            for symbol in active_symbols
        },
        sleeve_by_symbol={
            symbol: str(instruments[symbol].get("sleeve", "unclassified"))
            for symbol in active_symbols
        },
        sleeve_caps={
            str(sleeve): float(cap)
            for sleeve, cap in manifest.get("sleeveCaps", {}).items()
        },
        etf_symbols={
            symbol
            for symbol in active_symbols
            if str(instruments[symbol].get("assetType", "")).lower() == "etf"
        },
        blocked_symbols={
            str(item["symbol"]).upper()
            for item in manifest.get("instruments", [])
            if item.get("status") in {"hard_excluded", "tactical_disabled"}
            and not (item.get("requiresAllowLeveragedEtf") and allow_leveraged_etf)
        },
        minimum_start_date=_parse_date(profile.get("minimumStartDate")),
        source_path=source_path,
    )


def _load_manifest(path: str | None) -> tuple[str, dict[str, Any]]:
    for candidate in _candidate_paths(path):
        if not candidate.exists():
            continue
        with candidate.open(encoding="utf-8") as handle:
            return str(candidate), json.load(handle)
    return "embedded:quality-gated-v2", _embedded_manifest()


def _candidate_paths(path: str | None) -> list[Path]:
    current_file = Path(__file__).resolve()
    project = current_file.parents[1] if len(current_file.parents) > 1 else Path(os.getcwd())
    candidates: list[Path] = []
    if path:
        raw = Path(path)
        candidates.append(raw if raw.is_absolute() else project / raw)
        candidates.append(raw if raw.is_absolute() else Path(os.getcwd()) / raw)
    candidates.append(project / "input/universe_manifest.runtime.json")
    for parent in [project, *current_file.parents]:
        candidates.append(parent / "config/universes/quality-gated-v2.json")
    return [candidate.resolve() for candidate in candidates]


def _resolve_profile(manifest: dict[str, Any], name: str) -> dict[str, Any]:
    profiles = {str(profile["name"]): profile for profile in manifest.get("profiles", [])}
    if name not in profiles:
        raise RuntimeError(f"Unknown universe profile: {name}")
    profile = dict(profiles[name])
    parent_name = profile.get("extends")
    if not parent_name:
        return _normalize_profile(profile)
    parent = _resolve_profile(manifest, str(parent_name))
    profile["activeSymbols"] = _unique_symbols(
        profile.get("activeSymbols", parent.get("activeSymbols", []))
        + profile.get("activeAdd", [])
    )
    profile["benchmarkSymbols"] = _unique_symbols(
        profile.get("benchmarkSymbols", parent.get("benchmarkSymbols", [])),
    )
    profile["watchlistSymbols"] = _unique_symbols(
        profile.get("watchlistSymbols", parent.get("watchlistSymbols", [])),
    )
    profile["minimumStartDate"] = max(
        [value for value in [parent.get("minimumStartDate"), profile.get("minimumStartDate")] if value],
        default=None,
    )
    return _normalize_profile(profile)


def _normalize_profile(profile: dict[str, Any]) -> dict[str, Any]:
    profile["activeSymbols"] = _unique_symbols(profile.get("activeSymbols", []))
    profile["benchmarkSymbols"] = _unique_symbols(profile.get("benchmarkSymbols", []))
    profile["watchlistSymbols"] = _unique_symbols(profile.get("watchlistSymbols", []))
    return profile


def _validate_override_symbols(
    symbols: tuple[str, ...],
    instruments: dict[str, dict[str, Any]],
    allowed_statuses: set[str],
    allow_leveraged_etf: bool,
) -> tuple[str, ...]:
    _validate_symbols(symbols, instruments, allow_leveraged_etf)
    for symbol in symbols:
        status = str(instruments[symbol].get("status", ""))
        if status not in allowed_statuses:
            raise RuntimeError(f"Universe override rejected for {symbol}: status={status}")
    return symbols


def _validate_symbols(
    symbols: tuple[str, ...] | list[str],
    instruments: dict[str, dict[str, Any]],
    allow_leveraged_etf: bool,
) -> None:
    for raw_symbol in symbols:
        symbol = str(raw_symbol).upper()
        instrument = instruments.get(symbol)
        if instrument is None:
            raise RuntimeError(f"Universe symbol {symbol} is not declared in manifest.")
        if instrument.get("status") == "hard_excluded":
            reason = instrument.get("exclusionReason", "no reason recorded")
            raise RuntimeError(f"Universe symbol {symbol} is hard excluded: {reason}")
        if instrument.get("requiresAllowLeveragedEtf") and not allow_leveraged_etf:
            raise RuntimeError(f"Universe symbol {symbol} requires allow-leveraged-etf=true.")


def _unique_symbols(symbols: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for raw_symbol in symbols:
        symbol = str(raw_symbol).strip().upper()
        if symbol and symbol not in seen:
            seen.add(symbol)
            result.append(symbol)
    return result


def _parse_date(value: object) -> date | None:
    if not value:
        return None
    return date.fromisoformat(str(value))
