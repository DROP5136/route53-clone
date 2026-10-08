from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import DNSRecord, HostedZone, RecordType, User

router = APIRouter(prefix="/zones/{zone_id}/records", tags=["records"])

_TTL_MAX = 2_147_483_647


class DNSRecordWrite(BaseModel):
    name: str = Field(min_length=1, max_length=253)
    type: RecordType
    value: str = Field(min_length=1, max_length=4000)
    ttl: int = Field(ge=1, le=_TTL_MAX)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("name is required")
        if any(char.isspace() for char in name):
            raise ValueError("name cannot contain whitespace")
        return name

    @field_validator("value")
    @classmethod
    def normalize_value(cls, value: str) -> str:
        record_value = value.strip()
        if not record_value:
            raise ValueError("value is required")
        return record_value


class DNSRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    name: str
    type: RecordType = Field(validation_alias="record_type")
    value: str
    ttl: int
    created_at: datetime
    updated_at: datetime


def _get_owned_zone(db: Session, zone_id: int, user_id: int) -> HostedZone:
    zone = db.scalar(
        select(HostedZone).where(HostedZone.id == zone_id, HostedZone.user_id == user_id)
    )
    if zone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hosted zone not found")
    return zone


def _get_owned_record(db: Session, zone_id: int, record_id: int, user_id: int) -> DNSRecord:
    zone = _get_owned_zone(db, zone_id, user_id)
    record = db.scalar(
        select(DNSRecord).where(DNSRecord.id == record_id, DNSRecord.hosted_zone_id == zone.id)
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DNS record not found")
    return record


def _apply_record(record: DNSRecord, body: DNSRecordWrite) -> None:
    record.name = body.name
    record.record_type = body.type
    record.value = body.value
    record.ttl = body.ttl


@router.post("", response_model=DNSRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(
    zone_id: int,
    body: DNSRecordWrite,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DNSRecord:
    zone = _get_owned_zone(db, zone_id, current_user.id)
    record = DNSRecord(hosted_zone_id=zone.id)
    try:
        _apply_record(record, body)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="DNS record already exists",
        ) from None

    db.refresh(record)
    return record


@router.get("", response_model=list[DNSRecordResponse])
def list_records(
    zone_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DNSRecord]:
    zone = _get_owned_zone(db, zone_id, current_user.id)
    return list(
        db.scalars(
            select(DNSRecord)
            .where(DNSRecord.hosted_zone_id == zone.id)
            .order_by(DNSRecord.name, DNSRecord.record_type, DNSRecord.id)
        ).all()
    )


@router.get("/{record_id}", response_model=DNSRecordResponse)
def get_record(
    zone_id: int,
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DNSRecord:
    return _get_owned_record(db, zone_id, record_id, current_user.id)


@router.put("/{record_id}", response_model=DNSRecordResponse)
def update_record(
    zone_id: int,
    record_id: int,
    body: DNSRecordWrite,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DNSRecord:
    record = _get_owned_record(db, zone_id, record_id, current_user.id)
    try:
        _apply_record(record, body)
        db.commit()
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="DNS record already exists",
        ) from None

    db.refresh(record)
    return record


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    zone_id: int,
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    record = _get_owned_record(db, zone_id, record_id, current_user.id)
    db.delete(record)
    db.commit()
