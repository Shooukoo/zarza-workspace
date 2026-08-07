import json
import logging
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    def format(self, record):
        log = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "fruit-inference",
            "level": record.levelname,
            "message": record.getMessage(),
        }
        reserved = {
            "name",
            "msg",
            "args",
            "levelname",
            "levelno",
            "pathname",
            "filename",
            "module",
            "exc_info",
            "exc_text",
            "stack_info",
            "lineno",
            "funcName",
            "created",
            "msecs",
            "relativeCreated",
            "thread",
            "threadName",
            "processName",
            "process",
            "message",
            "asctime",
        }
        for key, value in record.__dict__.items():
            if key not in reserved:
                log[key] = value

        if record.exc_info:
            log["exception"] = self.formatException(record.exc_info)

        return json.dumps(log)


logger = logging.getLogger("fruit-inference")
logger.setLevel(logging.INFO)

handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())

logger.handlers.clear()
logger.addHandler(handler)
logger.propagate = False


class AppLogger:

    def __init__(self, trace_id=None):
        self.trace_id = trace_id

    def info(self, message, **extra):
        logger.info(
            message,
            extra={
                "traceId": self.trace_id,
                **extra,
            },
        )

    def warn(self, message, **extra):
        logger.warning(
            message,
            extra={
                "traceId": self.trace_id,
                **extra,
            },
        )

    def error(self, message, **extra):
        logger.error(
            message,
            extra={
                "traceId": self.trace_id,
                **extra,
            },
        )

    def exception(self, message, **extra):
        logger.exception(
            message,
            extra={
                "traceId": self.trace_id,
                **extra,
            },
        )