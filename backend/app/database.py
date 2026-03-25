from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
    echo=False,
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in settings.database_url:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database — create tables if they don't exist.

    Uses Alembic stamp to mark existing databases as up-to-date.
    Falls back to create_all for fresh databases.
    """
    from app.models import template, document, extraction, activity, llm_log  # noqa: F401

    Base.metadata.create_all(bind=engine)

    # Stamp the database with the current Alembic revision if not yet tracked
    try:
        from alembic.config import Config
        from alembic import command
        from alembic.runtime.migration import MigrationContext

        with engine.connect() as conn:
            migration_ctx = MigrationContext.configure(conn)
            current_rev = migration_ctx.get_current_revision()
            if current_rev is None:
                alembic_cfg = Config("alembic.ini")
                command.stamp(alembic_cfg, "head")
    except Exception:
        pass  # Alembic not required for basic operation
