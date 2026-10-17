from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.session import Base


def utc_now():
    return datetime.now().replace(microsecond=0)


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    # Relationships
    rooms: Mapped[List["Room"]] = relationship("Room", back_populates="site", cascade="all, delete-orphan")


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    site_id: Mapped[int] = mapped_column(Integer, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    room_temp_target: Mapped[float] = mapped_column(Float, default=24.5)
    grid_rows: Mapped[int] = mapped_column(Integer, default=3)  # Rows: A, B, C
    grid_cols: Mapped[int] = mapped_column(Integer, default=4)  # Cols: 01, 02, 03, 04
    zabbix_room_temp_item_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    # Relationships
    site: Mapped["Site"] = relationship("Site", back_populates="rooms")
    racks: Mapped[List["Rack"]] = relationship("Rack", back_populates="room", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("site_id", "name", name="uq_room_site_name"),
    )


class Rack(Base):
    __tablename__ = "racks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    room_id: Mapped[int] = mapped_column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "Rack B03"
    row: Mapped[str] = mapped_column(String(10), nullable=False)   # e.g. "Row B"
    col: Mapped[int] = mapped_column(Integer, nullable=False)       # e.g. 3
    total_u: Mapped[int] = mapped_column(Integer, default=42)
    max_power_kw: Mapped[float] = mapped_column(Float, default=8.0)
    zabbix_power_item_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    zabbix_inlet_temp_item_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    # Relationships
    room: Mapped["Room"] = relationship("Room", back_populates="racks")
    devices: Mapped[List["Device"]] = relationship("Device", back_populates="rack", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("room_id", "name", name="uq_rack_room_name"),
    )


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    rack_id: Mapped[int] = mapped_column(Integer, ForeignKey("racks.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "SRV-APP-03"
    device_type: Mapped[str] = mapped_column(String(50), default="Server")  # Server, Switch, Firewall, Storage, UPS, Patch Panel, Blank Panel
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g. "Dell PowerEdge R750"
    manufacturer: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g. "Dell EMC"
    
    # Rack placement
    start_u: Mapped[int] = mapped_column(Integer, nullable=False)  # e.g. 27
    height_u: Mapped[int] = mapped_column(Integer, default=1)      # e.g. 2 (occupies 27-28)
    position_face: Mapped[str] = mapped_column(String(10), default="Front")  # Front or Rear
    
    # Network & Hardware Specs
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)  # e.g. "10.10.20.33"
    serial_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Zabbix Integration Link
    zabbix_host_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    
    tags: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    custom_fields: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    # Relationships
    rack: Mapped["Rack"] = relationship("Rack", back_populates="devices")
