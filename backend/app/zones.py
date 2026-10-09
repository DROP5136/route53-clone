from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import DNSRecord, HostedZone, User, ZoneType

router = APIRouter(prefix="/zones", tags=["zones"])


class HostedZoneCreate(BaseModel):
    domain_name: str = Field(min_length=1, max_length=253)
    zone_type: ZoneType
    description: str | None = Field(default=None, max_length=1024)

    @field_validator("domain_name")
    @classmethod
    def normalize_domain_name(cls, value: str) -> str:
        domain_name = value.strip()
        if not domain_name:
            raise ValueError("domain_name is required")
        return domain_name

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        description = value.strip()
        return description or None


class HostedZoneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    domain_name: str
    zone_type: ZoneType
    description: str | None
    created_at: datetime
    updated_at: datetime
    record_count: int


def _record_counts(db: Session, zone_ids: list[int]) -> dict[int, int]:
    if not zone_ids:
        return {}
    rows = db.execute(
        select(DNSRecord.hosted_zone_id, func.count(DNSRecord.id))
        .where(DNSRecord.hosted_zone_id.in_(zone_ids))
        .group_by(DNSRecord.hosted_zone_id)
    ).all()
    return {zone_id: int(count) for zone_id, count in rows}


def _zone_response(zone: HostedZone, record_count: int) -> HostedZoneResponse:
    return HostedZoneResponse(
        id=zone.id,
        domain_name=zone.domain_name,
        zone_type=zone.zone_type,
        description=zone.description,
        created_at=zone.created_at,
        updated_at=zone.updated_at,
        record_count=record_count,
    )


def _get_owned_zone(db: Session, zone_id: int, user_id: int) -> HostedZone:
    zone = db.scalar(
        select(HostedZone).where(HostedZone.id == zone_id, HostedZone.user_id == user_id)
    )
    if zone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hosted zone not found")
    return zone


@router.post("", response_model=HostedZoneResponse, status_code=status.HTTP_201_CREATED)
def create_zone(
    body: HostedZoneCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HostedZone:
    try:
        zone = HostedZone(
            user_id=current_user.id,
            domain_name=body.domain_name,
            zone_type=body.zone_type,
            description=body.description,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    db.add(zone)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hosted zone already exists",
        ) from None

    db.refresh(zone)
    return _zone_response(zone, 0)


@router.get("", response_model=list[HostedZoneResponse])
def list_zones(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[HostedZoneResponse]:
    zones = list(
        db.scalars(
            select(HostedZone)
            .where(HostedZone.user_id == current_user.id)
            .order_by(HostedZone.domain_name, HostedZone.id)
        ).all()
    )
    counts = _record_counts(db, [zone.id for zone in zones])
    return [_zone_response(zone, counts.get(zone.id, 0)) for zone in zones]


@router.get("/{zone_id}", response_model=HostedZoneResponse)
def get_zone(
    zone_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HostedZoneResponse:
    zone = _get_owned_zone(db, zone_id, current_user.id)
    return _zone_response(zone, _record_counts(db, [zone.id]).get(zone.id, 0))


@router.put("/{zone_id}", response_model=HostedZoneResponse)
def update_zone(
    zone_id: int,
    body: HostedZoneCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HostedZone:
    zone = _get_owned_zone(db, zone_id, current_user.id)
    try:
        zone.domain_name = body.domain_name
        zone.zone_type = body.zone_type
        zone.description = body.description
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
            detail="Hosted zone already exists",
        ) from None

    db.refresh(zone)
    return _zone_response(zone, _record_counts(db, [zone.id]).get(zone.id, 0))


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zone(
    zone_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    zone = _get_owned_zone(db, zone_id, current_user.id)
    db.delete(zone)
    db.commit()
