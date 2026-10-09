"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/button";
import { pageSize, TablePager } from "@/components/table-pager";
import { api, ApiError, recordTypes, type DNSRecord, type RecordTypeName } from "@/lib/api";
import { filterRecords } from "@/lib/list-filters";
import { composeRecordValue, fieldsFromValue, recordValueError, type RecordValueFields } from "@/lib/record-value";

const columns: { label: string; numeric?: boolean }[] = [
  { label: "Record name" },
  { label: "Type" },
  { label: "Value" },
  { label: "TTL (seconds)", numeric: true },
  { label: "Actions" },
];

const recordHints: Record<RecordTypeName, string> = {
  A: "IPv4 address, such as 192.0.2.1.",
  AAAA: "IPv6 address, such as 2001:db8::1.",
  CNAME: "Host name that this name points to.",
  TXT: "Text value, such as an SPF or verification string.",
  MX: "Mail exchanger priority and mail server.",
  NS: "Name server host name.",
  PTR: "Host name for the reverse lookup.",
  SRV: "Priority, weight, port, and target.",
  CAA: "Flag, tag, and certification authority value.",
};

export function DnsRecords({
  zoneId,
  onRecordsChange,
}: {
  zoneId: number;
  onRecordsChange?: (count: number) => void;
}) {
  const [records, setRecords] = useState<DNSRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [recordTypeFilter, setRecordTypeFilter] = useState("");
  const [formRecord, setFormRecord] = useState<DNSRecord | "create" | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<DNSRecord | null>(null);
  const [page, setPage] = useState(1);

  const loadRecords = useCallback(
    async (options?: { quiet?: boolean }) => {
      if (!options?.quiet) {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await api<DNSRecord[]>(`/zones/${zoneId}/records`);
        setRecords(data);
        onRecordsChange?.(data.length);
      } catch (err) {
        if (!options?.quiet) {
          setRecords([]);
        }
        setError(err instanceof ApiError ? err.message : "Unable to load DNS records");
      } finally {
        setLoading(false);
      }
    },
    [onRecordsChange, zoneId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await api<DNSRecord[]>(`/zones/${zoneId}/records`);
        if (!cancelled) {
          setRecords(data);
          onRecordsChange?.(data.length);
        }
      } catch (err) {
        if (!cancelled) {
          setRecords([]);
          setError(err instanceof ApiError ? err.message : "Unable to load DNS records");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onRecordsChange, zoneId]);

  const filtersActive = search.trim() !== "" || recordTypeFilter !== "";
  const visibleRecords = useMemo(
    () => filterRecords(records, search, recordTypeFilter),
    [recordTypeFilter, records, search],
  );

  const totalPages = Math.max(1, Math.ceil(visibleRecords.length / pageSize));
  if (page > totalPages) {
    setPage(totalPages);
  }
  const currentPage = Math.min(page, totalPages);
  const pageRecords = visibleRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  let bodyMessage: string | null = null;
  if (loading && records.length === 0) {
    bodyMessage = "Loading records.";
  } else if (error && records.length === 0) {
    bodyMessage = error;
  } else if (visibleRecords.length === 0) {
    bodyMessage = records.length === 0 ? "No records." : "No records match your filters.";
  }

  const countLabel =
    filtersActive && records.length > 0
      ? `${visibleRecords.length} of ${records.length} records`
      : `${records.length} ${records.length === 1 ? "record" : "records"}`;

  return (
    <section className="records-section">
      <div className="section-heading">
        <h2>Records</h2>
        <Button variant="primary" onClick={() => setFormRecord("create")}>
          Create record
        </Button>
      </div>
      {notice ? (
        <div className="notice notice-success" role="status">
          <span>{notice}</span>
          <button className="text-button" type="button" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      ) : null}
      {error && records.length > 0 ? (
        <div className="notice notice-error" role="alert">
          <span>{error}</span>
        </div>
      ) : null}
      <div className="table-card">
      <div className="toolbar">
        <label className="search">
          <span className="sr-only">Filter records</span>
          <Search size={16} strokeWidth={2} aria-hidden="true" />
          <input
            type="search"
            placeholder="Filter records"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="filter">
          <span className="sr-only">Record type</span>
          <select
            value={recordTypeFilter}
            onChange={(event) => {
              setRecordTypeFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All record types</option>
            {recordTypes.map((recordType) => (
              <option key={recordType} value={recordType}>
                {recordType}
              </option>
            ))}
          </select>
        </label>
        {filtersActive ? (
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setSearch("");
              setRecordTypeFilter("");
              setPage(1);
            }}
          >
            Clear filters
          </button>
        ) : null}
        {loading && records.length === 0 ? null : <span className="toolbar-meta">{countLabel}</span>}
      </div>
      <div className="table-wrap">
        <table className="data-table records-table">
          <colgroup>
            <col className="col-name" />
            <col className="col-type" />
            <col className="col-value" />
            <col className="col-ttl" />
            <col className="col-actions" />
          </colgroup>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.label} scope="col" className={column.numeric ? "num" : undefined}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyMessage ? (
              <tr>
                <td
                  className={error && records.length === 0 ? "empty-cell error-cell" : "empty-cell"}
                  colSpan={columns.length}
                  role={bodyMessage === error ? "alert" : undefined}
                >
                  {bodyMessage}
                </td>
              </tr>
            ) : (
              pageRecords.map((record) => (
                <tr key={record.id}>
                  <td className="record-name">{record.name}</td>
                  <td>{record.type}</td>
                  <td className="record-value">{record.value}</td>
                  <td className="num">{record.ttl}</td>
                  <td>
                    <div className="row-actions">
                      <button className="text-button" type="button" onClick={() => setFormRecord(record)}>
                        Edit
                      </button>
                      <button className="text-button" type="button" onClick={() => setDeleteRecord(record)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {visibleRecords.length > 0 ? (
        <TablePager
          page={currentPage}
          totalPages={totalPages}
          totalItems={visibleRecords.length}
          onPrevious={() => setPage(currentPage - 1)}
          onNext={() => setPage(currentPage + 1)}
        />
      ) : null}
      </div>
      {formRecord ? (
        <RecordForm
          zoneId={zoneId}
          record={formRecord === "create" ? null : formRecord}
          onClose={() => setFormRecord(null)}
          onSaved={async (message) => {
            setFormRecord(null);
            setNotice(message);
            await loadRecords({ quiet: true });
          }}
        />
      ) : null}
      {deleteRecord ? (
        <DeleteRecordDialog
          zoneId={zoneId}
          record={deleteRecord}
          onClose={() => setDeleteRecord(null)}
          onDeleted={async () => {
            setNotice(`Deleted ${deleteRecord.name} ${deleteRecord.type}.`);
            setDeleteRecord(null);
            await loadRecords({ quiet: true });
          }}
        />
      ) : null}
    </section>
  );
}

function RecordForm({
  zoneId,
  record,
  onClose,
  onSaved,
}: {
  zoneId: number;
  record: DNSRecord | null;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [name, setName] = useState(record?.name ?? "");
  const [type, setType] = useState<RecordTypeName>(record?.type ?? "A");
  const [fields, setFields] = useState<RecordValueFields>(fieldsFromValue(record?.type ?? "A", record?.value ?? ""));
  const [ttl, setTtl] = useState(record ? String(record.ttl) : "300");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const editing = record !== null;

  function updateField(key: keyof RecordValueFields, next: string) {
    setFields((current) => ({ ...current, [key]: next }));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, pending]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = composeRecordValue(type, fields);
    const message = recordValueError(type, value);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setPending(true);
    const payload = {
      name,
      type,
      value,
      ttl: Number(ttl),
    };
    try {
      if (editing) {
        await api<DNSRecord>(`/zones/${zoneId}/records/${record.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        await onSaved("DNS record updated.");
      } else {
        await api<DNSRecord>(`/zones/${zoneId}/records`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await onSaved("DNS record created.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save DNS record");
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="record-form-title" onSubmit={onSubmit}>
        <header className="modal-header">
          <h2 id="record-form-title">{editing ? "Edit record" : "Create record"}</h2>
          <button className="plain-icon" type="button" aria-label="Close" onClick={onClose} disabled={pending}>
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body">
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <label className="field">
            <span>Record name</span>
            <input name="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={253} autoFocus required />
          </label>
          <label className="field">
            <span>Record type</span>
            <select name="type" value={type} onChange={(event) => setType(event.target.value as RecordTypeName)}>
              {recordTypes.map((recordType) => (
                <option key={recordType} value={recordType}>
                  {recordType}
                </option>
              ))}
            </select>
          </label>
          <p className="field-hint">{recordHints[type]}</p>
          <RecordValueFieldsForm type={type} fields={fields} onChange={updateField} />
          <label className="field">
            <span>TTL</span>
            <input name="ttl" type="number" min={1} max={2147483647} step={1} value={ttl} onChange={(event) => setTtl(event.target.value)} required />
          </label>
        </div>
        <footer className="modal-footer">
          <Button type="button" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={pending}>
            {pending ? "Saving" : editing ? "Save record" : "Create record"}
          </Button>
        </footer>
      </form>
    </div>
  );
}

function valueLabel(type: RecordTypeName) {
  if (type === "A") {
    return "IPv4 address";
  }
  if (type === "AAAA") {
    return "IPv6 address";
  }
  if (type === "CNAME" || type === "PTR") {
    return "Host name";
  }
  if (type === "NS") {
    return "Name server";
  }
  return "Value";
}

function RecordValueFieldsForm({
  type,
  fields,
  onChange,
}: {
  type: RecordTypeName;
  fields: RecordValueFields;
  onChange: (key: keyof RecordValueFields, value: string) => void;
}) {
  if (type === "MX") {
    return (
      <div className="field-grid">
        <label className="field">
          <span>Priority</span>
          <input name="mxPriority" type="number" min={0} max={65535} value={fields.mxPriority} onChange={(event) => onChange("mxPriority", event.target.value)} required />
        </label>
        <label className="field">
          <span>Mail server</span>
          <input name="mxHost" value={fields.mxHost} onChange={(event) => onChange("mxHost", event.target.value)} required />
        </label>
      </div>
    );
  }
  if (type === "SRV") {
    return (
      <div className="field-grid">
        <label className="field">
          <span>Priority</span>
          <input name="srvPriority" type="number" min={0} max={65535} value={fields.srvPriority} onChange={(event) => onChange("srvPriority", event.target.value)} required />
        </label>
        <label className="field">
          <span>Weight</span>
          <input name="srvWeight" type="number" min={0} max={65535} value={fields.srvWeight} onChange={(event) => onChange("srvWeight", event.target.value)} required />
        </label>
        <label className="field">
          <span>Port</span>
          <input name="srvPort" type="number" min={0} max={65535} value={fields.srvPort} onChange={(event) => onChange("srvPort", event.target.value)} required />
        </label>
        <label className="field">
          <span>Target</span>
          <input name="srvTarget" value={fields.srvTarget} onChange={(event) => onChange("srvTarget", event.target.value)} required />
        </label>
      </div>
    );
  }
  if (type === "CAA") {
    return (
      <div className="field-grid">
        <label className="field">
          <span>Flag</span>
          <input name="caaFlag" type="number" min={0} max={255} value={fields.caaFlag} onChange={(event) => onChange("caaFlag", event.target.value)} required />
        </label>
        <label className="field">
          <span>Tag</span>
          <input name="caaTag" value={fields.caaTag} onChange={(event) => onChange("caaTag", event.target.value)} required />
        </label>
        <label className="field field-span">
          <span>Value</span>
          <input name="caaValue" value={fields.caaValue} onChange={(event) => onChange("caaValue", event.target.value)} required />
        </label>
      </div>
    );
  }
  return (
    <label className="field">
      <span>{valueLabel(type)}</span>
      {type === "TXT" ? (
        <textarea name="value" value={fields.value} onChange={(event) => onChange("value", event.target.value)} maxLength={4000} required />
      ) : (
        <input name="value" value={fields.value} onChange={(event) => onChange("value", event.target.value)} maxLength={4000} required />
      )}
    </label>
  );
}

function DeleteRecordDialog({
  zoneId,
  record,
  onClose,
  onDeleted,
}: {
  zoneId: number;
  record: DNSRecord;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, pending]);

  async function onDelete() {
    setError(null);
    setPending(true);
    try {
      await api<void>(`/zones/${zoneId}/records/${record.id}`, { method: "DELETE" });
      await onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to delete DNS record");
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-record-title">
        <header className="modal-header">
          <h2 id="delete-record-title">Delete record</h2>
          <button className="plain-icon" type="button" aria-label="Close" onClick={onClose} disabled={pending}>
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body">
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <p className="dialog-copy">
            Delete <strong>{record.name}</strong> {record.type}? This cannot be undone.
          </p>
        </div>
        <footer className="modal-footer">
          <Button type="button" onClick={onClose} disabled={pending} autoFocus>
            Cancel
          </Button>
          <Button variant="primary" type="button" onClick={onDelete} disabled={pending}>
            {pending ? "Deleting" : "Delete record"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
