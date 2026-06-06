import * as HeroUI from "@heroui/react";
import {ArrowDown, ArrowRotateLeft, ArrowUp, Envelope, Eraser, Globe, CircleCheck, Plus, TrashBin} from "@gravity-ui/icons";
import {
  getLocalTimeZone,
  parseAbsoluteToLocal,
  parseDate,
  parseDateTime,
  parseTime,
} from "@internationalized/date";
import type {DateValue, Time} from "@internationalized/date";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";

import type {ArrayPointerRebaseOperation} from "./branchMetadata";
import {rebaseArrayPointerRecord} from "./branchMetadata";
import {
  deleteAtPath,
  fromPointer,
  getAtPath,
  insertArrayItem,
  moveArrayItem,
  setAtPath,
  toFieldPath,
  toPointer,
} from "./paths";
import type {BranchValueCache, SchematicFormDraftPayload} from "./persistence";
import {
  cloneDraftValue,
  createDraftPayload,
  createSchemaFingerprint,
  readDraftPayload,
  removeDraftPayload,
  resolveDraftStorage,
  writeDraftPayload,
} from "./persistence";
import {
  canAddArrayItem,
  defaultArrayItemValue,
  defaultValueForSchema,
  enumValueToKey,
  getBranchSchemas,
  getDefaultBranchIndex,
  getLabel,
  getOrderedPropertyKeys,
  getSchemaType,
  getSingleEnumValue,
  getSupportedFormat,
  isArrayOfStringEnum,
  isDisplayOnlySchema,
  isEnumSchema,
  isLongUnformattedString,
  keyToEnumValue,
  optionLabel,
} from "./schema";
import {resolveSchemaForContext} from "./refResolver";
import {createSchemaValidator} from "./validation";
import type {
  FieldRenderContext,
  JsonPrimitive,
  JsonSchema,
  PathSegment,
  SchematicFormDraftStorage,
  SchematicFormProps,
  SchematicFormState,
  ValidationIssue,
  ValidationMode,
} from "./types";

const H = HeroUI as Record<string, any>;

const Button = H.Button;
const Checkbox = H.Checkbox;
const CheckboxGroup = H.CheckboxGroup;
const Calendar = H.Calendar;
const Chip = H.Chip ?? (({color: _color, size: _size, variant: _variant, ...props}: React.HTMLAttributes<HTMLSpanElement> & {color?: string; size?: string; variant?: string}) =>
  <span {...props} />);
