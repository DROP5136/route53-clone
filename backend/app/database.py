import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

_database_override = os.environ.get("ROUTE53_DATABASE_PATH", "").strip()
DATABASE_PATH = Path(_database_override) if _database_override else Path(__file__).resolve().parent.parent / "app.db"

engine = create_engine(
    URL.create(drivername="sqlite", database=str(DATABASE_PATH)),
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    from sqlalchemy import inspect, text

    from app import models

    inspector = inspect(engine)
    if inspector.has_table("hosted_zones"):
        columns = {column["name"] for column in inspector.get_columns("hosted_zones")}
        if "user_id" not in columns:
            with engine.connect() as connection:
                zone_count = connection.execute(text("SELECT COUNT(*) FROM hosted_zones")).scalar()
                record_count = connection.execute(text("SELECT COUNT(*) FROM dns_records")).scalar()
                if zone_count or record_count:
                    raise RuntimeError("hosted_zones is missing user_id and already contains data")
                connection.exec_driver_sql("PRAGMA foreign_keys=OFF")
                connection.exec_driver_sql("DROP TABLE IF EXISTS dns_records")
                connection.exec_driver_sql("DROP TABLE IF EXISTS hosted_zones")
                connection.commit()

    models.Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
