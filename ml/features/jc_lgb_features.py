"""Build jc-builds/stockprediction-ai feature columns from daily OHLCV bars."""

from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

JC_FEATURE_COLUMNS: tuple[str, ...] = (
    "logret_1d",
    "ret_2d",
    "ret_3d",
    "ret_5d",
    "ret_10d",
    "ret_20d",
    "ret_60d",
    "ret_120d",
    "ret_252d",
    "vol_5d",
    "vol_20d",
    "vol_60d",
    "dd_20d",
    "dd_60d",
    "dd_252d",
    "mom_12_1",
    "px_over_ma_20",
    "px_over_ma_50",
    "px_over_ma_200",
    "logv",
    "logv_over_ma_5",
    "logv_over_ma_20",
    "logv_over_ma_60",
    "dollar_vol_20",
    "range_pct",
    "body_pct",
    "gap_pct",
    "up_frac_10",
    "up_frac_20",
    "ret_20d_chg",
    "vwap_gap",
    "ret_z60",
    "days_since_earn",
    "days_until_earn",
    "near_earn_window",
    "eps_est_known",
    "dow",
    "spy_ret_20",
    "spy_vol_20",
    "spy_dd_252",
    "spy_over_ma_200",
    "xs_ret_5d",
    "xs_ret_20d",
    "xs_vol_20d",
    "xs_mom_12_1",
    "xs_px_over_ma_50",
    "xs_dd_60d",
)


def load_bars_frame(
    database_path: Path,
    dataset_id: str,
    symbols: list[str],
) -> dict[str, pd.DataFrame]:
    connection = sqlite3.connect(database_path)
    try:
        frames: dict[str, pd.DataFrame] = {}
        for symbol in symbols:
            query = """
                SELECT timestamp, open, high, low, close, volume
                FROM market_data_bars
                WHERE datasetId = ? AND symbol = ?
                ORDER BY timestamp ASC
            """
            frame = pd.read_sql_query(query, connection, params=(dataset_id, symbol))
            if frame.empty:
                continue
            frame["timestamp"] = pd.to_datetime(frame["timestamp"], utc=True, errors="coerce")
            frame = frame.dropna(subset=["close"]).set_index("timestamp")
            frames[symbol] = frame
        return frames
    finally:
        connection.close()


def _return_over(closes: pd.Series, days: int) -> float:
    if len(closes) <= days:
        return 0.0
    base = float(closes.iloc[-1 - days])
    latest = float(closes.iloc[-1])
    if base == 0:
        return 0.0
    return latest / base - 1.0


def _rolling_vol(daily_returns: pd.Series, window: int) -> float:
    if len(daily_returns) < 2:
        return 0.0
    sample = daily_returns.tail(window)
    return float(sample.std(ddof=0) * np.sqrt(252))


def _drawdown(closes: pd.Series, window: int) -> float:
    sample = closes.tail(window)
    if sample.empty:
        return 0.0
    peak = float(sample.max())
    latest = float(sample.iloc[-1])
    if peak == 0:
        return 0.0
    return latest / peak - 1.0


def _symbol_row(frame: pd.DataFrame, as_of: pd.Timestamp | None = None) -> dict[str, float]:
    data = frame if as_of is None else frame.loc[:as_of]
    if len(data) < 3:
        return {column: 0.0 for column in JC_FEATURE_COLUMNS}

    closes = data["close"].astype(float)
    opens = data["open"].astype(float)
    highs = data["high"].astype(float)
    lows = data["low"].astype(float)
    volumes = data["volume"].fillna(0.0).astype(float)
    daily_returns = closes.pct_change().fillna(0.0)

    latest_close = float(closes.iloc[-1])
    prev_close = float(closes.iloc[-2]) if len(closes) > 1 else latest_close
    logret_1d = 0.0 if prev_close == 0 else float(np.log(latest_close / prev_close))

    ma20 = float(closes.tail(20).mean()) if len(closes) >= 1 else latest_close
    ma50 = float(closes.tail(50).mean()) if len(closes) >= 1 else latest_close
    ma200 = float(closes.tail(200).mean()) if len(closes) >= 1 else latest_close

    ret_20d = _return_over(closes, 20)
    ret_60d = _return_over(closes, 60)
    ret_252d = _return_over(closes, 252)
    mom_12_1 = ret_252d - _return_over(closes, 21)

    logv = float(np.log1p(max(float(volumes.iloc[-1]), 0.0)))
    logv_ma5 = float(np.log1p(max(float(volumes.tail(5).mean()), 0.0)))
    logv_ma20 = float(np.log1p(max(float(volumes.tail(20).mean()), 0.0)))
    logv_ma60 = float(np.log1p(max(float(volumes.tail(60).mean()), 0.0)))

    last_open = float(opens.iloc[-1])
    last_high = float(highs.iloc[-1])
    last_low = float(lows.iloc[-1])
    range_pct = (last_high - last_low) / latest_close if latest_close else 0.0
    body_pct = (latest_close - last_open) / latest_close if latest_close else 0.0
    gap_pct = (last_open - prev_close) / prev_close if prev_close else 0.0

    up_frac_10 = float((daily_returns.tail(10) > 0).mean()) if len(daily_returns) else 0.5
    up_frac_20 = float((daily_returns.tail(20) > 0).mean()) if len(daily_returns) else 0.5

    ret_20d_prev = _return_over(closes.iloc[:-1], 20) if len(closes) > 21 else ret_20d
    ret_20d_chg = ret_20d - ret_20d_prev

    vwap_proxy = float(
        (data["close"] * volumes).tail(20).sum() / max(volumes.tail(20).sum(), 1.0),
    )
    vwap_gap = (latest_close - vwap_proxy) / latest_close if latest_close else 0.0

    ret_tail = daily_returns.tail(60)
    ret_z60 = 0.0
    if len(ret_tail) > 1 and float(ret_tail.std(ddof=0)) > 0:
        ret_z60 = float((daily_returns.iloc[-1] - ret_tail.mean()) / ret_tail.std(ddof=0))

    ts = data.index[-1]
    dow = float(ts.weekday()) if hasattr(ts, "weekday") else float(datetime.utcnow().weekday())

    dollar_vol_20 = float((closes.tail(20) * volumes.tail(20)).mean())

    row = {
        "logret_1d": logret_1d,
        "ret_2d": _return_over(closes, 2),
        "ret_3d": _return_over(closes, 3),
        "ret_5d": _return_over(closes, 5),
        "ret_10d": _return_over(closes, 10),
        "ret_20d": ret_20d,
        "ret_60d": ret_60d,
        "ret_120d": _return_over(closes, 120),
        "ret_252d": ret_252d,
        "vol_5d": _rolling_vol(daily_returns, 5),
        "vol_20d": _rolling_vol(daily_returns, 20),
        "vol_60d": _rolling_vol(daily_returns, 60),
        "dd_20d": _drawdown(closes, 20),
        "dd_60d": _drawdown(closes, 60),
        "dd_252d": _drawdown(closes, 252),
        "mom_12_1": mom_12_1,
        "px_over_ma_20": latest_close / ma20 if ma20 else 1.0,
        "px_over_ma_50": latest_close / ma50 if ma50 else 1.0,
        "px_over_ma_200": latest_close / ma200 if ma200 else 1.0,
        "logv": logv,
        "logv_over_ma_5": logv / logv_ma5 if logv_ma5 else 1.0,
        "logv_over_ma_20": logv / logv_ma20 if logv_ma20 else 1.0,
        "logv_over_ma_60": logv / logv_ma60 if logv_ma60 else 1.0,
        "dollar_vol_20": dollar_vol_20,
        "range_pct": range_pct,
        "body_pct": body_pct,
        "gap_pct": gap_pct,
        "up_frac_10": up_frac_10,
        "up_frac_20": up_frac_20,
        "ret_20d_chg": ret_20d_chg,
        "vwap_gap": vwap_gap,
        "ret_z60": ret_z60,
        "days_since_earn": 999.0,
        "days_until_earn": 999.0,
        "near_earn_window": 0.0,
        "eps_est_known": 0.0,
        "dow": dow,
    }
    return row