const DateField = H.DateField;
const DatePicker = H.DatePicker;
const Description = H.Description ?? ((props: React.HTMLAttributes<HTMLParagraphElement>) => <p {...props} />);
const ErrorMessage = H.ErrorMessage ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div className="error-message" {...props} />);
const FieldError = H.FieldError ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const Fieldset = H.Fieldset;
const Form = H.Form;
const Input = H.Input;
const InputGroup = H.InputGroup ?? (({fullWidth: _fullWidth, ...props}: React.HTMLAttributes<HTMLDivElement> & {fullWidth?: boolean}) => <div {...props} />);
const Label = H.Label ?? ((props: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props} />);
const ListBox = H.ListBox;
const NumberField = H.NumberField;
const Radio = H.Radio;
const RadioGroup = H.RadioGroup;
const Select = H.Select;
const Slider = H.Slider;
const Spinner = H.Spinner ?? ((props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />);
const Surface = H.Surface;
const Switch = H.Switch;
const TextArea = H.TextArea;
const TextField = H.TextField;
const TimeField = H.TimeField;
const Typography = H.Typography ?? ((props: React.HTMLAttributes<HTMLElement> & {type?: string}) => <p {...props} />);
const TypographyHeading = Typography.Heading ?? (({level = 1, ...props}: React.HTMLAttributes<HTMLHeadingElement> & {level?: 1 | 2 | 3 | 4 | 5 | 6}) =>
  React.createElement(`h${level}`, props));
const TypographyParagraph = Typography.Paragraph ?? (({size = "base", ...props}: React.HTMLAttributes<HTMLParagraphElement> & {size?: "base" | "sm" | "xs"}) =>
  <Typography type={size === "base" ? "body" : `body-${size}`} {...props} />);

const CalendarCell = Calendar?.Cell ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const CalendarGrid = Calendar?.Grid ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const CalendarGridBody = Calendar?.GridBody ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const CalendarGridHeader = Calendar?.GridHeader ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const CalendarHeader = Calendar?.Header ?? ((props: React.HTMLAttributes<HTMLElement>) => <header {...props} />);
const CalendarHeaderCell = Calendar?.HeaderCell ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const CalendarNavButton = Calendar?.NavButton ?? Button;
const CalendarYearPickerCell = Calendar?.YearPickerCell ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const CalendarYearPickerGrid = Calendar?.YearPickerGrid ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const CalendarYearPickerGridBody = Calendar?.YearPickerGridBody ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const CalendarYearPickerTrigger = Calendar?.YearPickerTrigger ?? Button;
const CalendarYearPickerTriggerHeading = Calendar?.YearPickerTriggerHeading ?? ((props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />);
const CalendarYearPickerTriggerIndicator = Calendar?.YearPickerTriggerIndicator ?? ((props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />);
const DateFieldGroup = DateField?.Group ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const DateFieldInput = DateField?.Input ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const DateFieldSegment = DateField?.Segment ?? ((props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />);
const DateFieldSuffix = DateField?.Suffix ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const DatePickerPopover = DatePicker?.Popover ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const DatePickerTrigger = DatePicker?.Trigger ?? Button;
const DatePickerTriggerIndicator = DatePicker?.TriggerIndicator ?? (() => null);
const FieldsetGroup = Fieldset?.Group ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const FieldsetLegend = Fieldset?.Legend ?? ((props: React.HTMLAttributes<HTMLLegendElement>) => <legend {...props} />);
const InputGroupInput = InputGroup?.Input ?? Input;
const InputGroupSuffix = InputGroup?.Suffix ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const NumberFieldGroup = NumberField?.Group ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const NumberFieldInput = NumberField?.Input ?? Input;
const NumberFieldDecrementButton = NumberField?.DecrementButton ?? Button;
const NumberFieldIncrementButton = NumberField?.IncrementButton ?? Button;
const SelectTrigger = Select?.Trigger ?? ((props: React.HTMLAttributes<HTMLButtonElement>) => <button type="button" {...props} />);
const SelectValue = Select?.Value ?? ((props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />);
const SelectIndicator = Select?.Indicator ?? ((props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>v</span>);
const SelectPopover = Select?.Popover ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const ListBoxItem = ListBox?.Item ?? ((props: React.HTMLAttributes<HTMLDivElement> & {id?: string}) => <div {...props} />);
const ListBoxItemIndicator = ListBox?.ItemIndicator ?? (() => null);
const RadioControl = Radio?.Control ?? ((props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />);
const RadioIndicator = Radio?.Indicator ?? ((props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />);
const RadioContent = Radio?.Content ?? ((props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />);
const CheckboxControl = Checkbox?.Control ?? ((props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />);
const CheckboxIndicator = Checkbox?.Indicator ?? ((props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />);
const ChipLabel = Chip?.Label ?? ((props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />);
const CheckboxContent = Checkbox?.Content ?? ((props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />);
const SwitchControl = Switch?.Control ?? ((props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />);
const SwitchThumb = Switch?.Thumb ?? ((props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />);
const SliderOutput = Slider?.Output ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const SliderTrack = Slider?.Track ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const SliderFill = Slider?.Fill ?? (() => null);
const SliderThumb = Slider?.Thumb ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const TimeFieldGroup = TimeField?.Group ?? DateFieldGroup;
const TimeFieldInput = TimeField?.Input ?? DateFieldInput;
const TimeFieldSegment = TimeField?.Segment ?? DateFieldSegment;

const defaultMessages = {
  add: "Add",
  moveUp: "Move up",
  moveDown: "Move down",
  remove: "Remove",
  clean: "Clean",
  reset: "Reset",
  submit: "Submit",
  errorSummaryTitle: "Please review the highlighted fields.",
  selectOption: "Select an option",
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type BranchRenderOptions = {surface?: boolean};
type DraftSaveTarget = {
  storage: SchematicFormDraftStorage;
  key: string;
  payload: SchematicFormDraftPayload;
};
type BranchSelectionState = Record<string, number | null>;
type ObjectExpansionState = Record<string, boolean>;
type BranchSelectionTraversalState = {remainingNodes: number};
const objectExpansionStoragePrefix = "schematic-form:object-expanded:";
const branchSelectionTraversalDepthLimit = 128;
const branchSelectionTraversalNodeLimit = 4000;

function createObjectExpansionStorageKey(schemaFingerprint: string): string {
  return `${objectExpansionStoragePrefix}${schemaFingerprint}`;
}

function readObjectExpansionState(key: string): ObjectExpansionState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
    );
  } catch {
    return {};
  }
}

function writeObjectExpansionState(key: string, state: ObjectExpansionState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Object expansion state is best-effort UI state.
  }
}

export function SchematicForm<TData = unknown>({
  schema,
  value,
  defaultValue,
  onChange,
  onStateChange,
  onSubmit,
  validationMode = "hybrid",
  messages,
  className,
  readOnly = false,
  disabled = false,
  persistence,
  fieldRenderer,
  errorFormatter,
}: SchematicFormProps<TData>) {
  const jsonSchema = schema as JsonSchema;
  const mergedMessages = {...defaultMessages, ...messages};
  const schemaFingerprint = useMemo(() => createSchemaFingerprint(jsonSchema), [jsonSchema]);
  const objectExpansionStorageKey = useMemo(() => createObjectExpansionStorageKey(schemaFingerprint), [schemaFingerprint]);
  const initialData = useMemo(() => {
    const baseData = defaultValue !== undefined
      ? defaultValue as unknown
      : defaultValueForSchema(jsonSchema, {rootSchema: jsonSchema}) ?? {};
    return materializeRequiredImplicitValues(jsonSchema, baseData, jsonSchema);
  }, [defaultValue, jsonSchema]);
  const cleanData = useMemo(() => materializeRequiredImplicitValues(jsonSchema, {}, jsonSchema), [jsonSchema]);
  const initialBranchMetadata = useMemo(() => inferBranchMetadata(jsonSchema, initialData, jsonSchema), [initialData, jsonSchema]);
  const [internalData, setInternalData] = useState<unknown>(initialData);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [branchSelection, setBranchSelection] = useState<BranchSelectionState>({});
  const [branchValueCache, setBranchValueCache] = useState<BranchValueCache>({});
  const [rowIdsByPointer, setRowIdsByPointer] = useState<Record<string, string[]>>({});
  const [objectExpandedByPointer, setObjectExpandedByPointer] = useState<ObjectExpansionState>(() =>
    readObjectExpansionState(objectExpansionStorageKey),
  );
  const rowIdCounter = useRef(0);
  const formRef = useRef<HTMLFormElement | null>(null);
  const draftSaveTimeoutRef = useRef<number | null>(null);
  const latestDraftRef = useRef<DraftSaveTarget | null>(null);
  const objectExpansionHydratedKeyRef = useRef(objectExpansionStorageKey);
  const isControlled = value !== undefined;
  const shouldPersistDraft = persistence != null && !isControlled;
  const draftStorage = useMemo(
    () => (shouldPersistDraft ? resolveDraftStorage(persistence.storage) : null),
    [persistence?.storage, shouldPersistDraft],
  );
  const draftKey = persistence?.key ?? "";
  const draftDebounceMs = persistence?.debounceMs ?? 250;
  const clearPersistedDraftOnValidSubmit = persistence?.clearOnValidSubmit ?? true;
  const [draftHydrated, setDraftHydrated] = useState(!shouldPersistDraft);
  const data = (isControlled ? value : internalData) as unknown;
  const inferredBranchMetadata = useMemo(() => inferBranchMetadata(jsonSchema, data, jsonSchema), [data, jsonSchema]);
  const effectiveBranchSelection = useMemo(() => {
    // Merge inferred selections with user-provided selections, but do not let explicit null
    // entries in `branchSelection` override inferred metadata. Treat `null` as "no override".
    const merged: BranchSelectionState = {...inferredBranchMetadata.branchSelection};
    for (const [pointer, index] of Object.entries(branchSelection)) {
      if (index == null) continue;
      merged[pointer] = index;
    }
    return merged;
  }, [branchSelection, inferredBranchMetadata.branchSelection]);
  const validationSchema = useMemo(
    () => applyBranchSelections(jsonSchema, effectiveBranchSelection, [], jsonSchema),
    [effectiveBranchSelection, jsonSchema],
  );
  const formLabel = getRootSchemaLabel(jsonSchema);

  const validator = useMemo(
    () => createSchemaValidator(validationSchema, errorFormatter),
    [validationSchema, errorFormatter],
  );
  const validation = useMemo(() => validator.validate(data), [validator, data]);
  const issueMap = useMemo(() => groupIssuesByPath(validation.issues), [validation.issues]);
  const publicState = useMemo(
    () =>
      ({
        data: data as TData,
        isValid: validation.isValid,
        errors: validation.errors,
      }) satisfies SchematicFormState<TData>,
    [data, validation.errors, validation.isValid],
  );

  useEffect(() => {
    if (objectExpansionHydratedKeyRef.current === objectExpansionStorageKey) return;
    objectExpansionHydratedKeyRef.current = objectExpansionStorageKey;
    setObjectExpandedByPointer({});
  }, [objectExpansionStorageKey]);

  useEffect(() => {
    if (objectExpansionHydratedKeyRef.current !== objectExpansionStorageKey) return;
    writeObjectExpansionState(objectExpansionStorageKey, objectExpandedByPointer);
  }, [objectExpandedByPointer, objectExpansionStorageKey]);

  const clearScheduledDraftSave = useCallback(() => {
    if (draftSaveTimeoutRef.current == null) return;
    window.clearTimeout(draftSaveTimeoutRef.current);
    draftSaveTimeoutRef.current = null;
  }, []);

  const flushLatestDraft = useCallback(() => {
    clearScheduledDraftSave();
    const latest = latestDraftRef.current;
    if (!latest) return;
    writeDraftPayload(latest.storage, latest.key, latest.payload);
  }, [clearScheduledDraftSave]);

  useEffect(() => {
    if (!shouldPersistDraft) {
      latestDraftRef.current = null;
      setDraftHydrated(true);
      return;
    }

    setDraftHydrated(false);
    if (!draftStorage || !draftKey) {
      setDraftHydrated(true);
      return;
    }

    const draft = readDraftPayload(draftStorage, draftKey, schemaFingerprint);
    if (draft) {
      const restoredData = restoreEmptyBranchSelectionValues(draft.data, draft.branchSelection);
      setInternalData(materializeRequiredImplicitValues(jsonSchema, restoredData, jsonSchema));
      const restoredBranchMetadata = inferBranchMetadata(jsonSchema, restoredData, jsonSchema);
      setBranchSelection({...restoredBranchMetadata.branchSelection, ...draft.branchSelection});
      setBranchValueCache(draft.branchValueCache);
    }
    setDraftHydrated(true);
  }, [draftKey, draftStorage, jsonSchema, schemaFingerprint, shouldPersistDraft]);

  useEffect(() => {
    if (!shouldPersistDraft || !draftHydrated || !draftStorage || !draftKey) {
      latestDraftRef.current = null;
      clearScheduledDraftSave();
      return;
    }

    const payload = createDraftPayload({
      schemaFingerprint,
      data,
      branchSelection: effectiveBranchSelection,
      branchValueCache,
    });
    latestDraftRef.current = {storage: draftStorage, key: draftKey, payload};

    clearScheduledDraftSave();
    draftSaveTimeoutRef.current = window.setTimeout(() => {
      writeDraftPayload(draftStorage, draftKey, payload);
      if (latestDraftRef.current?.payload === payload) draftSaveTimeoutRef.current = null;
    }, Math.max(0, draftDebounceMs));

    return clearScheduledDraftSave;
  }, [
    branchSelection,
    branchValueCache,
    clearScheduledDraftSave,
    data,
    draftDebounceMs,
    draftHydrated,
    draftKey,
    draftStorage,
    effectiveBranchSelection,
    schemaFingerprint,
    shouldPersistDraft,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.addEventListener("pagehide", flushLatestDraft);
    return () => {
      window.removeEventListener("pagehide", flushLatestDraft);
      flushLatestDraft();
    };
  }, [flushLatestDraft]);

  useEffect(() => {
    if (!draftHydrated) return;
    onStateChange?.(publicState);
  }, [draftHydrated, onStateChange, publicState]);

  const commitData = useCallback(
    (nextData: unknown) => {
      if (!isControlled) setInternalData(nextData);
      onChange?.(nextData as TData);
    },
    [isControlled, onChange],
  );

  const setFieldValue = useCallback(
    (path: PathSegment[], fieldSchema: JsonSchema, nextValue: unknown, required: boolean) => {
      const type = getSchemaType(fieldSchema, {rootSchema: jsonSchema});
      const shouldDeleteEmptyString = type === "string" && nextValue === "" && fieldSchema.minLength !== 0;
      const shouldDeleteEmptyArray = !required && type === "array" && Array.isArray(nextValue) && nextValue.length === 0;
      const shouldDeleteUndefined = nextValue === undefined;
      const nextData =
        shouldDeleteUndefined || shouldDeleteEmptyString || shouldDeleteEmptyArray
          ? deleteAtPath(data, path)
          : setAtPath(data, path, nextValue);
      commitData(nextData);
    },
    [commitData, data, jsonSchema],
  );

  const markTouched = useCallback((pointer: string) => {
    setTouched((current) => ({...current, [pointer]: true}));
  }, []);

  const shouldShowIssues = useCallback(
    (pointer: string) => {
      if (validationMode === "change") return true;
      if (validationMode === "submit") return submitted;
      if (validationMode === "blur") return Boolean(touched[pointer]);
      return submitted || Boolean(touched[pointer]);
    },
    [submitted, touched, validationMode],
  );

  const getVisibleIssues = useCallback(
    (pointer: string) => (shouldShowIssues(pointer) ? issueMap.get(pointer) ?? [] : []),
    [issueMap, shouldShowIssues],
  );

  const getVisibleIssuesUnderPointer = useCallback(
    (pointer: string) => {
      const prefix = pointer === "/" ? "/" : `${pointer}/`;
      return validation.issues.filter((issue) => {
        if (issue.path !== pointer && !issue.path.startsWith(prefix)) return false;
        return shouldShowIssues(issue.path);
      });
    },
    [shouldShowIssues, validation.issues],
  );

  const setObjectExpanded = useCallback((pointer: string, expanded: boolean) => {
    setObjectExpandedByPointer((current) => ({...current, [pointer]: expanded}));
  }, []);

  const expandObjectAncestors = useCallback((pointer: string) => {
    const ancestors = getPointerAncestors(pointer);
    if (ancestors.length === 0) return;
    setObjectExpandedByPointer((current) => {
      const next = {...current};
      for (const ancestor of ancestors) next[ancestor] = true;
      return next;
    });
  }, []);

  const expandObjectAncestorsForIssue = useCallback((issue: ValidationIssue | undefined) => {
    if (!issue) return;
    expandObjectAncestors(issue.path);
  }, [expandObjectAncestors]);

  const focusSummaryPointer = useCallback(
    (pointer: string) => {
      if (!pointer) return;
      expandObjectAncestors(pointer);
      focusPointerWithRetry(formRef.current, pointer);
    },
    [expandObjectAncestors],
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (isSubmitting) return;

      setSubmitted(true);
      const nextState = {
        data: data as TData,
        isValid: validation.isValid,
        errors: validation.errors,
      };

      if (!validation.isValid) {
        expandObjectAncestorsForIssue(validation.issues[0]);
        window.setTimeout(() => focusFirstIssue(formRef.current, validation.issues), 0);
      }

      if (validation.isValid && clearPersistedDraftOnValidSubmit && draftStorage && draftKey) {
        clearScheduledDraftSave();
        latestDraftRef.current = null;
        removeDraftPayload(draftStorage, draftKey);
      }

      const submitResult = onSubmit?.(nextState, event);
      if (isPromiseLike(submitResult)) {
        setSubmitting(true);
        void submitResult.finally(() => setSubmitting(false)).catch(() => undefined);
      }
    },
    [
      clearPersistedDraftOnValidSubmit,
      clearScheduledDraftSave,
      data,
      draftKey,
      draftStorage,
      expandObjectAncestorsForIssue,
      isSubmitting,
      onSubmit,
      validation.errors,
      validation.isValid,
      validation.issues,
    ],
  );

  const resetInteractionState = useCallback(() => {
    setTouched({});
    setSubmitted(false);
    setBranchValueCache({});
    setRowIdsByPointer({});
    setObjectExpandedByPointer({});
    rowIdCounter.current = 0;
  }, []);

  const handleClean = useCallback(() => {
    resetInteractionState();
    setBranchSelection({});
    commitData(cleanData);
  }, [cleanData, commitData, resetInteractionState]);

  const handleReset = useCallback(() => {
    resetInteractionState();
    setBranchSelection(initialBranchMetadata.branchSelection);
    if (draftStorage && draftKey) {
      clearScheduledDraftSave();
      latestDraftRef.current = null;
      removeDraftPayload(draftStorage, draftKey);
    }

    commitData(initialData);
  }, [
    clearScheduledDraftSave,
    commitData,
    draftKey,
    draftStorage,
    initialBranchMetadata.branchSelection,
    initialData,
    resetInteractionState,
  ]);

  const context: RendererContext<TData> = {
    data,
    disabled,
    readOnly,
    fieldRenderer,
    formRef,
    getVisibleIssues,
    getVisibleIssuesUnderPointer,
    issueMap,
    markTouched,
    messages: mergedMessages,
    rowIdsByPointer,
    setBranchSelection,
    branchSelection: effectiveBranchSelection,
    setBranchValueCache,
    branchValueCache,
    setFieldValue,
    setRowIdsByPointer,
    rebaseBranchMetadata(arrayPointer, operation) {
      setBranchSelection((current) => rebaseArrayPointerRecord(current, arrayPointer, operation));
      setBranchValueCache((current) => rebaseArrayPointerRecord(current, arrayPointer, operation));
    },
    commitData,
    makeRowId() {
      rowIdCounter.current += 1;
      return `sf-row-${rowIdCounter.current}`;
    },
    objectExpandedByPointer,
    rootSchema: jsonSchema,
    setObjectExpanded,
    focusSummaryPointer,
  };

  return (
    <div className={cx("schematic-form", className)}>
      <Form
        ref={formRef}
        aria-label={formLabel || "Schematic form"}
        className="schematic-form__form"
        validationBehavior="aria"
        onSubmit={handleSubmit}
      >
        {submitted && validation.errors.length > 0 ? (
          <ErrorSummary title={mergedMessages.errorSummaryTitle} errors={validation.errors} />
        ) : null}
        {renderSchema(jsonSchema, [], false, context)}
        <div className="schematic-form__form-actions">
          <Button fullWidth isDisabled={disabled || isSubmitting} type="button" variant="secondary" onPress={handleClean}>
            <ButtonIcon icon={Eraser} />
            {mergedMessages.clean}
          </Button>
          {defaultValue !== undefined ? (
            <Button fullWidth isDisabled={disabled || isSubmitting} type="button" variant="secondary" onPress={handleReset}>
              <ButtonIcon icon={ArrowRotateLeft} />
              {mergedMessages.reset}
            </Button>
          ) : null}
          <Button fullWidth isDisabled={disabled} isPending={isSubmitting} type="submit">
            {({isPending}: {isPending: boolean}) => (
              <>
                {isPending ? <Spinner color="current" size="sm" /> : <ButtonIcon icon={CircleCheck} />}
                {mergedMessages.submit}
              </>
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
}

type RendererContext<TData> = {
  data: unknown;
  disabled: boolean;
  readOnly: boolean;
  fieldRenderer?: SchematicFormProps<TData>["fieldRenderer"];
  formRef: React.RefObject<HTMLFormElement | null>;
  getVisibleIssues(pointer: string): ValidationIssue[];
  getVisibleIssuesUnderPointer(pointer: string): ValidationIssue[];
  issueMap: Map<string, ValidationIssue[]>;
  markTouched(pointer: string): void;
  messages: typeof defaultMessages;
  rowIdsByPointer: Record<string, string[]>;
  setBranchSelection: React.Dispatch<React.SetStateAction<BranchSelectionState>>;
  branchSelection: BranchSelectionState;
  setBranchValueCache: React.Dispatch<React.SetStateAction<BranchValueCache>>;
  branchValueCache: BranchValueCache;
  setFieldValue(path: PathSegment[], schema: JsonSchema, value: unknown, required: boolean): void;
  setRowIdsByPointer: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  rebaseBranchMetadata(arrayPointer: string, operation: ArrayPointerRebaseOperation): void;
  commitData(data: unknown): void;
  makeRowId(): string;
  objectExpandedByPointer: ObjectExpansionState;
  rootSchema: JsonSchema;
  setObjectExpanded(pointer: string, expanded: boolean): void;
  focusSummaryPointer(pointer: string): void;
};

function renderSchema<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  context: RendererContext<TData>,
  refStack: string[] = [],
): React.ReactNode {
  const resolved = resolveRenderSchema(schema, context, refStack);
  schema = resolved.schema;

  if (isDisplayOnlySchema(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack})) return renderDisplayOnly(schema, path);

  const branch = getBranchSchemas(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack});
  if (branch) return renderBranch(schema, path, required, branch.branches, context);

  const pointer = toPointer(path);
  const fieldPath = toFieldPath(path);
  const label = getLabel(schema, path, "Form");
  const value = getAtPath(context.data, path);
  const issues = context.getVisibleIssues(pointer);
  const custom = context.fieldRenderer?.({
    schema,
    path,
    pointer,
    fieldPath,
    label,
    required,
    value,
    issues,
    setValue: (nextValue) => context.setFieldValue(path, schema, nextValue, required),
  } satisfies FieldRenderContext);

  if (custom !== undefined) {
    return (
      <div className="schematic-form__field" data-sf-path={pointer} key={pointer}>
        {custom}
      </div>
    );
  }

  const type = getSchemaType(schema);
  if (type === "object") return renderObject(schema, path, context, resolved.refStack);
  if (type === "array") return renderArray(schema, path, required, context, resolved.refStack);
  if (isEnumSchema(schema)) return renderScalarEnum(schema, path, required, context);
  if (type === "string") return renderString(schema, path, required, context);
  if (type === "number" || type === "integer") return renderNumber(schema, path, required, context);
  if (type === "boolean") return renderBoolean(schema, path, required, context);

  return null;
}

function renderObject<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  context: RendererContext<TData>,
  refStack: string[] = [],
) {
  const pointer = toPointer(path);
  const isRoot = path.length === 0;

  if (!isRoot) {
    const label = getObjectFieldsetLabel(schema, path, {});
    const expanded = context.objectExpandedByPointer[pointer] ?? true;
    const nestedIssues = context.getVisibleIssuesUnderPointer(pointer);

    return (
      <Surface
        className="schematic-form__surface schematic-form__object-surface"
        data-sf-invalid={nestedIssues.length > 0 ? "true" : undefined}
        data-sf-collapsed={expanded ? undefined : "true"}
        data-sf-path={pointer}
        key={pointer}
        variant="transparent"
      >
        {renderObjectFieldset(schema, path, context, {collapsed: !expanded}, refStack)}
      </Surface>
    );
  }

  return (
    <Surface className="schematic-form__surface" data-sf-path={pointer} key={pointer} variant="transparent">
      {renderObjectFieldset(schema, path, context, {root: isRoot}, refStack)}
    </Surface>
  );
}

function renderObjectFieldset<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  context: RendererContext<TData>,
  options: {root?: boolean; forceTitle?: boolean; omitUntitledLegend?: boolean; collapsed?: boolean; collapsible?: boolean} = {},
  refStack: string[] = [],
) {
  const resolved = resolveRenderSchema(schema, context, refStack);
  schema = resolved.schema;
  const pointer = toPointer(path);
  const label = getObjectFieldsetLabel(schema, path, options);
  const expanded = context.objectExpandedByPointer[pointer] ?? true;
  const collapsed = options.collapsed ?? (options.collapsible ? !expanded : undefined);
  const keys = getOrderedPropertyKeys(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack});
  const required = new Set(schema.required ?? []);
  const summary = collapsed === true ? getCollapsedObjectSummary(schema, path, context, resolved.refStack) : null;
  const description = options.root ? (
    schema.description ? (
      <TypographyParagraph color="muted" size="base" slot={null}>
        {schema.description}
      </TypographyParagraph>
    ) : null
  ) : (
    schema.description ? <FieldDescription>{schema.description}</FieldDescription> : null
  );
  const fieldGroup = (
    <FieldsetGroup className="schematic-form__field-group">
      {collapsed == null ? description : null}
      {keys.map((key) => {
        const child = schema.properties?.[key];
        if (!child) return null;
        const childIsRequired = required.has(key);
        if (childIsRequired && isSingleEnumSchema(child, context.rootSchema, resolved.refStack)) return null;
        return renderSchema(child, [...path, key], childIsRequired, context, resolved.refStack);
      })}
    </FieldsetGroup>
  );

  return (
    <Fieldset className={cx("schematic-form__fieldset", options.collapsible ? "schematic-form__object-fieldset--collapsible" : undefined)}>
      {collapsed != null ? (
        <ObjectFieldsetHeader
          collapsed={collapsed}
          disabled={context.disabled}
          label={label}
          onToggle={() => context.setObjectExpanded(pointer, !expanded)}
        />
      ) : options.root ? (
        <>
          {label ? <TypographyHeading level={2} slot={null}>{label}</TypographyHeading> : null}
        </>
      ) : (
        label ? <FieldsetLegend>{label}</FieldsetLegend> : null
      )}
      {collapsed != null && description ? (
        <div className="schematic-form__object-description">{description}</div>
      ) : null}
      {collapsed === true && summary ? <CollapsedObjectSummary summary={summary} onNavigate={context.focusSummaryPointer} /> : null}
      {collapsed != null ? (
        <div className="schematic-form__object-content" hidden={collapsed}>
          {fieldGroup}
        </div>
      ) : (
        fieldGroup
      )}
    </Fieldset>
  );
}

function getObjectFieldsetLabel(
  schema: JsonSchema,
  path: PathSegment[],
  options: {root?: boolean; forceTitle?: boolean; omitUntitledLegend?: boolean},
): string | undefined {
  if (options.root) return getRootSchemaLabel(schema);
  if (options.forceTitle) return getLabel(schema, path, "Form");
  if (options.omitUntitledLegend) return typeof schema.title === "string" && schema.title.trim() ? schema.title.trim() : undefined;
  return getExplicitOrPropertyLabel(schema, path);
}

function ObjectFieldsetHeader({
  collapsed,
  disabled,
  label,
  onToggle,
}: {
  collapsed: boolean;
  disabled: boolean;
  label?: string;
  onToggle(): void;
}) {
  if (!label) {
    return (
      <div className="schematic-form__object-header">
        <span aria-hidden="true" className="schematic-form__object-header-label" />
        <ObjectCollapseToggle collapsed={collapsed} disabled={disabled} label={label} onToggle={onToggle} />
      </div>
    );
  }

  return (
    <FieldsetLegend className="schematic-form__object-header">
      <span className="schematic-form__object-header-label">{label}</span>
      <ObjectCollapseToggle collapsed={collapsed} disabled={disabled} label={label} onToggle={onToggle} />
    </FieldsetLegend>
  );
}

function ObjectCollapseToggle({
  collapsed,
  disabled,
  label,
  onToggle,
}: {
  collapsed: boolean;
  disabled: boolean;
  label?: string;
  onToggle(): void;
}) {
  const expanded = !collapsed;
  return (
    <button
      aria-expanded={expanded}
      aria-label={`${expanded ? "Collapse" : "Expand"} ${label ?? "object section"}`}
      className="schematic-form__object-toggle"
      disabled={disabled}
      type="button"
      onClick={onToggle}
    >
      <span
        aria-hidden="true"
        className="schematic-form__object-toggle-icon"
        data-expanded={expanded ? "true" : undefined}
      />
    </button>
  );
}

const collapsedObjectSummaryLimit = 10;
const collapsedObjectSummaryTextLimit = 20;
const collapsedObjectSummaryTraversalDepthLimit = 128;
const collapsedObjectSummaryTraversalNodeLimit = 2000;
const chipNavigationViewportBottomOffset = 100;

type CollapsedObjectSummary = {
  items: Array<{label: string; value?: string; invalid?: boolean; pointer?: string; explicitLabel?: boolean; navigable?: boolean}>;
  hasOverflow: boolean;
  hasInvalidOverflow: boolean;
  firstInvalidOverflowPointer?: string;
};

type CollapsedObjectSummaryTraversalState = {
  items: CollapsedObjectSummary["items"];
  totalItems: number;
  hasInvalidOverflow: boolean;
  firstInvalidOverflowPointer?: string;
  remainingNodes: number;
  activeValues: WeakSet<object>;
};

function CollapsedObjectSummary({summary, onNavigate}: {summary: CollapsedObjectSummary; onNavigate(pointer: string): void}) {
  if (summary.items.length === 0 && !summary.hasOverflow) return null;
  const overflowIsClickable = summary.hasInvalidOverflow && typeof summary.firstInvalidOverflowPointer === "string";
  return (
    <div className="schematic-form__object-summary" aria-label="Collapsed object values">
      {summary.items.map((item, index) => {
        const isClickable = item.explicitLabel && item.pointer && item.navigable !== false;
        return (
          <Chip
            className={cx("schematic-form__object-summary-chip", isClickable ? "schematic-form__object-summary-chip--clickable" : undefined)}
            color={item.invalid ? "danger" : "default"}
            data-clickable={isClickable ? "true" : undefined}
            key={`${item.label}-${item.value ?? ""}-${index}`}
            size="sm"
            tabIndex={isClickable ? 0 : undefined}
            title={item.value == null ? item.label : `${item.label}: ${item.value}`}
            variant={item.invalid ? "soft" : "primary"}
            onClick={isClickable ? () => onNavigate(item.pointer as string) : undefined}
            onKeyDown={isClickable ? (event: React.KeyboardEvent<HTMLElement>) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onNavigate(item.pointer as string);
            } : undefined}
          >
            <ChipLabel>
              {trimSummaryText(item.label)}
              {item.value == null ? null : (
                <>
                  {": "}
                  <strong>{trimSummaryText(item.value)}</strong>
                </>
              )}
            </ChipLabel>
          </Chip>
        );
      })}
      {summary.hasOverflow ? (
        <Chip
          className={cx("schematic-form__object-summary-chip", overflowIsClickable && "schematic-form__object-summary-chip--clickable")}
          color={summary.hasInvalidOverflow ? "danger" : "default"}
          data-clickable={overflowIsClickable ? "true" : undefined}
          size="sm"
          tabIndex={overflowIsClickable ? 0 : undefined}
          variant={summary.hasInvalidOverflow ? "soft" : "primary"}
          onClick={overflowIsClickable ? () => onNavigate(summary.firstInvalidOverflowPointer as string) : undefined}
          onKeyDown={overflowIsClickable ? (event: React.KeyboardEvent<HTMLElement>) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onNavigate(summary.firstInvalidOverflowPointer as string);
          } : undefined}
        >
          ...
        </Chip>
      ) : null}
    </div>
  );
}

function getCollapsedObjectSummary<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  context: RendererContext<TData>,
  refStack: string[] = [],
): CollapsedObjectSummary {
  const traversal: CollapsedObjectSummaryTraversalState = {
    items: [],
    totalItems: 0,
    hasInvalidOverflow: false,
    remainingNodes: collapsedObjectSummaryTraversalNodeLimit,
    activeValues: new WeakSet<object>(),
  };
  collectCollapsedObjectSummaryItems(schema, path, getAtPath(context.data, path), false, context, refStack, traversal);
  return {
    items: traversal.items,
    hasOverflow: traversal.totalItems > collapsedObjectSummaryLimit,
    hasInvalidOverflow: traversal.hasInvalidOverflow,
    firstInvalidOverflowPointer: traversal.firstInvalidOverflowPointer,
  };
}

function pushCollapsedSummaryItem(
  item: {label: string; value?: string; invalid?: boolean; pointer?: string; explicitLabel?: boolean; navigable?: boolean},
  state: CollapsedObjectSummaryTraversalState,
) {
  const index = state.totalItems;
  state.totalItems += 1;
  if (index < collapsedObjectSummaryLimit) {
    state.items.push(item);
    return;
  }
  if (item.invalid) {
    state.hasInvalidOverflow = true;
    if (!state.firstInvalidOverflowPointer && item.pointer && item.navigable !== false) {
      state.firstInvalidOverflowPointer = item.pointer;
    }
  }
}

function collectCollapsedObjectSummaryItems<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  value: unknown,
  required: boolean,
  context: RendererContext<TData>,
  refStack: string[],
  state: CollapsedObjectSummaryTraversalState,
  depth = 0,
) {
  if (depth > collapsedObjectSummaryTraversalDepthLimit) return;
  if (state.remainingNodes <= 0) return;
  if (state.totalItems > collapsedObjectSummaryLimit && state.hasInvalidOverflow) return;
  state.remainingNodes -= 1;

  const resolved = resolveRenderSchema(schema, context, refStack);
  schema = resolved.schema;
  const pointer = toPointer(path);
  const explicitLabel = hasExplicitCollapsedSummaryLabel(schema);
  const navigable = isCollapsedSummaryItemNavigable(schema, required, context.rootSchema, resolved.refStack);

  if (isDisplayOnlySchema(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack})) return;

  const branch = getBranchSchemas(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack});
  if (branch) {
    const selected = getSelectedSummaryBranch(schema, path, branch.branches, context, resolved.refStack);
    if (selected) {
      collectCollapsedObjectSummaryItems(selected, path, value, required, context, resolved.refStack, state, depth + 1);
    } else {
      // Try to infer the branch from the actual value before marking as invalid.
      const inferredIndex = inferBranchIndexFromValue(value, branch.branches, context.rootSchema, resolved.refStack);
      if (inferredIndex != null) {
        collectCollapsedObjectSummaryItems(
          branch.branches[inferredIndex],
          path,
          value,
          required,
          context,
          resolved.refStack,
          state,
          depth + 1,
        );
      } else if (required) {
        pushCollapsedSummaryItem({label: getCollapsedSummaryLabel(schema, path), invalid: true, pointer, explicitLabel, navigable}, state);
      }
    }
    return;
  }

  const type = getSchemaType(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack});

  if (type === "object") {
    if (!isRecord(value)) {
      if (required) pushCollapsedSummaryItem({label: getCollapsedSummaryLabel(schema, path), invalid: true, pointer, explicitLabel, navigable}, state);
      return;
    }
    if (state.activeValues.has(value)) return;
    state.activeValues.add(value);
    const requiredKeys = new Set(schema.required ?? []);
    try {
      for (const key of getOrderedPropertyKeys(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack})) {
        if (state.totalItems > collapsedObjectSummaryLimit && state.hasInvalidOverflow) return;
        if (state.remainingNodes <= 0) return;
        const child = schema.properties?.[key];
        if (!child) continue;
        collectCollapsedObjectSummaryItems(
          child,
          [...path, key],
          value[key],
          requiredKeys.has(key),
          context,
          resolved.refStack,
          state,
          depth + 1,
        );
      }
    } finally {
      state.activeValues.delete(value);
    }
    return;
  }

  if (type === "array") {
    if (!Array.isArray(value) || value.length === 0) {
      if (required) pushCollapsedSummaryItem({label: getCollapsedSummaryLabel(schema, path), invalid: true, pointer, explicitLabel, navigable}, state);
      return;
    }
    if (state.activeValues.has(value)) return;
    state.activeValues.add(value);
    const itemSchema = getSingleArrayItemSchema(schema, context.rootSchema, resolved.refStack);
    if (!itemSchema) {
      state.activeValues.delete(value);
      return;
    }
    try {
      value.forEach((item, index) => {
        if (state.totalItems > collapsedObjectSummaryLimit && state.hasInvalidOverflow) return;
        if (state.remainingNodes <= 0) return;
        collectCollapsedObjectSummaryItems(
          withIndexedArrayItemTitle(itemSchema, index),
          [...path, index],
          item,
          true,
          context,
          resolved.refStack,
          state,
          depth + 1,
        );
      });
    } finally {
      state.activeValues.delete(value);
    }
    return;
  }

  const issues = context.issueMap.get(toPointer(path)) ?? [];
  const hasValue = hasCollapsedSummaryValue(value);
  const invalid = issues.length > 0 || (required && !hasValue);
  if (invalid && (required || hasValue)) {
    pushCollapsedSummaryItem({
      label: getCollapsedSummaryLabel(schema, path),
      value: hasValue ? formatCollapsedSummaryValue(value) : undefined,
      invalid: true,
      pointer,
      explicitLabel,
      navigable,
    }, state);
    return;
  }

  if (!hasValue) return;

  pushCollapsedSummaryItem({
    label: getCollapsedSummaryLabel(schema, path),
    value: formatCollapsedSummaryValue(value),
    pointer,
    explicitLabel,
    navigable,
  }, state);
}

