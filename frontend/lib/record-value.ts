export type RecordValueType = "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "NS" | "PTR" | "SRV" | "CAA";

const labelPattern = /^(?:\*|[A-Za-z0-9_](?:[A-Za-z0-9_-]{0,61}[A-Za-z0-9_])?)$/;

export type RecordValueFields = {
  value: string;
  mxPriority: string;
  mxHost: string;
  srvPriority: string;
  srvWeight: string;
  srvPort: string;
  srvTarget: string;
  caaFlag: string;
  caaTag: string;
  caaValue: string;
};

export function emptyRecordFields(): RecordValueFields {
  return {
    value: "",
    mxPriority: "10",
    mxHost: "",
    srvPriority: "0",
    srvWeight: "0",
    srvPort: "0",
    srvTarget: "",
    caaFlag: "0",
    caaTag: "issue",
    caaValue: "",
  };
}

export function fieldsFromValue(type: RecordValueType, value: string): RecordValueFields {
  const fields = { ...emptyRecordFields(), value };
  if (type === "MX") {
    const match = value.trim().match(/^(\d+)\s+(\S+)$/);
    if (match) {
      fields.mxPriority = match[1];
      fields.mxHost = match[2];
    } else {
      fields.mxPriority = "";
      fields.mxHost = value;
    }
  }
  if (type === "SRV") {
    const match = value.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\S+)$/);
    if (match) {
      fields.srvPriority = match[1];
      fields.srvWeight = match[2];
      fields.srvPort = match[3];
      fields.srvTarget = match[4];
    } else {
      fields.srvTarget = value;
    }
  }
  if (type === "CAA") {
    const match = value.trim().match(/^(\d+)\s+([A-Za-z0-9]+)\s+("(?:\\.|[^"])*"|(\S+))$/);
    if (match) {
      fields.caaFlag = match[1];
      fields.caaTag = match[2];
      const raw = match[3];
      fields.caaValue = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\") : raw;
    } else {
      fields.caaValue = value;
    }
  }
  return fields;
}

export function composeRecordValue(type: RecordValueType, fields: RecordValueFields): string {
  if (type === "MX") {
    return `${fields.mxPriority.trim()} ${fields.mxHost.trim()}`.trim();
  }
  if (type === "SRV") {
    return `${fields.srvPriority.trim()} ${fields.srvWeight.trim()} ${fields.srvPort.trim()} ${fields.srvTarget.trim()}`.trim();
  }
  if (type === "CAA") {
    const flag = fields.caaFlag.trim();
    const tag = fields.caaTag.trim();
    const inner = fields.caaValue.trim();
    const escaped = inner.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `${flag} ${tag} "${escaped}"`.trim();
  }
  return fields.value.trim();
}

export function recordValueError(type: RecordValueType, value: string): string | null {
  const text = value.trim();
  if (!text) {
    return "Value is required.";
  }
  if (type === "A") {
    return isIpv4(text) ? null : "A record value must be an IPv4 address.";
  }
  if (type === "AAAA") {
    return isIpv6(text) ? null : "AAAA record value must be an IPv6 address.";
  }
  if (type === "CNAME" || type === "NS" || type === "PTR") {
    return hostnameError(text, false);
  }
  if (type === "MX") {
    const parts = text.split(/\s+/, 2);
    if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || Number(parts[0]) > 65535) {
      return "MX record value must be a priority and a mail server.";
    }
    return hostnameError(parts[1], false) ? "MX record value must be a priority and a mail server." : null;
  }
  if (type === "SRV") {
    const parts = text.split(/\s+/);
    if (parts.length !== 4) {
      return "SRV record value must be priority, weight, port, and target.";
    }
    const limits = ["SRV priority", "SRV weight", "SRV port"];
    for (let index = 0; index < 3; index += 1) {
      if (!/^\d+$/.test(parts[index]) || Number(parts[index]) > 65535) {
        return `${limits[index]} must be from 0 through 65535.`;
      }
    }
    return hostnameError(parts[3], true) ? "SRV target must be a hostname." : null;
  }
  if (type === "CAA") {
    const match = text.match(/^(\d+)\s+([A-Za-z0-9]+)\s+("(?:\\.|[^"])*"|(\S+))$/);
    if (!match || Number(match[1]) > 255) {
      return "CAA record value must be a flag, tag, and value.";
    }
    const raw = match[3];
    const inner = raw.startsWith('"') ? raw.slice(1, -1) : raw;
    if (!inner) {
      return "CAA value is required.";
    }
    return null;
  }
  return null;
}

function hostnameError(value: string, allowRoot: boolean): string | null {
  if (allowRoot && value === ".") {
    return null;
  }
  const host = value.endsWith(".") ? value.slice(0, -1) : value;
  if (!host || host.length > 253 || host.includes("..")) {
    return "Value must be a hostname.";
  }
  const labels = host.split(".");
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    if (index === 0 && label === "*") {
      continue;
    }
    if (!labelPattern.test(label) || label === "*") {
      return "Value must be a hostname.";
    }
  }
  return null;
}

function isIpv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) {
    return false;
  }
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part) || (part.length > 1 && part.startsWith("0"))) {
      return false;
    }
    return Number(part) <= 255;
  });
}

function isIpv6(value: string): boolean {
  if (!value.includes(":") || value.includes(":::")) {
    return false;
  }
  const halves = value.split("::");
  if (halves.length > 2) {
    return false;
  }
  const parseSide = (side: string) => {
    if (!side) {
      return [];
    }
    return side.split(":").map((part) => {
      if (part.includes(".")) {
        if (!isIpv4(part)) {
          throw new Error("ipv4");
        }
        return 2;
      }
      if (!/^[0-9a-fA-F]{1,4}$/.test(part)) {
        throw new Error("hex");
      }
      return 1;
    });
  };
  try {
    const left = parseSide(halves[0]);
    const right = halves.length === 2 ? parseSide(halves[1]) : [];
    const groups = [...left, ...right].reduce((sum, size) => sum + size, 0);
    if (halves.length === 1) {
      return groups === 8;
    }
    return groups < 8;
  } catch {
    return false;
  }
}
