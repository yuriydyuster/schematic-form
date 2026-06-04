import * as HeroUI from "@heroui/react";
import {ArrowDown, ArrowUp, Plus, TrashBin} from "@gravity-ui/icons";
import {
  getLocalTimeZone,
  parseAbsoluteToLocal,
  parseDate,
  parseDateTime,
  parseTime,
} from "@internationalized/date";
import type {DateValue, Time} from "@internationalized/date";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";

import {
  deleteAtPath,
  getAtPath,
  insertArrayItem,
  moveArrayItem,
  removeArrayItem,
  setAtPath,
  toFieldPath,
  toPointer,
} from "./paths";
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
  getSupportedFormat,
  isArrayOfStringEnum,
  isDisplayOnlySchema,
  isEnumSchema,
  isLongUnformattedString,
  keyToEnumValue,
  optionLabel,
} from "./schema";
import {createSchemaValidator} from "./validation";
import type {
  FieldRenderContext,
  JsonPrimitive,
  JsonSchema,
  PathSegment,
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
const DateField = H.DateField;
const DatePicker = H.DatePicker;
const Description = H.Description ?? ((props: React.HTMLAttributes<HTMLParagraphElement>) => <p {...props} />);
const ErrorMessage = H.ErrorMessage ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div className="error-message" {...props} />);
const FieldError = H.FieldError ?? ((props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />);
const Fieldset = H.Fieldset;
const Form = H.Form;
const Input = H.Input;
const Label = H.Label ?? ((props: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props} />);
const ListBox = H.ListBox;
const NumberField = H.NumberField;
const Radio = H.Radio;
const RadioGroup = H.RadioGroup;
const Select = H.Select;
const Slider = H.Slider;
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
  submit: "Submit",
  errorSummaryTitle: "Please review the highlighted fields.",
  selectOption: "Select an option",
};