function isCollapsedSummaryItemNavigable(
  schema: JsonSchema,
  required: boolean,
  rootSchema: JsonSchema,
  refStack: string[],
): boolean {
  if (!required) return true;
  return !isSingleEnumSchema(schema, rootSchema, refStack);
}

function getSelectedSummaryBranch<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  branches: JsonSchema[],
  context: RendererContext<TData>,
  refStack: string[],
): JsonSchema | undefined {
  const pointer = toPointer(path);
  const hasExplicit = Object.prototype.hasOwnProperty.call(context.branchSelection, pointer);
  const explicitValue = hasExplicit ? context.branchSelection[pointer] : undefined;

  // If there's an explicit numeric selection, use it when valid.
  if (hasExplicit && explicitValue != null && typeof explicitValue === "number" && explicitValue >= 0 && explicitValue < branches.length) {
    return branches[explicitValue];
  }

  // Otherwise fall back to the schema's default branch index (covers explicit null or no explicit selection).
  const defaultIndex = getDefaultBranchIndex(schema, branches, {rootSchema: context.rootSchema, refStack});
  return defaultIndex == null ? undefined : branches[defaultIndex];
}

function hasCollapsedSummaryValue(value: unknown): value is JsonPrimitive {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return typeof value === "number" || typeof value === "boolean";
}

