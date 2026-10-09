import ipaddress
import re

from app.models import RecordType

_LABEL = re.compile(r"^(?:\*|[A-Za-z0-9_](?:[A-Za-z0-9_-]{0,61}[A-Za-z0-9_])?)$")
_CAA = re.compile(r'^(\d+)\s+([A-Za-z0-9]+)\s+("(?:\\.|[^"])*"|(\S+))$')


def normalize_record_value(record_type: RecordType | str, value: str) -> str:
    kind = record_type.value if isinstance(record_type, RecordType) else record_type
    text = value.strip()
    if not text:
        raise ValueError("value is required")
    if kind == RecordType.A.value:
        return _ipv4(text)
    if kind == RecordType.AAAA.value:
        return _ipv6(text)
    if kind in {RecordType.CNAME.value, RecordType.NS.value, RecordType.PTR.value}:
        return _hostname(text)
    if kind == RecordType.MX.value:
        return _mx(text)
    if kind == RecordType.SRV.value:
        return _srv(text)
    if kind == RecordType.CAA.value:
        return _caa(text)
    if kind == RecordType.TXT.value:
        return text
    raise ValueError("record type is not supported")


def _ipv4(value: str) -> str:
    try:
        address = ipaddress.IPv4Address(value)
    except ipaddress.AddressValueError as exc:
        raise ValueError("A record value must be an IPv4 address") from exc
    return str(address)


def _ipv6(value: str) -> str:
    try:
        address = ipaddress.IPv6Address(value)
    except ipaddress.AddressValueError as exc:
        raise ValueError("AAAA record value must be an IPv6 address") from exc
    return str(address)


def _hostname(value: str, *, allow_root: bool = False) -> str:
    if allow_root and value == ".":
        return "."
    host = value[:-1] if value.endswith(".") else value
    if not host or len(host) > 253 or ".." in host:
        raise ValueError("value must be a hostname")
    labels = host.split(".")
    for index, label in enumerate(labels):
        if index == 0 and label == "*":
            continue
        if not _LABEL.fullmatch(label) or label == "*":
            raise ValueError("value must be a hostname")
    return host.lower()


def _uint(value: str, maximum: int, label: str) -> int:
    if not value.isdigit():
        raise ValueError(f"{label} must be an integer")
    number = int(value)
    if number > maximum:
        raise ValueError(f"{label} must be from 0 through {maximum}")
    return number


def _mx(value: str) -> str:
    parts = value.split(None, 1)
    if len(parts) != 2:
        raise ValueError("MX record value must be a priority and a mail server")
    priority = _uint(parts[0], 65535, "MX priority")
    host = _hostname(parts[1])
    return f"{priority} {host}"


def _srv(value: str) -> str:
    parts = value.split()
    if len(parts) != 4:
        raise ValueError("SRV record value must be priority, weight, port, and target")
    priority = _uint(parts[0], 65535, "SRV priority")
    weight = _uint(parts[1], 65535, "SRV weight")
    port = _uint(parts[2], 65535, "SRV port")
    target = _hostname(parts[3], allow_root=True)
    return f"{priority} {weight} {port} {target}"


def _caa(value: str) -> str:
    match = _CAA.fullmatch(value)
    if match is None:
        raise ValueError("CAA record value must be a flag, tag, and value")
    flag = _uint(match.group(1), 255, "CAA flag")
    tag = match.group(2)
    raw_value = match.group(3)
    if raw_value.startswith('"') and raw_value.endswith('"'):
        inner = raw_value[1:-1].replace('\\"', '"').replace("\\\\", "\\")
    else:
        inner = raw_value
    if not inner:
        raise ValueError("CAA value is required")
    escaped = inner.replace("\\", "\\\\").replace('"', '\\"')
    return f'{flag} {tag} "{escaped}"'
