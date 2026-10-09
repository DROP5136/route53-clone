export type ZoneListItem = {
  domain_name: string;
  description: string | null;
  id: number;
  zone_type: "public" | "private";
};

export type RecordListItem = {
  name: string;
  type: string;
};

export function filterZones<T extends ZoneListItem>(zones: T[], search: string, zoneType: string): T[] {
  const query = search.trim().toLowerCase();
  return zones.filter((zone) => {
    if (zoneType && zone.zone_type !== zoneType) {
      return false;
    }
    if (!query) {
      return true;
    }
    const description = zone.description ?? "";
    return (
      zone.domain_name.toLowerCase().includes(query) ||
      description.toLowerCase().includes(query) ||
      String(zone.id).includes(query)
    );
  });
}

export function filterRecords<T extends RecordListItem>(records: T[], search: string, recordType: string): T[] {
  const query = search.trim().toLowerCase();
  return records.filter((record) => {
    if (recordType && record.type !== recordType) {
      return false;
    }
    if (!query) {
      return true;
    }
    return record.name.toLowerCase().includes(query) || record.type.toLowerCase().includes(query);
  });
}