function formatCollapsedSummaryValue(value: JsonPrimitive): string {
  if (typeof value === "boolean") return value ? "On" : "Off";
  return optionLabel(value);
}

function getCollapsedSummaryLabel(schema: JsonSchema, path: PathSegment[]): string {
  if (typeof schema.title === "string" && schema.title.trim()) return schema.title.trim();
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const segment = path[index];
    if (typeof segment === "string" && segment.trim()) return segment;
  }
  return getLabel(schema, path, "Item");
}

function hasExplicitCollapsedSummaryLabel(schema: JsonSchema): boolean {
  return typeof schema.title === "string" && schema.title.trim().length > 0;
}

function trimSummaryText(value: string): string {
  const symbols = Array.from(value);
  return symbols.length > collapsedObjectSummaryTextLimit
    ? `${symbols.slice(0, collapsedObjectSummaryTextLimit).join("")}...`
    : value;
}

function getArrayItemActionLabel(schema: JsonSchema): string {
  return typeof schema.title === "string" && schema.title.trim() ? schema.title.trim() : "Item";
}

function renderArray<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  context: RendererContext<TData>,
  refStack: string[] = [],
) {
  const resolved = resolveRenderSchema(schema, context, refStack);
  schema = resolved.schema;
  if (isArrayOfStringEnum(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack})) {
    return renderStringEnumArray(schema, path, required, context, resolved.refStack);
  }

  const pointer = toPointer(path);
  const label = getLabel(schema, path, "Item");
  const issues = context.getVisibleIssues(pointer);
  const value = getAtPath(context.data, path);
  const items = Array.isArray(value) ? value : [];
  const rowIds = getRowIds(context, pointer, items.length);
  const canAdd = canAddArrayItem(schema, items.length);
  const itemSchema = getSingleArrayItemSchema(schema, context.rootSchema) ?? {};
  const itemLabel = getArrayItemActionLabel(itemSchema);

  const addItem = () => {
    if (!canAdd) return;
    const isBranchItem = getBranchSchemas(itemSchema, {rootSchema: context.rootSchema}) != null;
    const newItem = isBranchItem
      ? undefined
      : materializeRequiredImplicitValues(
          itemSchema,
          defaultArrayItemValue(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack}),
          context.rootSchema,
        );
    const newItemPointer = toPointer([...path, items.length]);
    context.rebaseBranchMetadata(pointer, {type: "insert", index: items.length});
    if (isBranchItem) {
      context.setBranchSelection((current) => ({...current, [newItemPointer]: null}));
    }
    context.commitData(insertArrayItem(context.data, path, items.length, newItem));
    context.setRowIdsByPointer((current) => ({
      ...current,
      [pointer]: [...getRowIds(context, pointer, items.length), context.makeRowId()],
    }));
  };

  const removeItem = (index: number) => {
    const ids = getRowIds(context, pointer, items.length);
    context.rebaseBranchMetadata(pointer, {type: "remove", index});
    const nextItems = Array.isArray(value) ? [...value] : [];
    nextItems.splice(index, 1);
    context.setFieldValue(path, schema, nextItems, required);
    context.setRowIdsByPointer((current) => ({
      ...current,
      [pointer]: ids.filter((_, idIndex) => idIndex !== index),
    }));
  };

  const moveItem = (from: number, to: number) => {
    const ids = getRowIds(context, pointer, items.length);
    context.rebaseBranchMetadata(pointer, {type: "move", from, to});
    context.commitData(moveArrayItem(context.data, path, from, to));
    const nextIds = [...ids];
    const [id] = nextIds.splice(from, 1);
    nextIds.splice(to, 0, id);
    context.setRowIdsByPointer((current) => ({...current, [pointer]: nextIds}));
  };

  return (
    <Surface className="schematic-form__surface" data-sf-path={pointer} key={pointer} variant="transparent">
      <Fieldset className="schematic-form__fieldset">
        {label ? <RequiredFieldsetLegend required={required}>{label}</RequiredFieldsetLegend> : null}
        <FieldsetGroup className="schematic-form__field-group">
          <SchemaFieldHelp description={schema.description} issues={issues} />
          <div className="schematic-form__array">
            <div className="schematic-form__array-items">
              {items.map((_, index) => {
                const itemPath = [...path, index];
                const itemPointer = toPointer(itemPath);
                return (
                  <Surface
                    className="schematic-form__surface schematic-form__array-row"
                    data-sf-path={itemPointer}
                    key={rowIds[index] ?? `${pointer}-${index}`}
                    variant="transparent"
                  >
                    {renderArrayItemSchema(withIndexedArrayItemTitle(itemSchema, index), itemPath, context)}
                    <div className="schematic-form__row-actions">
                      <Button
                        fullWidth
                        isDisabled={context.disabled || index === 0}
                        type="button"
                        variant="secondary"
                        onPress={() => moveItem(index, index - 1)}
                      >
                        <ButtonIcon icon={ArrowUp} />
                        <span>{context.messages.moveUp}</span>
                      </Button>
                      <Button
                        fullWidth
                        isDisabled={context.disabled || index === items.length - 1}
                        type="button"
                        variant="secondary"
                        onPress={() => moveItem(index, index + 1)}
                      >
                        <ButtonIcon icon={ArrowDown} />
                        <span>{context.messages.moveDown}</span>
                      </Button>
                      <Button
                        fullWidth
                        isDisabled={context.disabled}
                        type="button"
                        variant="danger-soft"
                        onPress={() => removeItem(index)}
                      >
                        <ButtonIcon icon={TrashBin} />
                        <span>{context.messages.remove}</span>
                      </Button>
                    </div>
                  </Surface>
                );
              })}
            </div>
            <div className="schematic-form__array-actions">
              <Button fullWidth isDisabled={context.disabled || !canAdd} type="button" variant="secondary" onPress={addItem}>
                <ButtonIcon icon={Plus} />
                <span>{context.messages.add} {itemLabel}</span>
              </Button>
            </div>
          </div>
        </FieldsetGroup>
      </Fieldset>
    </Surface>
  );
}

function renderArrayItemSchema<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  context: RendererContext<TData>,
  refStack: string[] = [],
) {
  const resolved = resolveRenderSchema(schema, context, refStack);
  schema = resolved.schema;

  if (isDisplayOnlySchema(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack})) return renderDisplayOnly(schema, path);

  const branch = getBranchSchemas(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack});
  if (branch) return renderBranch(schema, path, true, branch.branches, context, {surface: false});

  if (getSchemaType(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack}) === "object") {
    return renderObjectFieldset(schema, path, context, {collapsible: true, forceTitle: true}, resolved.refStack);
  }

  if (isEnumSchema(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack})) {
    return renderDropdownEnum(schema, path, true, schema.enum ?? [], context);
  }

  return renderSchema(schema, path, true, context, resolved.refStack);
}

function renderBranch<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  branches: JsonSchema[],
  context: RendererContext<TData>,
  options: BranchRenderOptions = {},
  refStack: string[] = [],
) {
  const resolved = resolveRenderSchema(schema, context, refStack);
  schema = resolved.schema;
  const pointer = toPointer(path);
  const label = getExplicitOrPropertyLabel(schema, path);
  const accessibleLabel = label ?? getLabel(schema, path, "Option");
  const hasBranchSelection = Object.prototype.hasOwnProperty.call(context.branchSelection, pointer);
  const selectedIndex = hasBranchSelection
    ? context.branchSelection[pointer] ?? undefined
    : getDefaultBranchIndex(schema, branches, {rootSchema: context.rootSchema, refStack: resolved.refStack});
  const selected = selectedIndex == null ? undefined : branches[selectedIndex];
  const issues = getBranchSelectorIssues(context.getVisibleIssues(pointer), selectedIndex);
  const branchOptions = branches.map((branch, index) => ({
    key: String(index),
    label: branch.title || `Option ${index + 1}`,
  }));

  const setBranch = (key: string) => {
    const nextIndex = Number(key);
    if (!Number.isInteger(nextIndex) || !branches[nextIndex]) return;
    if (nextIndex === selectedIndex) return;

    const nextCacheForPointer = {...(context.branchValueCache[pointer] ?? {})};
    if (selectedIndex != null) {
      nextCacheForPointer[String(selectedIndex)] = cloneDraftValue(getAtPath(context.data, path));
    }

    const cachedKey = String(nextIndex);
    const hasCachedValue = Object.prototype.hasOwnProperty.call(nextCacheForPointer, cachedKey);
    const baseNextValue = hasCachedValue
      ? cloneDraftValue(nextCacheForPointer[cachedKey])
      : defaultBranchValue(branches[nextIndex], context.rootSchema);
    const nextValue = mergeCompatibleBranchObjectValues(
      baseNextValue,
      getAtPath(context.data, path),
      selected,
      branches[nextIndex],
      context.rootSchema,
    );
    context.setBranchValueCache((current) => ({
      ...current,
      [pointer]: {
        ...(current[pointer] ?? {}),
        ...nextCacheForPointer,
      },
    }));
    context.setBranchSelection((current) => ({...current, [pointer]: nextIndex}));
    const nextData = nextValue === undefined ? deleteAtPath(context.data, path) : setAtPath(context.data, path, nextValue);
    context.commitData(nextData);
    window.setTimeout(() => focusFirstNestedField(context.formRef.current, pointer), 0);
  };
  const content = (
    <Fieldset className="schematic-form__fieldset" key={pointer}>
      {label ? <RequiredFieldsetLegend required={required}>{label}</RequiredFieldsetLegend> : null}
      <FieldsetGroup className="schematic-form__field-group schematic-form__branch-group">
        {schema.description ? <FieldDescription>{schema.description}</FieldDescription> : null}
        <div className="schematic-form__field">
          <Dropdown
            ariaLabel={accessibleLabel}
            disabled={context.disabled}
            invalid={issues.length > 0}
            name={`${toFieldPath(path)}.__branch`}
            options={branchOptions}
            required={required}
            selectedKey={selectedIndex == null ? null : String(selectedIndex)}
            className="schematic-form__branch-selector"
            variant="secondary"
            onBlur={() => context.markTouched(pointer)}
            onChange={setBranch}
          />
          {issues.length ? <SchemaIssueList issues={issues} /> : null}
        </div>
        {selected ? renderBranchVariant(selected, path, required, context, options) : null}
      </FieldsetGroup>
    </Fieldset>
  );

  if (options.surface === false) return content;

  return (
    <Surface className="schematic-form__surface schematic-form__branch" data-sf-path={pointer} key={pointer} variant="transparent">
      {content}
    </Surface>
  );
}

