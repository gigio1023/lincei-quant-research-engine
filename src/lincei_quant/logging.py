from __future__ import annotations

import sys
from pathlib import Path

from loguru import logger


def configure_logging(log_file: Path | None = None, level: str = "INFO") -> None:
    """Configure Loguru sinks for CLI and batch research runs."""
    logger.remove()
    logger.add(
        sys.stderr,
        level=level,
        colorize=True,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level:<8} | {message}",
    )
    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        logger.add(
            log_file,
            level=level,
            rotation="10 MB",
            retention="30 days",
            enqueue=True,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level:<8} | {extra} | {message}",
        )