const surfaceClassName = "schematic-form__surface rounded-lg border p-3";
const fieldClassName = "schematic-form__field flex flex-col gap-1";
const fieldGapClassName = "gap-0";
const schemaSectionSpacingClassName = "space-y-4";
const fieldsetClassName = `schematic-form__fieldset flex flex-col ${fieldGapClassName}`;
const fieldGroupClassName = `schematic-form__field-group flex flex-col ${fieldGapClassName}`;
const branchClassName = `schematic-form__branch flex flex-col ${fieldGapClassName}`;
const branchGroupClassName = `schematic-form__branch-group ${schemaSectionSpacingClassName}`;
type BranchRenderOptions = {surface?: boolean};

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
  fieldRenderer,
  errorFormatter,
}: SchematicFormProps<TData>) {
  const jsonSchema = schema as JsonSchema;
  const mergedMessages = {...defaultMessages, ...messages};
  const initialData = useMemo(() => {
    if (defaultValue !== undefined) return defaultValue as unknown;
    return defaultValueForSchema(jsonSchema) ?? {};
  }, [defaultValue, jsonSchema]);
  const [internalData, setInternalData] = useState<unknown>(initialData);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [branchSelection, setBranchSelection] = useState<Record<string, number>>({});
  const [rowIdsByPointer, setRowIdsByPointer] = useState<Record<string, string[]>>({});
  const rowIdCounter = useRef(0);
  const formRef = useRef<HTMLFormElement | null>(null);
  const isControlled = value !== undefined;
  const data = (isControlled ? value : internalData) as unknown;
  const validationSchema = useMemo(
    () => applyBranchSelections(jsonSchema, branchSelection),
    [branchSelection, jsonSchema],
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
    onStateChange?.(publicState);
  }, [onStateChange, publicState]);

  const commitData = useCallback(
    (nextData: unknown) => {
      if (!isControlled) setInternalData(nextData);
      onChange?.(nextData as TData);
    },
    [isControlled, onChange],
  );

  const setFieldValue = useCallback(
    (path: PathSegment[], fieldSchema: JsonSchema, nextValue: unknown, required: boolean) => {
      const type = getSchemaType(fieldSchema);
      const shouldDeleteEmptyString = type === "string" && nextValue === "" && fieldSchema.minLength !== 0;
      const shouldDeleteEmptyArray = !required && type === "array" && Array.isArray(nextValue) && nextValue.length === 0;
      const nextData =
        shouldDeleteEmptyString || shouldDeleteEmptyArray
          ? deleteAtPath(data, path)
          : setAtPath(data, path, nextValue);
      commitData(nextData);
    },
    [commitData, data],
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

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      setSubmitted(true);
      const nextState = {
        data: data as TData,
        isValid: validation.isValid,
        errors: validation.errors,
      };

      if (!validation.isValid) {
        window.setTimeout(() => focusFirstIssue(formRef.current, validation.issues), 0);
      }

      onSubmit?.(nextState, event);
    },
    [data, onSubmit, validation.errors, validation.isValid, validation.issues],
  );

  const context: RendererContext<TData> = {
    data,
    disabled,
    readOnly,
    fieldRenderer,
    formRef,
    getVisibleIssues,
    issueMap,
    markTouched,
    messages: mergedMessages,
    rowIdsByPointer,
    setBranchSelection,
    branchSelection,
    setFieldValue,
    setRowIdsByPointer,
    commitData,
    makeRowId() {
      rowIdCounter.current += 1;
      return `sf-row-${rowIdCounter.current}`;
    },
  };

  return (
    <div className={["schematic-form", className].filter(Boolean).join(" ")}>
      <Form
        ref={formRef}
        aria-label={formLabel || "Schematic form"}
        className={`schematic-form__form flex flex-col gap-3`}
        validationBehavior="aria"
        onSubmit={handleSubmit}
      >
        {submitted && validation.errors.length > 0 ? (
          <ErrorSummary title={mergedMessages.errorSummaryTitle} errors={validation.errors} />
        ) : null}
        {renderSchema(jsonSchema, [], false, context)}
        <div className="schematic-form__form-actions flex flex-wrap gap-1">
          <Button isDisabled={disabled} type="submit">
            {mergedMessages.submit}
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
  issueMap: Map<string, ValidationIssue[]>;
  markTouched(pointer: string): void;
  messages: typeof defaultMessages;
  rowIdsByPointer: Record<string, string[]>;
  setBranchSelection: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  branchSelection: Record<string, number>;
  setFieldValue(path: PathSegment[], schema: JsonSchema, value: unknown, required: boolean): void;
  setRowIdsByPointer: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  commitData(data: unknown): void;
  makeRowId(): string;
};

function renderSchema<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  context: RendererContext<TData>,
): React.ReactNode {
  if (isDisplayOnlySchema(schema)) return renderDisplayOnly(schema, path);

  const branch = getBranchSchemas(schema);
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
      <div className={fieldClassName} data-sf-path={pointer} key={pointer}>
        {custom}
      </div>
    );
  }

  const type = getSchemaType(schema);
  if (type === "object") return renderObject(schema, path, context);
  if (type === "array") return renderArray(schema, path, required, context);
  if (isEnumSchema(schema)) return renderScalarEnum(schema, path, required, context);
  if (type === "string") return renderString(schema, path, required, context);
  if (type === "number" || type === "integer") return renderNumber(schema, path, required, context);
  if (type === "boolean") return renderBoolean(schema, path, required, context);

  return null;
}

function renderObject<TData>(schema: JsonSchema, path: PathSegment[], context: RendererContext<TData>) {
  const pointer = toPointer(path);

  return (
    <Surface className={surfaceClassName} data-sf-path={pointer} key={pointer} variant="transparent">
      {renderObjectFieldset(schema, path, context, {root: path.length === 0})}
    </Surface>
  );
}