function renderDisplayOnly(schema: JsonSchema, path: PathSegment[]) {
  const pointer = toPointer(path);
  return (
    <Fieldset
      className="schematic-form__fieldset"
      data-sf-display-only="true"
      data-sf-path={pointer}
      key={pointer}
    >
      {schema.title ? <FieldsetLegend>{schema.title}</FieldsetLegend> : null}
      {schema.description ? (
        <FieldsetGroup className="schematic-form__field-group">
          <TypographyParagraph color="muted" size="sm" slot={null}>
            {schema.description}
          </TypographyParagraph>
        </FieldsetGroup>
      ) : null}
    </Fieldset>
  );
}

function renderBranchVariant<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  context: RendererContext<TData>,
  options: BranchRenderOptions = {},
  refStack: string[] = [],
) {
  const resolved = resolveRenderSchema(schema, context, refStack);
  schema = resolved.schema;

  if (isDisplayOnlySchema(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack})) return renderDisplayOnly(schema, path);

  const branch = getBranchSchemas(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack});
  if (branch) return renderBranch(schema, path, required, branch.branches, context, options);

  if (getSchemaType(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack}) === "object") {
    return renderObjectFieldset(schema, path, context, {collapsible: true, omitUntitledLegend: true}, resolved.refStack);
  }

  if (options.surface === false && isEnumSchema(schema, {rootSchema: context.rootSchema, refStack: resolved.refStack})) {
    return renderScalarEnum(schema, path, required, context, {surface: false});
  }

  return renderSchema(schema, path, required, context, resolved.refStack);
}

function renderString<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  context: RendererContext<TData>,
) {
  const pointer = toPointer(path);
  const label = getLabel(schema, path);
  const value = asString(getAtPath(context.data, path));
  const issues = context.getVisibleIssues(pointer);
  const format = getSupportedFormat(schema);

  if (format === "date") return renderDatePicker(schema, path, required, context, "date");
  if (format === "date-time") return renderDatePicker(schema, path, required, context, "date-time");
  if (format === "time") return renderTimeField(schema, path, required, context);

  const inputType = formatToInputType(format);
  const multiline = isLongUnformattedString(schema);
  const Control = multiline ? TextArea : Input;
  const suffixIcon = format === "email" ? Envelope : format === "uri" ? Globe : null;

  return (
    <TextField
      className="schematic-form__field"
      data-sf-path={pointer}
      fullWidth
      isDisabled={context.disabled}
      isInvalid={issues.length > 0}
      isReadOnly={context.readOnly}
      isRequired={required}
      key={pointer}
      name={toFieldPath(path)}
      type={inputType}
      value={value}
      onBlur={() => context.markTouched(pointer)}
      onChange={(next: string) => context.setFieldValue(path, schema, next, required)}
    >
      <Label>{label}</Label>
      {suffixIcon ? (
        <InputGroup fullWidth>
          <InputGroupInput
            className="schematic-form__control"
            maxLength={schema.maxLength}
            minLength={schema.minLength}
            pattern={schema.pattern}
            type={inputType}
          />
          <InputGroupSuffix>
            <FieldIcon icon={suffixIcon} />
          </InputGroupSuffix>
        </InputGroup>
      ) : (
        <Control
          className="schematic-form__control"
          maxLength={schema.maxLength}
          minLength={schema.minLength}
          pattern={schema.pattern}
          rows={multiline ? 4 : undefined}
        />
      )}
      <FieldHelp description={schema.description} issues={issues} />
    </TextField>
  );
}

function renderDatePicker<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  context: RendererContext<TData>,
  mode: "date" | "date-time",
) {
  const pointer = toPointer(path);
  const label = getLabel(schema, path);
  const value = mode === "date"
    ? parseCalendarDate(getAtPath(context.data, path))
    : parseCalendarDateTime(getAtPath(context.data, path));
  const issues = context.getVisibleIssues(pointer);

  return (
    <DatePicker
      className="schematic-form__field"
      data-sf-path={pointer}
      granularity={mode === "date-time" ? "minute" : "day"}
      hideTimeZone={mode === "date-time"}
      isDisabled={context.disabled}
      isInvalid={issues.length > 0}
      isReadOnly={context.readOnly}
      isRequired={required}
      key={pointer}
      shouldForceLeadingZeros
      value={value}
      onBlur={() => context.markTouched(pointer)}
      onChange={(next: DateValue | null) => {
        const nextValue = mode === "date" ? next?.toString() ?? "" : dateTimeToJsonValue(next);
        context.setFieldValue(path, schema, nextValue, required);
      }}
    >
      <Label>{label}</Label>
      <DateFieldGroup fullWidth>
        <DateFieldInput>
          {(segment: unknown) => <DateFieldSegment segment={segment} />}
        </DateFieldInput>
        <DateFieldSuffix>
          <DatePickerTrigger>
            <DatePickerTriggerIndicator />
          </DatePickerTrigger>
        </DateFieldSuffix>
      </DateFieldGroup>
      <FieldHelp description={schema.description} issues={issues} />
      <DatePickerPopover>
        <Calendar aria-label={`${label} calendar`}>
          <CalendarHeader>
            <CalendarYearPickerTrigger>
              <CalendarYearPickerTriggerHeading />
              <CalendarYearPickerTriggerIndicator />
            </CalendarYearPickerTrigger>
            <CalendarNavButton slot="previous" />
            <CalendarNavButton slot="next" />
          </CalendarHeader>
          <CalendarGrid>
            <CalendarGridHeader>
              {(day: React.ReactNode) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
            </CalendarGridHeader>
            <CalendarGridBody>
              {(date: unknown) => <CalendarCell date={date} />}
            </CalendarGridBody>
          </CalendarGrid>
          <CalendarYearPickerGrid>
            <CalendarYearPickerGridBody>
              {({year}: {year: unknown}) => <CalendarYearPickerCell year={year} />}
            </CalendarYearPickerGridBody>
          </CalendarYearPickerGrid>
        </Calendar>
      </DatePickerPopover>
    </DatePicker>
  );
}

function renderTimeField<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  context: RendererContext<TData>,
) {
  const pointer = toPointer(path);
  const label = getLabel(schema, path);
  const value = parseClockTime(getAtPath(context.data, path));
  const issues = context.getVisibleIssues(pointer);

  return (
    <TimeField
      className="schematic-form__field"
      data-sf-path={pointer}
      fullWidth
      isDisabled={context.disabled}
      isInvalid={issues.length > 0}
      isReadOnly={context.readOnly}
      isRequired={required}
      key={pointer}
      shouldForceLeadingZeros
      value={value}
      onBlur={() => context.markTouched(pointer)}
      onChange={(next: Time | null) => context.setFieldValue(path, schema, next?.toString() ?? "", required)}
    >
      <Label>{label}</Label>
      <TimeFieldGroup fullWidth>
        <TimeFieldInput>
          {(segment: unknown) => <TimeFieldSegment segment={segment} />}
        </TimeFieldInput>
      </TimeFieldGroup>
      <FieldHelp description={schema.description} issues={issues} />
    </TimeField>
  );
}

function renderNumber<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  context: RendererContext<TData>,
) {
  const type = getSchemaType(schema);
  if (isNumericSliderSchema(schema)) {
    return renderNumericSlider(schema, path, required, context);
  }

  const pointer = toPointer(path);
  const label = getLabel(schema, path);
  const rawValue = getAtPath(context.data, path);
  const value = typeof rawValue === "number" ? rawValue : undefined;
  const issues = context.getVisibleIssues(pointer);

  return (
    <NumberField
      className="schematic-form__field"
      data-sf-path={pointer}
      fullWidth
      isDisabled={context.disabled}
      isInvalid={issues.length > 0}
      isReadOnly={context.readOnly}
      isRequired={required}
      key={pointer}
      maxValue={typeof schema.maximum === "number" ? schema.maximum : undefined}
      minValue={typeof schema.minimum === "number" ? schema.minimum : undefined}
      step={schema.multipleOf ?? (type === "integer" ? 1 : undefined)}
      value={value}
      onBlur={() => context.markTouched(pointer)}
      onChange={(next: number | undefined) => context.setFieldValue(path, schema, next, required)}
    >
      <Label>{label}</Label>
      <NumberFieldGroup>
        <NumberFieldDecrementButton />
        <NumberFieldInput className="schematic-form__control" />
        <NumberFieldIncrementButton />
      </NumberFieldGroup>
      <FieldHelp description={schema.description} issues={issues} />
    </NumberField>
  );
}

function renderNumericSlider<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  context: RendererContext<TData>,
) {
  const pointer = toPointer(path);
  const label = getLabel(schema, path);
  const rawValue = getAtPath(context.data, path);
  const step = getNumericSliderStep(schema);
  const unsetValue = (schema.minimum ?? 0) - step;
  const minValue = required ? schema.minimum : unsetValue;
  const value = typeof rawValue === "number" ? rawValue : minValue;
  const isUnset = !required && typeof rawValue !== "number";
  const issues = context.getVisibleIssues(pointer);

  return (
    <Slider
      className={cx("schematic-form__field", isUnset && "schematic-form__slider--empty")}
      data-sf-path={pointer}
      data-sf-empty={isUnset ? "true" : undefined}
      isDisabled={context.disabled}
      isReadOnly={context.readOnly}
      key={pointer}
      maxValue={schema.maximum}
      minValue={minValue}
      step={step}
      value={value}
      onBlur={() => context.markTouched(pointer)}
      onChange={(next: number | number[]) => {
        const nextValue = Array.isArray(next) ? next[0] : next;
        context.setFieldValue(path, schema, !required && nextValue === unsetValue ? undefined : nextValue, required);
      }}
    >
      <div className="schematic-form__slider-header">
        <Label className={required ? "schematic-form__required-label" : undefined}>{label}</Label>
        <SliderOutput className={isUnset ? "schematic-form__slider-output--empty" : undefined} />
      </div>
      <SliderTrack>
        <SliderFill />
        <SliderThumb name={toFieldPath(path)} />
      </SliderTrack>
      <SchemaFieldHelp description={schema.description} issues={issues} />
    </Slider>
  );
}

function renderBoolean<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  context: RendererContext<TData>,
) {
  const pointer = toPointer(path);
  const label = getExplicitOrPropertyLabel(schema, path);
  const value = Boolean(getAtPath(context.data, path));
  const issues = context.getVisibleIssues(pointer);
  const switchLabel = label ?? (value ? "On" : "Off");

  return (
    <div className="schematic-form__field" data-sf-path={pointer} key={pointer}>
      <div className="schematic-form__switch-row">
        <Label>{switchLabel}</Label>
        <Switch
          aria-label={switchLabel}
          isDisabled={context.disabled}
          isInvalid={issues.length > 0}
          isReadOnly={context.readOnly}
          isRequired={required}
          isSelected={value}
          name={toFieldPath(path)}
          onBlur={() => context.markTouched(pointer)}
          onChange={(next: boolean) => context.setFieldValue(path, schema, next, required)}
        >
          <SwitchControl>
            <SwitchThumb />
          </SwitchControl>
        </Switch>
      </div>
      <FieldHelp description={schema.description} issues={issues} />
    </div>
  );
}

