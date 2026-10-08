import enum
import re
from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates
from sqlalchemy.types import TypeDecorator

from app.database import Base


class UtcDateTime(TypeDecorator):
    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


_TTL_MAX = 2_147_483_647
_DOMAIN_NAME = re.compile(
    r"^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)"
    r"(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$"
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _enum_values(enum_cls: type[enum.Enum]) -> list[str]:
    return [member.value for member in enum_cls]


class ZoneType(str, enum.Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class RecordType(str, enum.Enum):
    A = "A"
    AAAA = "AAAA"
    CNAME = "CNAME"
    TXT = "TXT"
    MX = "MX"
    NS = "NS"
    PTR = "PTR"
    SRV = "SRV"
    CAA = "CAA"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "length(trim(username)) >= 1 AND length(username) <= 64",
            name="ck_users_username_length",
        ),
        CheckConstraint(
            "length(trim(password_hash)) >= 1 AND length(password_hash) <= 255",
            name="ck_users_password_hash_length",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime(), default=_utcnow, nullable=False)

    hosted_zones: Mapped[list["HostedZone"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    @validates("username")
    def _validate_username(self, _key: str, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("username must be a string")
        username = value.strip().lower()
        if not username or len(username) > 64 or any(char.isspace() for char in username):
            raise ValueError("username must be 1-64 characters without whitespace")
        return username

    @validates("password_hash")
    def _validate_password_hash(self, _key: str, value: str) -> str:
        if not isinstance(value, str) or not value.strip() or len(value) > 255:
            raise ValueError("password_hash must be 1-255 characters")
        return value


class HostedZone(Base):
    __tablename__ = "hosted_zones"
    __table_args__ = (
        UniqueConstraint(
            "domain_name",
            "zone_type",
            name="uq_hosted_zones_domain_name_zone_type",
        ),
        CheckConstraint(
            "length(trim(domain_name)) >= 1 AND length(domain_name) <= 253",
            name="ck_hosted_zones_domain_name_length",
        ),
        CheckConstraint(
            "description IS NULL OR (length(trim(description)) >= 1 AND length(description) <= 1024)",
            name="ck_hosted_zones_description_length",
        ),
        Index("ix_hosted_zones_user_id", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    domain_name: Mapped[str] = mapped_column(String(253), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1024))
    zone_type: Mapped[ZoneType] = mapped_column(
        SqlEnum(
            ZoneType,
            name="ck_hosted_zones_zone_type",
            native_enum=False,
            length=7,
            values_callable=_enum_values,
            validate_strings=True,
            create_constraint=True,
        ),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(UtcDateTime(), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        UtcDateTime(),
        default=_utcnow,
        onupdate=_utcnow,
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="hosted_zones")
    records: Mapped[list["DNSRecord"]] = relationship(
        back_populates="hosted_zone",
        cascade="all, delete-orphan",
    )

    @validates("domain_name")
    def _validate_domain_name(self, _key: str, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("domain_name must be a string")
        domain_name = value.strip().rstrip(".").lower()
        if not _DOMAIN_NAME.fullmatch(domain_name) or len(domain_name) > 253:
            raise ValueError("domain_name must be a valid domain name")
        return domain_name

    @validates("description")
    def _validate_description(self, _key: str, value: str | None) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("description must be a string")
        description = value.strip()
        if not description:
            return None
        if len(description) > 1024:
            raise ValueError("description must be at most 1024 characters")
        return description


class DNSRecord(Base):
    __tablename__ = "dns_records"
    __table_args__ = (
        UniqueConstraint(
            "hosted_zone_id",
            "name",
            "record_type",
            name="uq_dns_records_zone_name_type",
        ),
        CheckConstraint(
            "length(trim(name)) >= 1 AND length(name) <= 253",
            name="ck_dns_records_name_length",
        ),
        CheckConstraint(
            "length(trim(value)) >= 1 AND length(value) <= 4000",
            name="ck_dns_records_value_length",
        ),
        CheckConstraint(
            f"ttl >= 0 AND ttl <= {_TTL_MAX}",
            name="ck_dns_records_ttl_range",
        ),
        Index("ix_dns_records_hosted_zone_id_record_type", "hosted_zone_id", "record_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    hosted_zone_id: Mapped[int] = mapped_column(
        ForeignKey("hosted_zones.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(253), nullable=False)
    record_type: Mapped[RecordType] = mapped_column(
        SqlEnum(
            RecordType,
            name="ck_dns_records_record_type",
            native_enum=False,
            length=5,
            values_callable=_enum_values,
            validate_strings=True,
            create_constraint=True,
        ),
        nullable=False,
    )
    value: Mapped[str] = mapped_column(Text, nullable=False)
    ttl: Mapped[int] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime(), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        UtcDateTime(),
        default=_utcnow,
        onupdate=_utcnow,
        nullable=False,
    )

    hosted_zone: Mapped[HostedZone] = relationship(back_populates="records")

    @validates("name")
    def _validate_name(self, _key: str, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("name must be a string")
        name = value.strip().rstrip(".").lower()
        if not name or len(name) > 253 or any(char.isspace() for char in name):
            raise ValueError("name must be 1-253 characters without whitespace")
        return name

    @validates("value")
    def _validate_value(self, _key: str, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("value must be a string")
        record_value = value.strip()
        if not record_value or len(record_value) > 4000:
            raise ValueError("value must be 1-4000 characters")
        return record_value

    @validates("ttl")
    def _validate_ttl(self, _key: str, value: int) -> int:
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError("ttl must be an integer")
        if value < 0 or value > _TTL_MAX:
            raise ValueError(f"ttl must be between 0 and {_TTL_MAX}")
        return value