function renderObjectFieldset<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  context: RendererContext<TData>,
  options: {root?: boolean} = {},
) {
  const label = options.root ? getRootSchemaLabel(schema) : getLabel(schema, path, "Form");
  const keys = getOrderedPropertyKeys(schema);
  const required = new Set(schema.required ?? []);

  return (
    <Fieldset className={fieldsetClassName}>
      {options.root ? (
        <>
          {label ? <TypographyHeading level={2} slot={null}>{label}</TypographyHeading> : null}
        </>
      ) : (
        label ? <FieldsetLegend>{label}</FieldsetLegend> : null
      )}
      <FieldsetGroup className={fieldGroupClassName}>
        {options.root ? (
          schema.description ? (
            <TypographyParagraph color="muted" size="base" slot={null}>
              {schema.description}
            </TypographyParagraph>
          ) : null
        ) : (
          schema.description ? <FieldDescription>{schema.description}</FieldDescription> : null
        )}
        {keys.map((key) => {
          const child = schema.properties?.[key];
          if (!child) return null;
          return renderSchema(child, [...path, key], required.has(key), context);
        })}
      </FieldsetGroup>
    </Fieldset>
  );
}

function renderArray<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  context: RendererContext<TData>,
) {
  if (isArrayOfStringEnum(schema)) return renderStringEnumArray(schema, path, required, context);

  const pointer = toPointer(path);
  const label = getLabel(schema, path, "Item");
  const issues = context.getVisibleIssues(pointer);
  const value = getAtPath(context.data, path);
  const items = Array.isArray(value) ? value : [];
  const rowIds = getRowIds(context, pointer, items.length);
  const canAdd = canAddArrayItem(schema, items.length);
  const itemSchema = schema.items ?? {};
  const itemLabel = getLabel(itemSchema, [...path, 0], label);

  const addItem = () => {
    if (!canAdd) return;
    const newItem = defaultArrayItemValue(schema);
    context.commitData(insertArrayItem(context.data, path, items.length, newItem));
    context.setRowIdsByPointer((current) => ({
      ...current,
      [pointer]: [...getRowIds(context, pointer, items.length), context.makeRowId()],
    }));
  };

  const removeItem = (index: number) => {
    const ids = getRowIds(context, pointer, items.length);
    context.commitData(removeArrayItem(context.data, path, index));
    context.setRowIdsByPointer((current) => ({
      ...current,
      [pointer]: ids.filter((_, idIndex) => idIndex !== index),
    }));
  };

  const moveItem = (from: number, to: number) => {
    const ids = getRowIds(context, pointer, items.length);
    context.commitData(moveArrayItem(context.data, path, from, to));
    const nextIds = [...ids];
    const [id] = nextIds.splice(from, 1);
    nextIds.splice(to, 0, id);
    context.setRowIdsByPointer((current) => ({...current, [pointer]: nextIds}));
  };

  return (
    <Surface className={surfaceClassName} data-sf-path={pointer} key={pointer} variant="transparent">
      <Fieldset className={fieldsetClassName}>
        <FieldsetLegend>{label}</FieldsetLegend>
        <FieldsetGroup className={fieldGroupClassName}>
          <SchemaFieldHelp description={schema.description} issues={issues} />
          <div className="schematic-form__array flex flex-col gap-2">
            <div className="schematic-form__array-items flex flex-col gap-2">
              {items.map((_, index) => {
                const itemPath = [...path, index];
                const itemPointer = toPointer(itemPath);
                return (
                  <Surface
                    className={`${surfaceClassName} schematic-form__array-row flex flex-col gap-2`}
                    data-sf-path={itemPointer}
                    key={rowIds[index] ?? `${pointer}-${index}`}
                    variant="transparent"
                  >
                    {renderArrayItemSchema(withIndexedArrayItemTitle(itemSchema, index), itemPath, context)}
                    <div className="schematic-form__row-actions mt-4 grid grid-cols-3 gap-1">
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
            <div className="schematic-form__array-actions flex flex-col gap-1">
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
) {
  if (isDisplayOnlySchema(schema)) return renderDisplayOnly(schema, path);

  const branch = getBranchSchemas(schema);
  if (branch) return renderBranch(schema, path, true, branch.branches, context, {surface: false});

  if (getSchemaType(schema) === "object") {
    return renderObjectFieldset(schema, path, context);
  }

  return renderSchema(schema, path, true, context);
}

function renderBranch<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  branches: JsonSchema[],
  context: RendererContext<TData>,
  options: BranchRenderOptions = {},
) {
  const pointer = toPointer(path);
  const label = getLabel(schema, path, "Option");
  const selectedIndex = context.branchSelection[pointer] ?? getDefaultBranchIndex(schema, branches);
  const selected = selectedIndex == null ? undefined : branches[selectedIndex];
  const issues = getBranchSelectorIssues(context.getVisibleIssues(pointer), selectedIndex);
  const branchOptions = branches.map((branch, index) => ({
    key: String(index),
    label: branch.title || `Option ${index + 1}`,
  }));

  const setBranch = (key: string) => {
    const nextIndex = Number(key);
    if (!Number.isInteger(nextIndex) || !branches[nextIndex]) return;
    context.setBranchSelection((current) => ({...current, [pointer]: nextIndex}));
    const nextDefault = defaultBranchValue(branches[nextIndex]);
    const nextData = nextDefault === undefined ? deleteAtPath(context.data, path) : setAtPath(context.data, path, nextDefault);
    context.commitData(nextData);
    window.setTimeout(() => focusFirstNestedField(context.formRef.current, pointer), 0);
  };
  const content = (
    <Fieldset className={fieldsetClassName} key={pointer}>
      <FieldsetLegend>{label}</FieldsetLegend>
      <FieldsetGroup className={`${fieldGroupClassName} ${branchGroupClassName}`}>
        {schema.description ? <FieldDescription>{schema.description}</FieldDescription> : null}
        <div className={fieldClassName}>
          <Dropdown
            ariaLabel={label}
            disabled={context.disabled}
            invalid={issues.length > 0}
            name={`${toFieldPath(path)}.__branch`}
            options={branchOptions}
            required={required}
            selectedKey={selectedIndex == null ? null : String(selectedIndex)}
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
    <Surface className={`${surfaceClassName} ${branchClassName}`} data-sf-path={pointer} key={pointer} variant="transparent">
      {content}
    </Surface>
  );
}

function renderDisplayOnly(schema: JsonSchema, path: PathSegment[]) {
  const pointer = toPointer(path);
  return (
    <Fieldset
      className={fieldsetClassName}
      data-sf-display-only="true"
      data-sf-path={pointer}
      key={pointer}
    >
      {schema.title ? <FieldsetLegend>{schema.title}</FieldsetLegend> : null}
      {schema.description ? (
        <FieldsetGroup className={fieldGroupClassName}>
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
) {
  if (isDisplayOnlySchema(schema)) return renderDisplayOnly(schema, path);

  const branch = getBranchSchemas(schema);
  if (branch) return renderBranch(schema, path, required, branch.branches, context, options);

  if (getSchemaType(schema) === "object") {
    return renderObjectFieldset(schema, path, context);
  }

  if (options.surface === false && isEnumSchema(schema)) {
    return renderScalarEnum(schema, path, required, context, {surface: false});
  }

  return renderSchema(schema, path, required, context);
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

  return (
    <TextField
      className={fieldClassName}
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
      <Control
        className="schematic-form__control"
        maxLength={schema.maxLength}
        minLength={schema.minLength}
        pattern={schema.pattern}
        rows={multiline ? 4 : undefined}
      />
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
      className={fieldClassName}
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
      className={fieldClassName}
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
  if (type === "integer" && typeof schema.minimum === "number" && typeof schema.maximum === "number") {
    return renderIntegerSlider(schema, path, required, context);
  }

  const pointer = toPointer(path);
  const label = getLabel(schema, path);
  const rawValue = getAtPath(context.data, path);
  const value = typeof rawValue === "number" ? rawValue : undefined;
  const issues = context.getVisibleIssues(pointer);

  return (
    <NumberField
      className={fieldClassName}
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

function renderIntegerSlider<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  required: boolean,
  context: RendererContext<TData>,
) {
  const pointer = toPointer(path);
  const label = getLabel(schema, path);
  const rawValue = getAtPath(context.data, path);
  const value = typeof rawValue === "number" ? rawValue : schema.minimum;
  const issues = context.getVisibleIssues(pointer);

  return (
    <Slider
      className={fieldClassName}
      data-sf-path={pointer}
      isDisabled={context.disabled}
      isReadOnly={context.readOnly}
      key={pointer}
      maxValue={schema.maximum}
      minValue={schema.minimum}
      step={schema.multipleOf ?? 1}
      value={value}
      onBlur={() => context.markTouched(pointer)}
      onChange={(next: number | number[]) => {
        const nextValue = Array.isArray(next) ? next[0] : next;
        context.setFieldValue(path, schema, nextValue, required);
      }}
    >
      <div className="schematic-form__slider-header flex items-center justify-between gap-1">
        <Label>{label}</Label>
        <SliderOutput />
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
  const label = getLabel(schema, path);
  const value = Boolean(getAtPath(context.data, path));
  const issues = context.getVisibleIssues(pointer);

  return (
    <div className={fieldClassName} data-sf-path={pointer} key={pointer}>
      <div className="schematic-form__switch-row flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <Switch
          aria-label={label}
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
  const label = getLabel(schema, path);
  const value = getAtPath(context.data, path) as JsonPrimitive | undefined;
  const selectedKey = value === undefined ? undefined : enumValueToKey(value);
  const issues = context.getVisibleIssues(pointer);

  const content = (
    <Fieldset className={fieldsetClassName}>
      <FieldsetLegend>{label}</FieldsetLegend>
      <FieldsetGroup className={fieldGroupClassName}>
        <RadioGroup
          aria-label={label}
          className={fieldClassName}
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
    <Surface className={surfaceClassName} data-sf-path={pointer} key={pointer} variant="transparent">
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
  const label = getLabel(schema, path);
  const value = getAtPath(context.data, path) as JsonPrimitive | undefined;
  const selectedKey = value === undefined ? undefined : enumValueToKey(value);
  const issues = context.getVisibleIssues(pointer);

  return (
    <div className={fieldClassName} data-sf-path={pointer} key={pointer}>
      <Dropdown
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
) {
  const options = (schema.items?.enum ?? []).filter((value): value is string => typeof value === "string");
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
  const label = getLabel(schema, path);
  const rawValue = getAtPath(context.data, path);
  const value = Array.isArray(rawValue) ? rawValue.filter((item): item is string => typeof item === "string") : [];
  const issues = context.getVisibleIssues(pointer);

  return (
    <Surface className={surfaceClassName} data-sf-path={pointer} key={pointer} variant="transparent">
      <Fieldset className={fieldsetClassName}>
        <FieldsetLegend>{label}</FieldsetLegend>
        <FieldsetGroup className={fieldGroupClassName}>
          <CheckboxGroup
            aria-label={label}
            className={fieldClassName}
            isDisabled={context.disabled}
            isInvalid={issues.length > 0}
            isReadOnly={context.readOnly}
            isRequired={required}
            name={toFieldPath(path)}
            value={value}
            onBlur={() => context.markTouched(pointer)}
            onChange={(next: string[]) => context.setFieldValue(path, schema, normalizeStringEnumArray(next, schema), required)}
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
    context.setFieldValue(path, schema, normalizeStringEnumArray([...keys], schema), required);
  };

  return (
    <div className={fieldClassName} data-sf-path={pointer} key={pointer}>
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
  onBlur?: () => void;
  onChange?: (key: string) => void;
  onMultipleChange?: (keys: Set<string>) => void;
}) {
  return (
    <Select
      aria-label={ariaLabel ?? label}
      className="schematic-form__control"
      fullWidth
      isDisabled={disabled}
      isInvalid={invalid}
      isRequired={required}
      name={name}
      placeholder="Select an option"
      selectedKey={multiple ? undefined : selectedKey ?? null}
      selectedKeys={multiple ? selectedKeys ?? new Set<string>() : undefined}
      selectionMode={multiple ? "multiple" : "single"}
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

function IssueList({issues}: {issues: ValidationIssue[]}) {
  return (
    <FieldError slot="errorMessage">
      {issues.map((issue) => (
        <div key={`${issue.path}-${issue.keyword}`}>{issue.message}</div>
      ))}
    </FieldError>
  );
}

function SchemaIssueList({issues}: {issues: ValidationIssue[]}) {
  return (
    <ErrorMessage className="schematic-form__error-message" data-slot="schema-error-message">
      {issues.map((issue) => (
        <div key={`${issue.path}-${issue.keyword}`}>{issue.message}</div>
      ))}
    </ErrorMessage>
  );
}

function ErrorSummary({title, errors}: {title: string; errors: string[]}) {
  return (
    <div className="schematic-form__error-summary" role="alert">
      <Typography slot={null} type="h4">{title}</Typography>
      <ul>
        {errors.map((error) => (
          <li key={error}>{error}</li>
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
  const name = schema.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  if (typeof schema.title === "string" && schema.title.trim()) return schema.title.trim();
  return "";
}

function getBranchSelectorIssues(issues: ValidationIssue[], selectedIndex: number | undefined): ValidationIssue[] {
  if (selectedIndex == null) return issues;
  return issues.filter((issue) => issue.keyword !== "oneOf" && issue.keyword !== "anyOf");
}

function defaultBranchValue(schema: JsonSchema): JsonPrimitive | Record<string, unknown> | unknown[] | undefined {
  const defaultValue = defaultValueForSchema(schema);
  if (defaultValue !== undefined) return defaultValue;
  if (schema.enum?.length) return schema.enum[0];

  const type = getSchemaType(schema);
  if (type === "null") return null;
  if (type === "string") return "";
  if (type === "number" || type === "integer") return schema.minimum ?? 0;
  return undefined;
}

function applyBranchSelections(
  schema: JsonSchema,
  selections: Record<string, number>,
  path: PathSegment[] = [],
): JsonSchema {
  const branch = getBranchSchemas(schema);
  if (branch) {
    const selectedIndex = selections[toPointer(path)] ?? getDefaultBranchIndex(schema, branch.branches);
    const selected = selectedIndex == null ? undefined : branch.branches[selectedIndex];
    if (selected) return applyBranchSelections(selected, selections, path);
  }

  const output: JsonSchema = {...schema};

  if (schema.properties) {
    output.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, child]) => [
        key,
        applyBranchSelections(child, selections, [...path, key]),
      ]),
    );
  }

  if (schema.items) {
    output.items = applyBranchSelections(schema.items, selections, [...path, 0]);
  }

  if (Array.isArray(schema.oneOf)) {
    output.oneOf = schema.oneOf.map((child) => applyBranchSelections(child, selections, path));
  }

  if (Array.isArray(schema.anyOf)) {
    output.anyOf = schema.anyOf.map((child) => applyBranchSelections(child, selections, path));
  }

  return output;
}

function focusFirstIssue(form: HTMLFormElement | null, issues: ValidationIssue[]) {
  if (!form || issues.length === 0) return;
  const firstPath = issues[0]?.path;
  for (const container of form.querySelectorAll<HTMLElement>("[data-sf-path]")) {
    if (container.dataset.sfPath !== firstPath) continue;
    const target = container.matches("input, textarea, button, select, [tabindex]")
      ? container
      : container.querySelector<HTMLElement>("input, textarea, button, select, [tabindex]");
    target?.focus();
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

    target.focus();
    target.click();
    return;
  }
}

function getFocusableTarget(container: HTMLElement): HTMLElement | null {
  if (isFocusable(container)) return container;
  return container.querySelector<HTMLElement>(
    [
      "input:not([type='hidden']):not([disabled])",
      "textarea:not([disabled])",
      "button:not([disabled])",
      "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(", "),
  );
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

function normalizeStringEnumArray(values: string[], schema: JsonSchema): string[] {
  const allowed = new Set((schema.items?.enum ?? []).filter((item): item is string => typeof item === "string"));
  const filtered = values.filter((value) => allowed.has(value));
  if (!schema.uniqueItems) return filtered;
  return [...new Set(filtered)];
}