function renderScalarEnum<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  context: RendererContext<TData>,
  renderOptions: {surface?: boolean} = {},
) {
  const options = schema.enum ?? [];
  if (options.length < 6) return renderRadioEnum(schema, path, required, options, context, {surface: renderOptions.surface});
  return renderDropdownEnum(schema, path, required, options, context);
}

function renderRadioEnum<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  options: JsonPrimitive[],
  context: RendererContext<TData>,
  renderOptions: {surface?: boolean} = {},
) {
  const pointer = toPointer(path);
  const label = getExplicitOrPropertyLabel(schema, path);
  const accessibleLabel = label ?? getLabel(schema, path);
  const value = getAtPath(context.data, path) as JsonPrimitive | undefined;
  const selectedKey = value === undefined ? undefined : enumValueToKey(value);
  const issues = context.getVisibleIssues(pointer);

  const content = (
    <Fieldset className="schematic-form__fieldset">
      {label ? <RequiredFieldsetLegend required={required}>{label}</RequiredFieldsetLegend> : null}
      <FieldsetGroup className="schematic-form__field-group">
        <RadioGroup
          aria-label={accessibleLabel}
          className="schematic-form__field"
          isDisabled={context.disabled}
          isInvalid={issues.length > 0}
          isReadOnly={context.readOnly}
          isRequired={required}
          name={toFieldPath(path)}
          value={selectedKey}
          onBlur={() => context.markTouched(pointer)}
          onChange={(key: string) => context.setFieldValue(path, schema, keyToEnumValue(key, options), required)}
        >
          <SchemaFieldHelp description={schema.description} issues={issues} />
          {options.map((option) => (
            <Radio key={enumValueToKey(option)} value={enumValueToKey(option)}>
              <RadioControl>
                <RadioIndicator />
              </RadioControl>
              <RadioContent>
                <Label>{optionLabel(option)}</Label>
              </RadioContent>
            </Radio>
          ))}
        </RadioGroup>
      </FieldsetGroup>
    </Fieldset>
  );

  if (renderOptions.surface === false) return content;

  return (
    <Surface className="schematic-form__surface" data-sf-path={pointer} key={pointer} variant="transparent">
      {content}
    </Surface>
  );
}

function renderDropdownEnum<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  options: JsonPrimitive[],
  context: RendererContext<TData>,
) {
  const pointer = toPointer(path);
  const label = getExplicitOrPropertyLabel(schema, path);
  const accessibleLabel = label ?? getLabel(schema, path);
  const value = getAtPath(context.data, path) as JsonPrimitive | undefined;
  const selectedKey = value === undefined ? undefined : enumValueToKey(value);
  const issues = context.getVisibleIssues(pointer);

  return (
    <div className="schematic-form__field" data-sf-path={pointer} key={pointer}>
      <Dropdown
        ariaLabel={accessibleLabel}
        disabled={context.disabled}
        invalid={issues.length > 0}
        label={label}
        name={toFieldPath(path)}
        options={options.map((option) => ({key: enumValueToKey(option), label: optionLabel(option)}))}
        required={required}
        selectedKey={selectedKey}
        onBlur={() => context.markTouched(pointer)}
        onChange={(key) => context.setFieldValue(path, schema, keyToEnumValue(key, options), required)}
      />
      <SchemaFieldHelp description={schema.description} issues={issues} />
    </div>
  );
}

function renderStringEnumArray<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  context: RendererContext<TData>,
  refStack: string[] = [],
) {
  const options = (getSingleArrayItemSchema(schema, context.rootSchema, refStack)?.enum ?? []).filter(
    (value): value is string => typeof value === "string",
  );
  if (options.length < 6) return renderCheckboxEnumArray(schema, path, required, options, context);
  return renderMultiselectEnumArray(schema, path, required, options, context);
}

function renderCheckboxEnumArray<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  options: string[],
  context: RendererContext<TData>,
) {
  const pointer = toPointer(path);
  const label = getExplicitOrPropertyLabel(schema, path);
  const accessibleLabel = label ?? getLabel(schema, path);
  const rawValue = getAtPath(context.data, path);
  const value = Array.isArray(rawValue) ? rawValue.filter((item): item is string => typeof item === "string") : [];
  const issues = context.getVisibleIssues(pointer);

  return (
    <Surface className="schematic-form__surface" data-sf-path={pointer} key={pointer} variant="transparent">
      <Fieldset className="schematic-form__fieldset">
        {label ? <RequiredFieldsetLegend required={required}>{label}</RequiredFieldsetLegend> : null}
        <FieldsetGroup className="schematic-form__field-group">
          <CheckboxGroup
            aria-label={accessibleLabel}
            className="schematic-form__field"
            isDisabled={context.disabled}
            isInvalid={issues.length > 0}
            isReadOnly={context.readOnly}
            isRequired={required}
            name={toFieldPath(path)}
            value={value}
            onBlur={() => context.markTouched(pointer)}
            onChange={(next: string[]) =>
              context.setFieldValue(path, schema, normalizeStringEnumArray(next, schema, context.rootSchema), required)}
          >
            <FieldHelp description={schema.description} issues={issues} />
            {options.map((option) => (
              <Checkbox aria-label={option} key={option} value={option}>
                <CheckboxControl>
                  <CheckboxIndicator />
                </CheckboxControl>
                <CheckboxContent>
                  <Label>{option}</Label>
                </CheckboxContent>
              </Checkbox>
            ))}
          </CheckboxGroup>
        </FieldsetGroup>
      </Fieldset>
    </Surface>
  );
}

function renderMultiselectEnumArray<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  options: string[],
  context: RendererContext<TData>,
) {
  const pointer = toPointer(path);
  const label = getLabel(schema, path);
  const rawValue = getAtPath(context.data, path);
  const value = Array.isArray(rawValue) ? rawValue.filter((item): item is string => typeof item === "string") : [];
  const selectedKeys = new Set(value);
  const issues = context.getVisibleIssues(pointer);

  const setValues = (keys: Set<string>) => {
    context.setFieldValue(path, schema, normalizeStringEnumArray([...keys], schema, context.rootSchema), required);
  };

  return (
    <div className="schematic-form__field" data-sf-path={pointer} key={pointer}>
      <Dropdown
        disabled={context.disabled}
        invalid={issues.length > 0}
        label={label}
        multiple
        name={toFieldPath(path)}
        options={options.map((option) => ({key: option, label: option}))}
        required={required}
        selectedKeys={selectedKeys}
        onBlur={() => context.markTouched(pointer)}
        onMultipleChange={setValues}
      />
      <SchemaFieldHelp description={schema.description} issues={issues} />
    </div>
  );
}

type DropdownOption = {
  key: string;
  label: string;
};

type GravityIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

function Dropdown({
  ariaLabel,
  disabled,
  invalid,
  label,
  multiple = false,
  name,
  options,
  required,
  selectedKey,
  selectedKeys,
  className,
  variant,
  onBlur,
  onChange,
  onMultipleChange,
}: {
  ariaLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
  label?: string;
  multiple?: boolean;
  name?: string;
  options: DropdownOption[];
  required?: boolean;
  selectedKey?: string | null;
  selectedKeys?: Set<string>;
  className?: string;
  variant?: "primary" | "secondary";
  onBlur?: () => void;
  onChange?: (key: string) => void;
  onMultipleChange?: (keys: Set<string>) => void;
}) {
  return (
    <Select
      aria-label={ariaLabel ?? label}
      className={cx("schematic-form__control", className)}
      fullWidth
      isDisabled={disabled}
      isInvalid={invalid}
      isRequired={required}
      name={name}
      placeholder="Select an option"
      selectedKey={multiple ? undefined : selectedKey ?? null}
      selectionMode={multiple ? "multiple" : "single"}
      variant={variant}
      value={multiple ? [...(selectedKeys ?? new Set<string>())] : undefined}
      onBlur={onBlur}
      onChange={(event: unknown) => {
        if (!multiple) return;
        onMultipleChange?.(selectionToStringSet(event, options));
      }}
      onSelectionChange={(selection: unknown) => {
        if (multiple) {
          onMultipleChange?.(selectionToStringSet(selection, options));
          return;
        }
        if (selection != null) onChange?.(String(selection));
      }}
    >
      {label ? <Label>{label}</Label> : null}
      <SelectTrigger>
        <SelectValue />
        <SelectIndicator />
      </SelectTrigger>
      <SelectPopover>
        <ListBox>
          {options.map((option) => (
            <ListBoxItem id={option.key} key={option.key} textValue={option.label}>
              {option.label}
              <ListBoxItemIndicator />
            </ListBoxItem>
          ))}
        </ListBox>
      </SelectPopover>
    </Select>
  );
}

function selectionToStringSet(selection: unknown, options: DropdownOption[]): Set<string> {
  const eventTarget = getSelectionEventTarget(selection);
  if (eventTarget) {
    const selected = Array.from(eventTarget.selectedOptions).map((option) => option.value);
    if (selected.length > 0) return new Set(selected);
    return eventTarget.value ? new Set([eventTarget.value]) : new Set();
  }

  if (selection === "all") return new Set(options.map((option) => option.key));
  if (selection instanceof Set) return new Set([...selection].map(String));
  if (Array.isArray(selection)) return new Set(selection.map(String));
  if (selection == null) return new Set();
  return new Set([String(selection)]);
}

function getSelectionEventTarget(selection: unknown): HTMLSelectElement | null {
  if (!selection || typeof selection !== "object") return null;
  const target = (selection as {target?: unknown}).target;
  return target instanceof HTMLSelectElement ? target : null;
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return Boolean(value && typeof value === "object" && typeof (value as {finally?: unknown}).finally === "function");
}

function RequiredFieldsetLegend({
  children,
  required,
}: {
  children: React.ReactNode;
  required: boolean;
}) {
  return <FieldsetLegend className={required ? "schematic-form__required-label" : undefined}>{children}</FieldsetLegend>;
}

function getExplicitOrPropertyLabel(schema: JsonSchema, path: PathSegment[]): string | undefined {
  if (typeof schema.title === "string" && schema.title.trim()) return schema.title.trim();
  const last = path[path.length - 1];
  return typeof last === "string" ? getLabel(schema, path) : undefined;
}

function FieldDescription({children}: {children: React.ReactNode}) {
  return (
    <Description className="schematic-form__description" data-slot="schema-description" slot="description">
      {children}
    </Description>
  );
}

function FieldHelp({description, issues}: {description?: string; issues: ValidationIssue[]}) {
  if (issues.length) return <IssueList issues={issues} />;
  return description ? <FieldDescription>{description}</FieldDescription> : null;
}

function SchemaFieldHelp({description, issues}: {description?: string; issues: ValidationIssue[]}) {
  if (issues.length) return <SchemaIssueList issues={issues} />;
  return description ? <FieldDescription>{description}</FieldDescription> : null;
}

function ButtonIcon({icon: Icon}: {icon: GravityIcon}) {
  return <Icon aria-hidden="true" className="schematic-form__button-icon" focusable="false" />;
}

function FieldIcon({icon: Icon}: {icon: GravityIcon}) {
  return <Icon aria-hidden="true" className="schematic-form__field-icon" focusable="false" />;
}

function IssueList({issues}: {issues: ValidationIssue[]}) {
  return (
    <FieldError className="schematic-form__field-error" data-slot="schema-field-error" slot="errorMessage">
      {issues.map((issue, index) => (
        <div key={`${issue.path}-${issue.keyword}-${index}`}>{issue.message}</div>
      ))}
    </FieldError>
  );
}

function SchemaIssueList({issues}: {issues: ValidationIssue[]}) {
  return (
    <ErrorMessage className="schematic-form__error-message" data-slot="schema-error-message">
      {issues.map((issue, index) => (
        <div key={`${issue.path}-${issue.keyword}-${index}`}>{issue.message}</div>
      ))}
    </ErrorMessage>
  );
}

