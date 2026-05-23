"""V1 feature column order — must match backend FeatureSnapshot and LEAN meta export."""

from __future__ import annotations

FEATURE_COLUMNS: tuple[str, ...] = (
    "return_20d",
    "return_63d",
    "return_126d",
    "realized_vol_20d",
    "drawdown_63d",
    "price_vs_sma_200d",
    "dollar_volume_20d",
    "market_regime_score",
)

UNIVERSE: tuple[str, ...] = ("SPY", "QQQ", "IWM", "TLT", "GLD")

HORIZON_DAYS = 21
