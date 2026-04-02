from collections import defaultdict
import threading

class EventStore:
    def __init__(self):
        self._events = defaultdict(list)
        self._lock = threading.Lock()

    def add_event(self, task_id: str, event_type: str, data: dict):
        with self._lock:
            self._events[task_id].append({
                "type": event_type,
                "data": data,
                "timestamp": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
            })

    def get_events(self, task_id: str):
        with self._lock:
            return list(self._events.get(task_id, []))

event_store = EventStore()