function ErrorSummary({title, errors}: {title: string; errors: string[]}) {
  return (
    <div className="schematic-form__error-summary" role="alert">
      <Typography slot={null} type="h4">{title}</Typography>
      <ul>
        {errors.map((error, index) => (
          <li key={`${error}-${index}`}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

function groupIssuesByPath(issues: ValidationIssue[]): Map<string, ValidationIssue[]> {
  const map = new Map<string, ValidationIssue[]>();
  for (const issue of issues) {
    const current = map.get(issue.path) ?? [];
    current.push(issue);
    map.set(issue.path, current);
  }
  return map;
}

function getRootSchemaLabel(schema: JsonSchema): string {
  if (typeof schema.title === "string" && schema.title.trim()) return schema.title.trim();
  const name = schema.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return "";
}

function getBranchSelectorIssues(issues: ValidationIssue[], selectedIndex: number | undefined): ValidationIssue[] {
  if (selectedIndex == null) return issues;
  return issues.filter((issue) => issue.keyword !== "oneOf" && issue.keyword !== "anyOf");
}

function restoreEmptyBranchSelectionValues(data: unknown, branchSelection: BranchSelectionState): unknown {
  return Object.entries(branchSelection).reduce((nextData, [pointer, selectedIndex]) => {
    if (selectedIndex !== null) return nextData;
    return setAtPath(nextData, fromPointer(pointer), undefined);
  }, data);
}

function inferBranchMetadata(
  schema: JsonSchema,
  data: unknown,
  rootSchema: JsonSchema = schema,
  path: PathSegment[] = [],
  refStack: string[] = [],
): {branchSelection: BranchSelectionState; branchValueCache: BranchValueCache} {
  const branchSelection: BranchSelectionState = {};
  const branchValueCache: BranchValueCache = {};
  inferBranchMetadataInto(schema, data, rootSchema, path, refStack, branchSelection);
  return {branchSelection, branchValueCache};
}

function inferBranchMetadataInto(
  schema: JsonSchema,
  data: unknown,
  rootSchema: JsonSchema,
  path: PathSegment[],
  refStack: string[],
  branchSelection: BranchSelectionState,
) {
  const resolved = resolveSchemaWithRoot(schema, rootSchema, refStack);
  schema = resolved.schema;

  const branch = getBranchSchemas(schema, {rootSchema, refStack: resolved.refStack});
  if (branch) {
    const selectedIndex = inferBranchIndexFromValue(data, branch.branches, rootSchema, branch.refStack);
    if (selectedIndex == null) return;
    branchSelection[toPointer(path)] = selectedIndex;
    inferBranchMetadataInto(branch.branches[selectedIndex], data, rootSchema, path, branch.refStack, branchSelection);
    return;
  }

  const type = getSchemaType(schema, {rootSchema, refStack: resolved.refStack});
  if (type === "object" && isRecord(data)) {
    for (const key of getOrderedPropertyKeys(schema, {rootSchema, refStack: resolved.refStack})) {
      const child = schema.properties?.[key];
      if (!child || isDisplayOnlySchema(child, {rootSchema, refStack: resolved.refStack})) continue;
      inferBranchMetadataInto(child, data[key], rootSchema, [...path, key], resolved.refStack, branchSelection);
    }
    return;
  }

  if (type === "array" && Array.isArray(data)) {
    data.forEach((item, index) => {
      const itemSchema = Array.isArray(schema.items)
        ? schema.items[index]
        : getSingleArrayItemSchema(schema, rootSchema, resolved.refStack);
      if (!itemSchema) return;
      inferBranchMetadataInto(itemSchema, item, rootSchema, [...path, index], resolved.refStack, branchSelection);
    });
  }
}

function inferBranchIndexFromValue(
  value: unknown,
  branches: JsonSchema[],
  rootSchema: JsonSchema,
  refStack: string[] = [],
): number | undefined {
  if (value === undefined) return undefined;

  let bestIndex: number | undefined;
  let bestScore = -1;

  branches.forEach((branch, index) => {
    const score = scoreBranchValueCompatibility(value, branch, rootSchema, refStack);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 0 ? bestIndex : undefined;
}

function scoreBranchValueCompatibility(
  value: unknown,
  schema: JsonSchema,
  rootSchema: JsonSchema,
  refStack: string[] = [],
): number {
  const resolved = resolveSchemaWithRoot(schema, rootSchema, refStack);
  schema = resolved.schema;

  if (!isValueCompatibleWithSchemaForInference(value, schema, rootSchema, resolved.refStack)) return -1;

  if (schema.enum?.length) {
    return schema.enum.some((option) => primitiveValuesEqual(option, value)) ? 100 : -1;
  }

  const type = getSchemaType(schema, {rootSchema, refStack: resolved.refStack});
  if (type !== "object") return 1;
  if (!isRecord(value)) return -1;

  let score = 1;
  let matchedSingleEnumDiscriminator = false;
  const required = new Set(schema.required ?? []);
  const properties = schema.properties ?? {};

  for (const [key, child] of Object.entries(properties)) {
    const hasValue = Object.prototype.hasOwnProperty.call(value, key);
    const childResolved = resolveSchemaWithRoot(child, rootSchema, resolved.refStack);
    const singleEnumValue = getSingleEnumValue(childResolved.schema, {rootSchema, refStack: childResolved.refStack});

    if (singleEnumValue !== undefined) {
      if (!hasValue) {
        if (required.has(key)) return -1;
        continue;
      }
      if (!primitiveValuesEqual(singleEnumValue, value[key])) return -1;
      matchedSingleEnumDiscriminator = true;
      score += 100;
      continue;
    }

    if (!hasValue) {
      if (required.has(key)) return -1;
      continue;
    }

    if (!isValueCompatibleWithSchemaForInference(value[key], childResolved.schema, rootSchema, childResolved.refStack)) {
      if (matchedSingleEnumDiscriminator) continue;
      return -1;
    }
    score += required.has(key) ? 10 : 3;
  }

  return score;
}

function isValueCompatibleWithSchemaForInference(
  value: unknown,
  schema: JsonSchema,
  rootSchema: JsonSchema,
  refStack: string[] = [],
): boolean {
  const resolved = resolveSchemaWithRoot(schema, rootSchema, refStack);
  const branch = getBranchSchemas(resolved.schema, {rootSchema, refStack: resolved.refStack});
  if (branch) return inferBranchIndexFromValue(value, branch.branches, rootSchema, branch.refStack) != null;
  return isValueCompatibleWithSchemaType(value, resolved.schema, rootSchema, resolved.refStack);
}

function primitiveValuesEqual(left: JsonPrimitive, right: unknown): boolean {
  return left === right;
}

function resolveRenderSchema<TData>(
  schema: JsonSchema,
  context: RendererContext<TData>,
  refStack: string[] = [],
): {schema: JsonSchema; refStack: string[]} {
  const resolved = resolveSchemaForContext(schema, {rootSchema: context.rootSchema, refStack});
  return resolved.ok ? {schema: resolved.schema, refStack: resolved.refStack} : {schema, refStack};
}

function resolveSchemaWithRoot(
  schema: JsonSchema,
  rootSchema?: JsonSchema,
  refStack: string[] = [],
): {schema: JsonSchema; refStack: string[]} {
  const resolved = resolveSchemaForContext(schema, {rootSchema, refStack});
  return resolved.ok ? {schema: resolved.schema, refStack: resolved.refStack} : {schema, refStack};
}

function materializeRequiredImplicitValues(
  schema: JsonSchema,
  data: unknown,
  rootSchema?: JsonSchema,
  refStack: string[] = [],
): unknown {
  const resolved = resolveSchemaWithRoot(schema, rootSchema, refStack);
  schema = resolved.schema;

  if (isDisplayOnlySchema(schema, {rootSchema, refStack: resolved.refStack})) return data;

  const branch = getBranchSchemas(schema, {rootSchema, refStack: resolved.refStack});
  if (branch) return data;

  const type = getSchemaType(schema, {rootSchema, refStack: resolved.refStack});
  if (type === "object") return materializeObjectRequiredImplicitValues(schema, data, rootSchema, resolved.refStack);
  if (type === "array" && data === undefined) return [];
  if (type === "array" && Array.isArray(data)) {
    const itemSchema = getSingleArrayItemSchema(schema, rootSchema);
    if (!itemSchema) return data;
    let nextData = data;
    data.forEach((item, index) => {
      const nextItem = materializeRequiredImplicitValues(itemSchema, item, rootSchema);
      if (nextItem !== item) {
        if (nextData === data) nextData = [...data];
        nextData[index] = nextItem;
      }
    });
    return nextData;
  }

  return data;
}

function materializeObjectRequiredImplicitValues(
  schema: JsonSchema,
  data: unknown,
  rootSchema?: JsonSchema,
  refStack: string[] = [],
): unknown {
  const resolved = resolveSchemaWithRoot(schema, rootSchema, refStack);
  schema = resolved.schema;
  const source = isRecord(data) ? data : {};
  let nextData: Record<string, unknown> = source;
  let changed = false;
  const required = new Set(schema.required ?? []);

  for (const key of getOrderedPropertyKeys(schema, {rootSchema, refStack: resolved.refStack})) {
    const child = schema.properties?.[key];
    if (!child || isDisplayOnlySchema(child, {rootSchema, refStack: resolved.refStack})) continue;

    const childIsRequired = required.has(key);
    const hasValue = Object.prototype.hasOwnProperty.call(nextData, key);
    const currentValue = nextData[key];

    const childSchema = resolveSchemaWithRoot(child, rootSchema, resolved.refStack).schema;
    const childType = getSchemaType(childSchema, {rootSchema, refStack: resolved.refStack});

    if (!childIsRequired && childType === "array" && Array.isArray(currentValue) && currentValue.length === 0) {
      nextData = deleteObjectKey(nextData, key);
      changed = true;
      continue;
    }

    const childSingleEnumValue = childIsRequired ? getSingleEnumValue(child, {rootSchema, refStack: resolved.refStack}) : undefined;
    if (childSingleEnumValue !== undefined && (!hasValue || currentValue !== childSingleEnumValue)) {
      nextData = setObjectKey(nextData, key, childSingleEnumValue);
      changed = true;
      continue;
    }

    if (childIsRequired && isNumericSliderSchema(childSchema, rootSchema, resolved.refStack) && (currentValue === undefined || !hasValue)) {
      nextData = setObjectKey(nextData, key, childSchema.minimum);
      changed = true;
      continue;
    }

    const shouldRecurse = hasValue || childIsRequired;
    if (!shouldRecurse) continue;

    const nextValue = materializeRequiredImplicitValues(child, hasValue ? currentValue : undefined, rootSchema, resolved.refStack);
    if (!childIsRequired && childType === "array" && Array.isArray(nextValue) && nextValue.length === 0) {
      nextData = deleteObjectKey(nextData, key);
      changed = true;
      continue;
    }
    if (nextValue !== currentValue && (nextValue !== undefined || hasValue)) {
      nextData = setObjectKey(nextData, key, nextValue);
      changed = true;
    }
  }

  return changed ? nextData : data;
}

function isNumericSliderSchema(schema: JsonSchema, rootSchema?: JsonSchema, refStack: string[] = []): boolean {
  const resolved = resolveSchemaWithRoot(schema, rootSchema, refStack);
  schema = resolved.schema;
  const type = getSchemaType(schema, {rootSchema, refStack: resolved.refStack});
  const hasMinimum = typeof schema.minimum === "number";
  const hasMaximum = typeof schema.maximum === "number";
  if (type === "integer") return hasMinimum && hasMaximum;
  if (type === "number") return hasMinimum && hasMaximum && typeof schema.multipleOf === "number";
  return false;
}

function isSingleEnumSchema(schema: JsonSchema, rootSchema?: JsonSchema, refStack: string[] = []): boolean {
  return getSingleEnumValue(schema, {rootSchema, refStack}) !== undefined;
}

function getNumericSliderStep(schema: JsonSchema): number {
  return typeof schema.multipleOf === "number" && schema.multipleOf > 0 ? schema.multipleOf : 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function setObjectKey(source: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
  return {...source, [key]: value};
}

function deleteObjectKey(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const {[key]: _deleted, ...rest} = source;
  return rest;
}

function getSingleArrayItemSchema(
  schema: JsonSchema,
  rootSchema?: JsonSchema,
  refStack: string[] = [],
): JsonSchema | undefined {
  const resolved = resolveSchemaWithRoot(schema, rootSchema, refStack);
  schema = resolved.schema;
  if (!schema.items || Array.isArray(schema.items)) return undefined;
  return resolveSchemaWithRoot(schema.items, rootSchema, resolved.refStack).schema;
}

function defaultBranchValue(
  schema: JsonSchema,
  rootSchema?: JsonSchema,
  refStack: string[] = [],
): JsonPrimitive | Record<string, unknown> | unknown[] | undefined {
  const resolved = resolveSchemaWithRoot(schema, rootSchema, refStack);
  schema = resolved.schema;
  const defaultValue = defaultValueForSchema(schema, {rootSchema});
  if (defaultValue !== undefined) {
    return materializeRequiredImplicitValues(schema, defaultValue, rootSchema) as
      | JsonPrimitive
      | Record<string, unknown>
      | unknown[];
  }
  if (schema.enum?.length) return schema.enum[0];

  const type = getSchemaType(schema, {rootSchema, refStack: resolved.refStack});
  if (type === "null") return null;
  if (type === "string") return "";
  if (type === "number" || type === "integer") return schema.minimum ?? 0;
  return undefined;
}

function mergeCompatibleBranchObjectValues(
  nextValue: unknown,
  previousValue: unknown,
  previousSchema: JsonSchema | undefined,
  nextSchema: JsonSchema,
  rootSchema?: JsonSchema,
): unknown {
  if (!isRecord(nextValue) || !isRecord(previousValue) || !previousSchema) return nextValue;

  const resolvedPrevious = resolveSchemaWithRoot(previousSchema, rootSchema);
  const resolvedNext = resolveSchemaWithRoot(nextSchema, rootSchema);
  const previousProperties = resolvedPrevious.schema.properties ?? {};
  const nextProperties = resolvedNext.schema.properties ?? {};
  let merged = nextValue;

  for (const [key, nextChildSchema] of Object.entries(nextProperties)) {
    if (!Object.prototype.hasOwnProperty.call(previousValue, key)) continue;
    if (Object.prototype.hasOwnProperty.call(nextValue, key)) continue;
    if (isSingleEnumSchema(nextChildSchema, rootSchema, resolvedNext.refStack)) continue;

    const previousChildSchema = previousProperties[key];
    if (!previousChildSchema) continue;
    if (!schemasHaveMatchingValueType(previousChildSchema, nextChildSchema, rootSchema)) continue;

    const previousChildValue = previousValue[key];
    if (!isValueCompatibleWithSchemaType(previousChildValue, nextChildSchema, rootSchema, resolvedNext.refStack)) continue;
    merged = setObjectKey(merged, key, cloneDraftValue(previousChildValue));
  }

  return merged;
}

function schemasHaveMatchingValueType(previousSchema: JsonSchema, nextSchema: JsonSchema, rootSchema?: JsonSchema): boolean {
  const previousResolved = resolveSchemaWithRoot(previousSchema, rootSchema);
  const nextResolved = resolveSchemaWithRoot(nextSchema, rootSchema);
  return getSchemaType(previousResolved.schema, {rootSchema, refStack: previousResolved.refStack}) ===
    getSchemaType(nextResolved.schema, {rootSchema, refStack: nextResolved.refStack});
}

function isValueCompatibleWithSchemaType(
  value: unknown,
  schema: JsonSchema,
  rootSchema?: JsonSchema,
  refStack: string[] = [],
): boolean {
  const resolved = resolveSchemaWithRoot(schema, rootSchema, refStack);
  const type = getSchemaType(resolved.schema, {rootSchema, refStack: resolved.refStack});
  if (value === undefined) return false;
  if (type === "string") return typeof value === "string";
  if (type === "boolean") return typeof value === "boolean";
  if (type === "number") return typeof value === "number";
  if (type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return isRecord(value);
  return false;
}

function applyBranchSelections(
  schema: JsonSchema,
  selections: BranchSelectionState,
  path: PathSegment[] = [],
  rootSchema: JsonSchema = schema,
  refStack: string[] = [],
  traversal: BranchSelectionTraversalState = {remainingNodes: branchSelectionTraversalNodeLimit},
  depth = 0,
): JsonSchema {
  if (depth > branchSelectionTraversalDepthLimit) return schema;
  if (traversal.remainingNodes <= 0) return schema;
  traversal.remainingNodes -= 1;

  const resolved = resolveSchemaWithRoot(schema, rootSchema, refStack);
  schema = resolved.schema;

  const branch = getBranchSchemas(schema, {rootSchema, refStack: resolved.refStack});
  if (branch) {
    const pointer = toPointer(path);
    const selectedIndex = Object.prototype.hasOwnProperty.call(selections, pointer)
      ? selections[pointer] ?? undefined
      : getDefaultBranchIndex(schema, branch.branches, {rootSchema, refStack: branch.refStack});
    const selected = selectedIndex == null ? undefined : branch.branches[selectedIndex];
    if (selected) return applyBranchSelections(selected, selections, path, rootSchema, branch.refStack, traversal, depth + 1);
    return schema;
  }

  const output: JsonSchema = {...schema};

  if (schema.properties) {
    output.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, child]) => [
        key,
        applyBranchSelections(child, selections, [...path, key], rootSchema, resolved.refStack, traversal, depth + 1),
      ]),
    );
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      output.items = schema.items.map((child, index) =>
        applyBranchSelections(child, selections, [...path, index], rootSchema, resolved.refStack, traversal, depth + 1),
      );
    } else {
      const selectedArrayItemCount = getSelectedArrayItemCount(selections, path);
      if (selectedArrayItemCount > 0) {
        output.items = Array.from({length: selectedArrayItemCount}, (_, index) =>
          applyBranchSelections(schema.items as JsonSchema, selections, [...path, index], rootSchema, resolved.refStack, traversal, depth + 1),
        );
        output.additionalItems = applyAdditionalArrayItemSchema(schema, selections, path, selectedArrayItemCount, rootSchema);
      } else {
        output.items = applyBranchSelections(schema.items, selections, [...path, 0], rootSchema, resolved.refStack, traversal, depth + 1);
      }
    }
  }

  if (Array.isArray(schema.oneOf)) {
    output.oneOf = schema.oneOf.map((child) => applyBranchSelections(child, selections, path, rootSchema, resolved.refStack, traversal, depth + 1));
  }

  if (Array.isArray(schema.anyOf)) {
    output.anyOf = schema.anyOf.map((child) => applyBranchSelections(child, selections, path, rootSchema, resolved.refStack, traversal, depth + 1));
  }

  return output;
}

function getSelectedArrayItemCount(selections: BranchSelectionState, path: PathSegment[]): number {
  const pointer = toPointer(path);
  const prefix = pointer === "/" ? "/" : `${pointer}/`;
  let highestIndex = -1;

  for (const selectionPointer of Object.keys(selections)) {
    if (!selectionPointer.startsWith(prefix)) continue;
    const [rawIndex] = selectionPointer.slice(prefix.length).split("/");
    if (!/^(?:0|[1-9]\d*)$/.test(rawIndex)) continue;
    highestIndex = Math.max(highestIndex, Number(rawIndex));
  }

  return highestIndex + 1;
}

function applyAdditionalArrayItemSchema(
  schema: JsonSchema,
  selections: BranchSelectionState,
  path: PathSegment[],
  index: number,
  rootSchema: JsonSchema,
): boolean | JsonSchema {
  if (schema.additionalItems === false || schema.additionalItems === true) return schema.additionalItems;
  if (isSchemaObject(schema.additionalItems)) {
    return applyBranchSelections(schema.additionalItems, selections, [...path, index], rootSchema);
  }
  const itemSchema = getSingleArrayItemSchema(schema, rootSchema);
  return itemSchema ? applyBranchSelections(itemSchema, selections, [...path, index], rootSchema) : true;
}

function isSchemaObject(value: unknown): value is JsonSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function focusFirstIssue(form: HTMLFormElement | null, issues: ValidationIssue[]) {
  if (!form || issues.length === 0) return;
  const firstPath = issues[0]?.path;
  for (const container of form.querySelectorAll<HTMLElement>("[data-sf-path]")) {
    if (container.dataset.sfPath !== firstPath) continue;
    const target = container.matches("input, textarea, button, select, [tabindex]")
      ? container
      : container.querySelector<HTMLElement>("input, textarea, button, select, [tabindex]");
    if (target) focusElementForNavigation(target);
    return;
  }
}

function focusFirstNestedField(form: HTMLFormElement | null, pointer: string) {
  if (!form) return;
  const prefix = pointer === "/" ? "/" : `${pointer}/`;

  for (const container of form.querySelectorAll<HTMLElement>("[data-sf-path]")) {
    const path = container.dataset.sfPath ?? "";
    if (!path.startsWith(prefix) || path === pointer) continue;

    const target = getFocusableTarget(container);
    if (!target) continue;

    focusElementForNavigation(target);
    return;
  }
}

function focusFieldByPointer(form: HTMLFormElement | null, pointer: string): boolean {
  if (!form) return false;
  for (const container of form.querySelectorAll<HTMLElement>("[data-sf-path]")) {
    if (container.dataset.sfPath !== pointer) continue;
    const target = getFocusableTarget(container);
    if (!target) return false;
    focusElementForNavigation(target);
    return document.activeElement === target;
  }
  return false;
}

function focusElementForNavigation(target: HTMLElement) {
  const focusTarget = target as HTMLElement & {focus(options?: FocusOptions & {focusVisible?: boolean}): void};

  try {
    const rect = target.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const desiredBottom = Math.max(0, viewportHeight - chipNavigationViewportBottomOffset);
    let deltaY = 0;

    if (rect.bottom > desiredBottom) {
      deltaY = rect.bottom - desiredBottom;
    } else if (rect.top < 0) {
      deltaY = rect.top;
    }

    if (Math.abs(deltaY) >= 1 && typeof window.scrollBy === "function") {
      window.scrollBy({top: deltaY, behavior: "smooth"});
    }
  } catch {
    // Ignore non-layout environments where viewport metrics are unavailable.
  }

  try {
    focusTarget.focus({focusVisible: true});
  } catch {
    target.focus();
  }

  if (document.activeElement !== target) return;
  if (target.getAttribute("role") !== "switch") return;

  const switchRoot = target.closest<HTMLElement>(".switch") ?? (target.classList.contains("switch") ? target : null);
  if (!switchRoot) return;

  switchRoot.setAttribute("data-sf-force-focus-visible", "true");
  const clearForcedFocusVisible = () => {
    switchRoot.removeAttribute("data-sf-force-focus-visible");
    target.removeEventListener("blur", clearForcedFocusVisible);
    target.removeEventListener("focusout", clearForcedFocusVisible);
  };
  target.addEventListener("blur", clearForcedFocusVisible, {once: true});
  target.addEventListener("focusout", clearForcedFocusVisible, {once: true});
}

function focusPointerWithRetry(form: HTMLFormElement | null, pointer: string, attempt = 0) {
  if (!form || !pointer) return;
  if (focusFieldByPointer(form, pointer)) return;
  if (attempt >= 5) {
    focusFirstNestedField(form, pointer);
    return;
  }
  window.setTimeout(() => focusPointerWithRetry(form, pointer, attempt + 1), 16);
}

function getPointerAncestors(pointer: string): string[] {
  if (pointer === "/" || !pointer.startsWith("/")) return [];
  const segments = pointer.slice(1).split("/");
  return segments.slice(0, -1).map((_, index) => `/${segments.slice(0, index + 1).join("/")}`);
}

function getFocusableTarget(container: HTMLElement): HTMLElement | null {
  if (isFocusable(container)) return container;
  const prioritySelectors = [
    "[role='switch']:not([disabled]):not([tabindex='-1'])",
    "input:not([type='hidden']):not([disabled]):not([tabindex='-1'])",
    "select:not([disabled]):not([tabindex='-1'])",
    "textarea:not([disabled]):not([tabindex='-1'])",
    "[role='radio']:not([disabled]):not([tabindex='-1'])",
    "button:not([disabled]):not([tabindex='-1'])",
    "[tabindex]:not([tabindex='-1'])",
  ];
  for (const selector of prioritySelectors) {
    const target = container.querySelector<HTMLElement>(selector);
    if (target) return target;
  }
  return null;
}

function isFocusable(element: HTMLElement) {
  if (element.hasAttribute("disabled")) return false;
  if (element.getAttribute("tabindex") === "-1") return false;
  const tagName = element.tagName.toLowerCase();
  return tagName === "textarea" || tagName === "button" || tagName === "select" || (tagName === "input" && element.getAttribute("type") !== "hidden");
}

function getRowIds<TData>(context: RendererContext<TData>, pointer: string, length: number): string[] {
  const existing = context.rowIdsByPointer[pointer] ?? [];
  return Array.from({length}, (_, index) => existing[index] ?? `${pointer}-row-${index}`);
}

function withIndexedArrayItemTitle(schema: JsonSchema, index: number): JsonSchema {
  const baseTitle = typeof schema.title === "string" && schema.title.trim() ? schema.title.trim() : "Item";
  return {...schema, title: `${baseTitle} #${index + 1}`};
}

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function parseCalendarDate(value: unknown): DateValue | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

function parseCalendarDateTime(value: unknown): DateValue | null {
  if (typeof value !== "string" || value.trim() === "") return null;

  try {
    return parseAbsoluteToLocal(value);
  } catch {
    // JSON Schema date-time requires a timezone, but keeping this fallback lets
    // the component display existing local ISO strings without data loss.
  }

  try {
    return parseDateTime(value);
  } catch {
    return null;
  }
}

function parseClockTime(value: unknown): Time | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const localValue = value.replace(/(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/, "");
  try {
    return parseTime(localValue);
  } catch {
    return null;
  }
}

function dateTimeToJsonValue(value: DateValue | null): string {
  if (!value) return "";

  const absoluteString = (value as {toAbsoluteString?: () => string}).toAbsoluteString?.();
  if (absoluteString) return absoluteString;

  const date = (value as {toDate?: (timeZone: string) => Date}).toDate?.(getLocalTimeZone());
  if (date && !Number.isNaN(date.getTime())) return date.toISOString();

  return value.toString();
}

function formatToInputType(format: ReturnType<typeof getSupportedFormat>): string | undefined {
  if (format === "email") return "email";
  if (format === "uri") return "url";
  return undefined;
}

function normalizeStringEnumArray(values: string[], schema: JsonSchema, rootSchema?: JsonSchema): string[] {
  const allowed = new Set(
    (getSingleArrayItemSchema(schema, rootSchema)?.enum ?? []).filter((item): item is string => typeof item === "string"),
  );
  const filtered = values.filter((value) => allowed.has(value));
  if (!schema.uniqueItems) return filtered;
  return [...new Set(filtered)];
}
