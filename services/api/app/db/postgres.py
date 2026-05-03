from contextlib import contextmanager
from typing import Iterator

from psycopg import Connection
from psycopg.rows import dict_row
from pgvector.psycopg import register_vector

from app.core.config import get_settings


@contextmanager
def get_connection() -> Iterator[Connection]:
    settings = get_settings()
    with Connection.connect(settings.database_url, row_factory=dict_row) as conn:
        register_vector(conn)
        yield conn

