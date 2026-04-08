import { useMemo, useState } from "react";

type Order = "asc" | "desc";

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function compare(a: unknown, b: unknown, order: Order): number {
  const aNull = a === null || a === undefined;
  const bNull = b === null || b === undefined;
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  let result: number;
  if (typeof a === "string" && typeof b === "string") {
    result = a.localeCompare(b, undefined, { sensitivity: "base" });
  } else if (typeof a === "number" && typeof b === "number") {
    result = a - b;
  } else {
    result = String(a).localeCompare(String(b));
  }

  return order === "asc" ? result : -result;
}

export default function useSortableTable<T>(
  data: T[],
  defaultKey: string,
  defaultDir: Order = "asc",
) {
  const [orderBy, setOrderBy] = useState(defaultKey);
  const [order, setOrder] = useState<Order>(defaultDir);

  const onSort = (key: string) => {
    if (key === orderBy) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(key);
      setOrder("asc");
    }
  };

  const sorted = useMemo(
    () =>
      [...data].sort((a, b) =>
        compare(getNestedValue(a, orderBy), getNestedValue(b, orderBy), order),
      ),
    [data, orderBy, order],
  );

  return { sorted, orderBy, order, onSort };
}
