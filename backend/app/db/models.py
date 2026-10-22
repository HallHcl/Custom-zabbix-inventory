import uuid
from datetime import datetime, date
from typing import List, Optional
from sqlalchemy import (
    String,
    Integer,
    Numeric,
    Boolean,
    Date,
    DateTime,
    Text,
    ForeignKey,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from backend.app.db.session import Base


def utc_now() -> datetime:
    return datetime.now().replace(microsecond=0)


# ============================================================================
# 1. SITES (Geographical Campus / Location)
# ============================================================================
class Site(Base):
    __tablename__ = "sites"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    region: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), nullable=True)
    contact_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())

    # Relationships
    buildings: Mapped[List["Building"]] = relationship("Building", back_populates="site", cascade="all, delete-orphan")


# ============================================================================
# 2. BUILDINGS (Physical Facility within a Site)
# ============================================================================
class Building(Base):
    __tablename__ = "buildings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    site_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    floors_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    total_power_capacity_kw: Mapped[float] = mapped_column(Numeric(10, 2), default=500.00, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())

    # Relationships
    site: Mapped["Site"] = relationship("Site", back_populates="buildings")
    rooms: Mapped[List["Room"]] = relationship("Room", back_populates="building", cascade="all, delete-orphan")


# ============================================================================
# 3. ROOMS / DATA HALLS (Floor-level secure rooms)
# ============================================================================
class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    building_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    floor_level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    width_meters: Mapped[float] = mapped_column(Numeric(6, 2), default=20.0, nullable=False)
    length_meters: Mapped[float] = mapped_column(Numeric(6, 2), default=30.0, nullable=False)
    max_kw_capacity: Mapped[float] = mapped_column(Numeric(10, 2), default=150.0, nullable=False)
    max_cooling_btu: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    blueprint_svg_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())

    # Relationships
    building: Mapped["Building"] = relationship("Building", back_populates="rooms")
    rows: Mapped[List["Row"]] = relationship("Row", back_populates="room", cascade="all, delete-orphan")
    devices: Mapped[List["Device"]] = relationship("Device", back_populates="room", cascade="all, delete-orphan")

    @property
    def site(self) -> Optional["Site"]:
        if "building" in self.__dict__ and self.building:
            if "site" in self.building.__dict__:
                return self.building.site
        return None

    @property
    def racks(self) -> List["Rack"]:
        all_racks = []
        if "rows" in self.__dict__ and self.rows:
            for r in self.rows:
                if "racks" in r.__dict__ and r.racks:
                    all_racks.extend(r.racks)
        return all_racks

    @property
    def room_temp_target(self) -> float:
        return 22.5

    __table_args__ = (
        UniqueConstraint("building_id", "name", name="uq_room_building_name"),
    )


# ============================================================================
# 4. ROWS / AISLES (Grouping racks for Hot/Cold aisle management)
# ============================================================================
class Row(Base):
    __tablename__ = "rows"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    room_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "Row A", "Row B"
    aisle_type: Mapped[str] = mapped_column(String(20), default="COLD_CONTAINED")  # COLD_CONTAINED, HOT_CONTAINED, OPEN
    pos_x_meters: Mapped[float] = mapped_column(Numeric(6, 2), default=0.0, nullable=False)
    pos_y_meters: Mapped[float] = mapped_column(Numeric(6, 2), default=0.0, nullable=False)
    orientation_deg: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    room: Mapped["Room"] = relationship("Room", back_populates="rows")
    racks: Mapped[List["Rack"]] = relationship("Rack", back_populates="row", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("room_id", "name", name="uq_row_room_name"),
    )


