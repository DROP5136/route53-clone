import assert from "node:assert/strict";

import { filterRecords, filterZones } from "./list-filters.ts";
import { composeRecordValue, emptyRecordFields, recordValueError } from "./record-value.ts";

const pageSize = 10;
const zones = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  domain_name: `zone${String(index).padStart(2, "0")}.example.com`,
  description: index % 2 === 0 ? "public-note" : "private-note",
  zone_type: index % 2 === 0 ? ("public" as const) : ("private" as const),
}));

const privateZones = filterZones(zones, "private-note", "private");
assert.equal(privateZones.length, 6);
assert.equal(privateZones.slice(0, pageSize).length, 6);

const searched = filterZones(zones, "zone", "");
assert.equal(searched.length, 12);
assert.deepEqual(
  searched.slice(pageSize, pageSize * 2).map((zone) => zone.domain_name),
  ["zone10.example.com", "zone11.example.com"],
);
assert.equal(filterZones(zones, "missing", "public").length, 0);

const records = [
  { name: "www", type: "A" },
  { name: "www", type: "AAAA" },
  { name: "mail", type: "MX" },
  ...Array.from({ length: 9 }, (_, index) => ({ name: `a${index}`, type: "A" })),
];
const filtered = filterRecords(records, "www", "A");
assert.equal(filtered.length, 1);
assert.equal(filtered[0].type, "A");
const aRecords = filterRecords(records, "", "A");
assert.equal(aRecords.length, 10);
assert.equal(aRecords.slice(pageSize, pageSize * 2).length, 0);
assert.equal(filterRecords(records, "mail", "A").length, 0);
assert.equal(filterRecords(records, "", "").length, records.length);

const fields = emptyRecordFields();
fields.value = "192.0.2.10";
assert.equal(recordValueError("A", composeRecordValue("A", fields)), null);
fields.value = "not-an-ip";
assert.equal(recordValueError("A", composeRecordValue("A", fields)), "A record value must be an IPv4 address.");
fields.value = "2001:db8::1";
assert.equal(recordValueError("AAAA", composeRecordValue("AAAA", fields)), null);
fields.mxPriority = "10";
fields.mxHost = "mail.example.com";
assert.equal(composeRecordValue("MX", fields), "10 mail.example.com");
assert.equal(recordValueError("MX", composeRecordValue("MX", fields)), null);
fields.srvPriority = "1";
fields.srvWeight = "0";
fields.srvPort = "443";
fields.srvTarget = "sip.example.com";
assert.equal(composeRecordValue("SRV", fields), "1 0 443 sip.example.com");
fields.caaFlag = "0";
fields.caaTag = "issue";
fields.caaValue = "letsencrypt.org";
assert.equal(composeRecordValue("CAA", fields), '0 issue "letsencrypt.org"');
assert.equal(recordValueError("CAA", composeRecordValue("CAA", fields)), null);

console.log("frontend filter and record-value checks passed");
