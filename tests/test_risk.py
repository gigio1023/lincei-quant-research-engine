from __future__ import annotations

import pytest

from lincei_quant.risk.policy import ExecutionMode, LiveTradingBlocked, require_non_live_mode


def test_live_mode_is_blocked_by_default() -> None:
    require_non_live_mode(ExecutionMode.research)
    require_non_live_mode(ExecutionMode.paper)
    with pytest.raises(LiveTradingBlocked):
        require_non_live_mode(ExecutionMode.live)
