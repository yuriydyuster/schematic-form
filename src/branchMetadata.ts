import {fromPointer, toPointer} from "./paths";

export type ArrayPointerRebaseOperation =
  | {type: "insert"; index: number}
  | {type: "remove"; index: number}
  | {type: "move"; from: number; to: number};

export function rebaseArrayPointerRecord<T>(
  record: Record<string, T>,
  arrayPointer: string,
  operation: ArrayPointerRebaseOperation,
): Record<string, T> {
  const output: Record<string, T> = {};

  for (const [pointer, value] of Object.entries(record)) {
    const nextPointer = rebasePointerForArrayOperation(pointer, arrayPointer, operation);
    if (nextPointer) output[nextPointer] = value;
  }

  return output;
}

export function rebasePointerForArrayOperation(
  pointer: string,
  arrayPointer: string,
  operation: ArrayPointerRebaseOperation,
): string | null {
  const arraySegments = fromPointer(arrayPointer).map(String);
  const pointerSegments = fromPointer(pointer).map(String);

  if (pointerSegments.length <= arraySegments.length) return pointer;
  if (!arraySegments.every((segment, index) => pointerSegments[index] === segment)) return pointer;

  const indexSegment = pointerSegments[arraySegments.length];
  if (!isArrayIndexSegment(indexSegment)) return pointer;

  const itemIndex = Number(indexSegment);
  const nextIndex = rebaseArrayItemIndex(itemIndex, operation);
  if (nextIndex == null) return null;

  return toPointer([
    ...arraySegments,
    String(nextIndex),
    ...pointerSegments.slice(arraySegments.length + 1),
  ]);
}

function rebaseArrayItemIndex(index: number, operation: ArrayPointerRebaseOperation): number | null {
  if (operation.type === "insert") return index >= operation.index ? index + 1 : index;
  if (operation.type === "remove") {
    if (index === operation.index) return null;
    return index > operation.index ? index - 1 : index;
  }

  if (operation.from === operation.to) return index;
  if (index === operation.from) return operation.to;
  if (operation.from < operation.to && index > operation.from && index <= operation.to) return index - 1;
  if (operation.to < operation.from && index >= operation.to && index < operation.from) return index + 1;
  return index;
}

function isArrayIndexSegment(segment: string | undefined): segment is string {
  return typeof segment === "string" && /^(0|[1-9]\d*)$/.test(segment);
}
