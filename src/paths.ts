import type {PathSegment} from "./types";

export function escapePointerSegment(segment: PathSegment): string {
  return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

export function unescapePointerSegment(segment: string): string {
  return segment.replaceAll("~1", "/").replaceAll("~0", "~");
}

export function toPointer(path: PathSegment[]): string {
  if (path.length === 0) return "/";
  return `/${path.map(escapePointerSegment).join("/")}`;
}

export function fromPointer(pointer: string): PathSegment[] {
  if (!pointer || pointer === "/") return [];
  return pointer
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean)
    .map(unescapePointerSegment);
}

export function toFieldPath(path: PathSegment[]): string {
  if (path.length === 0) return "form";
  return path
    .map((part) => (typeof part === "number" ? `[${part}]` : String(part)))
    .join(".")
    .replaceAll(".[", "[");
}

export function getAtPath(source: unknown, path: PathSegment[]): unknown {
  let current = source as any;
  for (const segment of path) {
    if (current == null) return undefined;
    current = current[segment as keyof typeof current];
  }
  return current;
}

export function setAtPath<T>(source: T, path: PathSegment[], value: unknown): T {
  if (path.length === 0) return value as T;

  const [head, ...tail] = path;
  const copy: any = Array.isArray(source)
    ? [...source]
    : isRecord(source)
      ? {...source}
      : typeof head === "number"
        ? []
        : {};

  copy[head] = setAtPath(copy[head], tail, value);
  return copy;
}

export function deleteAtPath<T>(source: T, path: PathSegment[]): T {
  if (path.length === 0) return undefined as T;

  const [head, ...tail] = path;
  if (!isRecord(source) && !Array.isArray(source)) return source;

  const copy: any = Array.isArray(source) ? [...source] : {...source};
  if (tail.length === 0) {
    if (Array.isArray(copy) && typeof head === "number") copy.splice(head, 1);
    else delete copy[head];
    return copy;
  }

  copy[head] = deleteAtPath(copy[head], tail);
  return copy;
}

export function insertArrayItem<T>(source: T, path: PathSegment[], index: number, value: unknown): T {
  const current = getAtPath(source, path);
  const next = Array.isArray(current) ? [...current] : [];
  next.splice(index, 0, value);
  return setAtPath(source, path, next);
}

export function removeArrayItem<T>(source: T, path: PathSegment[], index: number): T {
  const current = getAtPath(source, path);
  if (!Array.isArray(current)) return source;
  const next = [...current];
  next.splice(index, 1);
  return setAtPath(source, path, next);
}

export function moveArrayItem<T>(source: T, path: PathSegment[], from: number, to: number): T {
  const current = getAtPath(source, path);
  if (!Array.isArray(current)) return source;
  if (from < 0 || from >= current.length || to < 0 || to >= current.length) return source;
  const next = [...current];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return setAtPath(source, path, next);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
