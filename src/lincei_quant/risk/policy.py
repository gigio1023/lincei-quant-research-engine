from __future__ import annotations

from enum import StrEnum


class ExecutionMode(StrEnum):
    research = "research"
    paper = "paper"
    live = "live"


class LiveTradingBlocked(RuntimeError):
    """Raised when code attempts to enter live mode before explicit approval."""


def require_non_live_mode(mode: ExecutionMode) -> None:
    """Block live execution paths in the default repository scope."""
    if mode == ExecutionMode.live:
        raise LiveTradingBlocked("live trading is blocked by default; create a separate risk gate")