# ============================================================================
# 5. RACKS (Physical 42U/45U/48U Cabinets)
# ============================================================================
class Rack(Base):
    __tablename__ = "racks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    row_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rows.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "R-A01"
    u_height: Mapped[int] = mapped_column(Integer, default=42, nullable=False)
    pos_x_meters: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    pos_y_meters: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    rotation_deg: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_power_watts: Mapped[int] = mapped_column(Integer, default=8000, nullable=False)
    max_weight_kg: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)

    # Direct Zabbix Item Links for Rack-Level Environmentals
    zabbix_inlet_temp_itemid: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    zabbix_exhaust_temp_itemid: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    zabbix_humidity_itemid: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    zabbix_pdu_a_power_itemid: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    zabbix_pdu_b_power_itemid: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())

    # Relationships
    row: Mapped["Row"] = relationship("Row", back_populates="racks")
    devices: Mapped[List["Device"]] = relationship("Device", back_populates="rack")

    @property
    def total_u(self) -> int:
        return self.u_height

    @property
    def room_id(self) -> Optional[uuid.UUID]:
        if "row" in self.__dict__ and self.row:
            return self.row.room_id
        return None

    @property
    def row_name(self) -> str:
        if "row" in self.__dict__ and self.row:
            return self.row.name
        return "Row A"

    @property
    def row_letter(self) -> str:
        if "row" in self.__dict__ and self.row and self.row.name:
            return self.row.name.split()[-1]
        if self.name and "-" in self.name:
            part = self.name.split("-")[-1]
            letters = [c for c in part if c.isalpha()]
            if letters:
                return "".join(letters)
        return "A"

    @property
    def col_number(self) -> int:
        try:
            if self.name and "-" in self.name:
                part = self.name.split("-")[-1]
                num_str = "".join([c for c in part if c.isdigit()])
                return int(num_str) if num_str else 1
        except Exception:
            pass
        return 1

    __table_args__ = (
        UniqueConstraint("row_id", "name", name="uq_rack_row_name"),
    )


# ============================================================================
# 6. DEVICE MODELS (Reusable Hardware Templates)
# ============================================================================
class DeviceModel(Base):
    __tablename__ = "device_models"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    manufacturer: Mapped[str] = mapped_column(String(100), nullable=False)  # Dell, Cisco, APC, Fortinet
    model_name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)  # PowerEdge R760, Catalyst 9300
    category: Mapped[str] = mapped_column(String(40), nullable=False)  # SERVER, SWITCH, ROUTER, FIREWALL, STORAGE, PDU, UPS, CRAC, SENSOR
    u_height: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # 0 for vertical 0U PDUs
    is_full_depth: Mapped[bool] = mapped_column(Boolean, default=True)
    is_chassis: Mapped[bool] = mapped_column(Boolean, default=False)  # True for blade enclosures
    default_ports_json: Mapped[list] = mapped_column(JSONB, default=list)  # Pre-defined network & power ports
    typical_power_watts: Mapped[int] = mapped_column(Integer, default=450, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Numeric(6, 2), default=18.5, nullable=False)
    front_svg_template: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rear_svg_template: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    devices: Mapped[List["Device"]] = relationship("Device", back_populates="device_model")