def build_feature_matrix(
    bar_frames: dict[str, pd.DataFrame],
    symbols: list[str],
) -> pd.DataFrame:
    per_symbol: dict[str, dict[str, float]] = {}
    for symbol in symbols:
        frame = bar_frames.get(symbol)
        if frame is None or frame.empty:
            per_symbol[symbol] = {column: 0.0 for column in JC_FEATURE_COLUMNS}
        else:
            per_symbol[symbol] = _symbol_row(frame)

    spy_row = per_symbol.get("SPY", {column: 0.0 for column in JC_FEATURE_COLUMNS})
    spy_close_series = bar_frames["SPY"]["close"].astype(float) if "SPY" in bar_frames else pd.Series(dtype=float)
    spy_ma200 = float(spy_close_series.tail(200).mean()) if len(spy_close_series) else 0.0
    spy_latest = float(spy_close_series.iloc[-1]) if len(spy_close_series) else 0.0

    xs_metrics = {
        "xs_ret_5d": [per_symbol.get(s, {}).get("ret_5d", 0.0) for s in symbols],
        "xs_ret_20d": [per_symbol.get(s, {}).get("ret_20d", 0.0) for s in symbols],
        "xs_vol_20d": [per_symbol.get(s, {}).get("vol_20d", 0.0) for s in symbols],
        "xs_mom_12_1": [per_symbol.get(s, {}).get("mom_12_1", 0.0) for s in symbols],
        "xs_px_over_ma_50": [per_symbol.get(s, {}).get("px_over_ma_50", 1.0) for s in symbols],
        "xs_dd_60d": [per_symbol.get(s, {}).get("dd_60d", 0.0) for s in symbols],
    }

    def xs_rank(values: list[float], index: int) -> float:
        if not values:
            return 0.0
        target = values[index]
        return float(sum(1 for value in values if value <= target) / len(values))

    rows: list[dict[str, float | str]] = []
    for index, symbol in enumerate(symbols):
        row = dict(per_symbol.get(symbol, {column: 0.0 for column in JC_FEATURE_COLUMNS}))
        row["spy_ret_20"] = float(spy_row.get("ret_20d", 0.0))
        row["spy_vol_20"] = float(spy_row.get("vol_20d", 0.0))
        row["spy_dd_252"] = float(spy_row.get("dd_252d", 0.0))
        row["spy_over_ma_200"] = spy_latest / spy_ma200 if spy_ma200 else 1.0
        row["xs_ret_5d"] = xs_rank(xs_metrics["xs_ret_5d"], index)
        row["xs_ret_20d"] = xs_rank(xs_metrics["xs_ret_20d"], index)
        row["xs_vol_20d"] = xs_rank(xs_metrics["xs_vol_20d"], index)
        row["xs_mom_12_1"] = xs_rank(xs_metrics["xs_mom_12_1"], index)
        row["xs_px_over_ma_50"] = xs_rank(xs_metrics["xs_px_over_ma_50"], index)
        row["xs_dd_60d"] = xs_rank(xs_metrics["xs_dd_60d"], index)
        row["symbol"] = symbol
        rows.append(row)

    return pd.DataFrame(rows)
