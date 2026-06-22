"""
In-process task runner — replaces Celery for free-tier deployments.

Tasks run as daemon threads in the same process as the API server.
The public API (.delay()) is identical to Celery so tasks.py is unchanged.
Tradeoff: no persistence or retry across restarts (acceptable for MVP).
"""
import threading
import logging
import functools

logger = logging.getLogger(__name__)


class _TaskSelf:
    """Minimal stand-in for Celery's bound-task 'self' argument."""
    def __init__(self, name: str):
        self.name = name

    def retry(self, exc=None, countdown=30, **kwargs):
        logger.warning("Task %s requested retry (not supported in thread mode): %s", self.name, exc)


class _Task:
    def __init__(self, func, bind: bool = False):
        self._func = func
        self._bind = bind
        functools.update_wrapper(self, func)

    def delay(self, *args, **kwargs):
        threading.Thread(
            target=self._run, args=args, kwargs=kwargs, daemon=True,
            name=f"task-{self._func.__name__}"
        ).start()

    def _run(self, *args, **kwargs):
        try:
            if self._bind:
                self._func(_TaskSelf(self._func.__name__), *args, **kwargs)
            else:
                self._func(*args, **kwargs)
        except Exception:
            logger.exception("Background task %s failed", self._func.__name__)

    def __call__(self, *args, **kwargs):
        return self._func(*args, **kwargs)


class _Conf:
    def __setattr__(self, name, value):
        pass  # silently accept all celery conf assignments

    def __getattr__(self, name):
        return None


class _Celery:
    def __init__(self):
        self.conf = _Conf()

    def task(self, *args, bind: bool = False, **kwargs):
        def decorator(func):
            return _Task(func, bind=bind)
        # Handle both @celery_app.task and @celery_app.task(bind=True, ...)
        if len(args) == 1 and callable(args[0]):
            return _Task(args[0], bind=False)
        return decorator


celery_app = _Celery()