# ============================================================================
# 7. DEVICES (Actual Physical Assets in Racks or Rooms)
# ============================================================================
class Device(Base):
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    device_model_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("device_models.id"), nullable=False)
    rack_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("racks.id", ondelete="SET NULL"), nullable=True)
    room_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    parent_device_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=True)

    # Identity & Zabbix Link
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    hostname: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    zabbix_hostid: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True, index=True)

    # Physical Rack Placement
    u_position_start: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1 to 48 (NULL for 0U PDU or unracked)
    rack_face: Mapped[str] = mapped_column(String(10), default="FRONT")  # FRONT, REAR, BOTH
    chassis_slot_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Network & Out-of-Band Management
    management_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    oob_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)  # iDRAC / iLO / IPMI IP
    oob_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)  # IDRAC, ILO, IPMI, SSH, HTTPS

    # Lifecycle, Ownership & Financials (For Supervisors & Managers)
    serial_number: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    asset_tag: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # PLANNED, STAGED, ACTIVE, MAINTENANCE, DECOMMISSIONED
    owner_department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    project_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    purchase_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    warranty_expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    vendor_contract_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    purchase_cost_usd: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, server_default=func.now())

    # Relationships
    device_model: Mapped["DeviceModel"] = relationship("DeviceModel", back_populates="devices")
    rack: Mapped[Optional["Rack"]] = relationship("Rack", back_populates="devices")
    room: Mapped["Room"] = relationship("Room", back_populates="devices")
    parent_device: Mapped[Optional["Device"]] = relationship("Device", remote_side=[id], backref="child_devices")

    # Cable & Power Connections
    source_connections: Mapped[List["DeviceConnection"]] = relationship(
        "DeviceConnection", foreign_keys="DeviceConnection.source_device_id", back_populates="source_device", cascade="all, delete-orphan"
    )
    target_connections: Mapped[List["DeviceConnection"]] = relationship(
        "DeviceConnection", foreign_keys="DeviceConnection.target_device_id", back_populates="target_device", cascade="all, delete-orphan"
    )

    @property
    def start_u(self) -> int:
        return self.u_position_start or 1

    @start_u.setter
    def start_u(self, val: int):
        self.u_position_start = val

    @property
    def height_u(self) -> int:
        if "device_model" in self.__dict__ and self.device_model:
            return self.device_model.u_height
        return 1

    @property
    def device_type(self) -> str:
        if "device_model" in self.__dict__ and self.device_model and self.device_model.category:
            return self.device_model.category.title()
        return "Server"

    @property
    def model(self) -> Optional[str]:
        if "device_model" in self.__dict__ and self.device_model:
            return self.device_model.model_name
        return None

    @property
    def manufacturer(self) -> Optional[str]:
        if "device_model" in self.__dict__ and self.device_model:
            return self.device_model.manufacturer
        return None

    @property
    def position_face(self) -> str:
        return self.rack_face.title() if self.rack_face else "Front"

    @property
    def ip_address(self) -> Optional[str]:
        return self.management_ip

    @ip_address.setter
    def ip_address(self, val: Optional[str]):
        self.management_ip = val

    @property
    def zabbix_host_id(self) -> Optional[str]:
        return self.zabbix_hostid

    @zabbix_host_id.setter
    def zabbix_host_id(self, val: Optional[str]):
        self.zabbix_hostid = val

    @property
    def tags(self) -> dict:
        return {}

    @property
    def custom_fields(self) -> dict:
        return {}

    __table_args__ = (
        UniqueConstraint("rack_id", "u_position_start", "rack_face", name="uq_rack_u_position"),
    )


# ============================================================================
# 8. DEVICE CONNECTIONS (Port-to-Port & Power Connectivity)
# ============================================================================
class DeviceConnection(Base):
    __tablename__ = "device_connections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    source_device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    source_port_name: Mapped[str] = mapped_column(String(64), nullable=False)  # e.g., "PSU-1", "Gi1/0/1"
    target_device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    target_port_name: Mapped[str] = mapped_column(String(64), nullable=False)  # e.g., "PDU-A-Outlet-12", "eth0"
    connection_type: Mapped[str] = mapped_column(String(30), nullable=False)  # POWER_A, POWER_B, FIBER_MM, FIBER_SM, RJ45_CAT6A, DAC
    cable_color: Mapped[str] = mapped_column(String(20), default="#3b82f6")
    cable_label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    bandwidth_gbps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())

    # Relationships
    source_device: Mapped["Device"] = relationship("Device", foreign_keys=[source_device_id], back_populates="source_connections")
    target_device: Mapped["Device"] = relationship("Device", foreign_keys=[target_device_id], back_populates="target_connections")


# ============================================================================
# 9. AI KNOWLEDGE BASE & INCIDENT VECTORS (pgvector)
# ============================================================================
class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False)  # SOP, HARDWARE_MANUAL, INCIDENT_POSTMORTEM
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding = mapped_column(Vector(1536), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())


# ============================================================================
# 10. SUBNETS (IPAM Management)
# ============================================================================
class Subnet(Base):
    __tablename__ = "subnets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    cidr: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    vlan_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gateway: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    dns_servers: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())
