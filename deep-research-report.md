# SchematicForm

## Executive summary

A small public React component library named **SchematicForm** is feasible and technically clean **if it is built as a React-first library that uses HeroUI v3 components directly**, with JSON Schema as the single source of truth for structure and validation. The most important factual constraint is that **HeroUI v3 is officially documented as a React component library built on Tailwind CSS v4 and React Aria Components**; its docs do **not** present it as a native Custom Elements library. HeroUI v3’s migration guidance also expects **React 19+**, and the current component docs display the v3 line (for example, the Form page currently shows v3.1.0). citeturn28view1turn28view2turn36view4

That means the best implementation path is this: **render HeroUI React components directly**, recursively from a normalized JSON Schema AST, and keep a **separate optional adapter layer** only if you truly need browser-native custom elements. React 19 materially improved custom-element interoperability by assigning properties on custom elements when they exist on the element instance and by allowing JSX listeners for `CustomEvent`s using the `on...` naming convention; HeroUI also exposes **variant functions** specifically for applying its styling to framework-specific components or custom elements. citeturn6view0turn6view1turn28view0

For validation, the strongest recommendation is **Ajv as the primary engine**. Ajv natively supports JSON Schema drafts 04, 06, 07, 2019-09, and 2020-12; it compiles schemas into efficient JavaScript validation functions; it caches compiled schemas; and its best-performance path is to reuse compiled validators. Formats should be enabled via **`ajv-formats`**, localized messages via **`ajv-i18n`**, and optional human-friendly message reshaping via **`ajv-errors`**. Zod is useful when you are authoring schemas in TypeScript first, but **`z.fromJSONSchema()` is explicitly experimental**; Yup has built-in async validation but is not a native JSON Schema runtime and is therefore a worse fit for a JSON-Schema-driven form renderer. citeturn8search6turn23search4turn23search23turn24search8turn8search12turn8search3turn9search2turn9search5turn10search0turn10search1turn10search3

For packaging and delivery, the best default stack is **TypeScript + Vite library mode + Storybook + Playwright + semantic-release + GitHub Actions + npm public publishing**. Vite’s library mode is explicitly intended for browser-oriented and JS-framework libraries; Storybook is built for developing, testing, and documenting components in isolation; semantic-release automates versioning and publishing; GitHub Actions has an official path for publishing Node packages after CI passes; npm requires `--access public` on the first publish of a scoped public package; and TypeScript recommends shipping generated declaration files with the package source. citeturn32view1turn32view3turn32view4turn32view5turn15search11turn32view6turn32view7

The single biggest architectural conclusion is therefore straightforward: **SchematicForm should be a React library, not a Custom Elements library, unless you have a hard external requirement for custom elements.** If that requirement exists, build the core renderer in React anyway, and offer a thin React-19-compatible custom-element adapter layer as an integration surface. citeturn28view1turn6view1turn28view0

## HeroUI and React integration

The first thing to settle rigorously is terminology. HeroUI v3’s official docs describe HeroUI as **“a React component library”** built on Tailwind CSS v4 and React Aria Components, with built-in accessibility and customization. Its migration docs also explicitly say to **update React to v19+** when moving to HeroUI v3. That makes HeroUI suitable for **React-rendered web UIs**, but it is not officially presented as a shipping browser-native custom-element set in the sense of `<my-element>`-style components. citeturn28view1turn28view2

This distinction matters because the user requirement mentions “HeroUI 3.0 web components” and asks about “wrapping/custom elements, props/events.” The evidence-based answer is:

- **Preferred path**: use HeroUI React components directly.
- **Supported escape hatch**: if you need to render custom elements, use React 19’s custom-element support plus HeroUI’s **variant functions** and render/custom-render APIs to apply HeroUI styling and behavior patterns. HeroUI’s Composition docs explicitly say that variant functions can be used to apply HeroUI styles to **framework-specific components or custom elements**. React 19, in turn, supports custom-element properties and `CustomEvent` listeners in JSX. citeturn28view0turn6view0turn6view1

For SchematicForm, this yields a practical integration rule:

1. The library runtime should render **HeroUI React primitives and field composites** such as `Form`, `TextField`, `NumberField`, `Select`, `Checkbox`, `CheckboxGroup`, `RadioGroup`, `Switch`, `DateField`, `Fieldset`, `Card`, `Accordion`, and `Disclosure` as appropriate. HeroUI’s official component pages show these pieces and their accessibility/validation hooks. citeturn28view4turn28view6turn28view7turn28view8turn35view1turn28view10turn28view11turn33view7turn28view12turn3search7turn28view13turn2search2turn2search22

2. The public package can optionally export **adapters** for teams that insist on custom elements at integration boundaries. These adapters should be thin and should not become the main rendering model.

3. Validation should be **owned by SchematicForm via Ajv**, not delegated to HeroUI’s HTML5/native validation layer. HeroUI’s `Form` supports `validationBehavior="native"` and `validationBehavior="aria"`, where the latter shows errors in real time and does not block submission. For a JSON-Schema-driven library, `aria` is the more appropriate UX layer because JSON Schema rules exceed HTML5’s native constraint model. citeturn36view0turn36view1

A minimal React-side adapter pattern for a custom element boundary looks like this:

```tsx
import React, {forwardRef, useEffect, useRef} from "react";
import {inputVariants} from "@heroui/styles";

type HeroTextFieldElement = HTMLElement & {
  value: string;
  invalid: boolean;
};

type HeroTextFieldAdapterProps = {
  value: string;
  invalid?: boolean;
  label?: string;
  onValueChange?: (value: string) => void;
};

export const HeroTextFieldAdapter = forwardRef<
  HeroTextFieldElement,
  HeroTextFieldAdapterProps
>(function HeroTextFieldAdapter(
  { value, invalid = false, label, onValueChange },
  forwardedRef
) {
  const localRef = useRef<HeroTextFieldElement | null>(null);

  useEffect(() => {
    const el = localRef.current;
    if (!el || !onValueChange) return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ value?: string } | string>).detail;
      const next =
        typeof detail === "string"
          ? detail
          : detail?.value ?? (el as any).value ?? "";
      onValueChange(next);
    };

    el.addEventListener("valuechange", handler as EventListener);
    return () => el.removeEventListener("valuechange", handler as EventListener);
  }, [onValueChange]);

  return (
    <hero-text-field
      ref={(node) => {
        localRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      class={inputVariants()}
      value={value}
      invalid={invalid}
      aria-label={label}
    />
  );
});
```

This works because React 19 improves custom-element property/event handling, while HeroUI’s style system can be applied to custom elements via variant functions. In the actual SchematicForm library, though, the renderer should almost always prefer direct HeroUI React composition rather than this adapter. citeturn6view0turn6view1turn28view0

Primary HeroUI references worth keeping open during implementation are the official pages for **Introduction**, **Composition**, **Theming**, **Form**, **TextField**, **NumberField**, **Select**, **ComboBox**, **CheckboxGroup**, **RadioGroup**, **DateField**, **Card**, and **Accordion/Disclosure**. These are the most directly relevant primary sources for SchematicForm’s rendering layer. citeturn28view1turn28view0turn28view3turn28view4turn28view6turn28view7turn28view8turn28view9turn28view10turn28view11turn28view12turn28view13turn2search2turn2search22

## Schema mapping and validation strategy

JSON Schema is already a UI-friendly validation vocabulary in the sense that the spec explicitly recognizes it can provide hints for user interfaces, but SchematicForm should still treat it as **data contract first, rendering model second**. The correct architecture is to **normalize the input schema into an internal field tree**, then render from that tree while Ajv remains the validation authority. citeturn7search12turn24search2

### Recommended mapping rules

The table below gives the most defensible mapping from JSON Schema constructs to HeroUI components and renderer behavior.

| JSON Schema construct | Recommended HeroUI rendering | SchematicForm rule |
|---|---|---|
| `type: "object"` | `Fieldset` for semantic grouping, optionally `Card` / `Accordion` / `Disclosure` for nested sections | Render each property recursively. Use `required` to mark child fields. Prefer `Fieldset` when you have a clear legend and related controls. JSON objects are key-value property maps. citeturn29view0turn3search7turn28view13turn2search2turn2search22 |
| `type: "array"` with uniform `items` | Repeating section of `Card`s or `Fieldset`s plus HeroUI `Button`s for add/remove | Arrays support arbitrary-length list validation when `items` is a single schema. Maintain stable row IDs separate from indexes for React keys. citeturn29view1turn31search7turn28view13turn2search11 |
| `type: "array"` with `prefixItems` | Fixed tuple renderer | Render by index with no generic “add item” button unless the schema also allows trailing items. JSON Schema distinguishes tuple validation from list validation. citeturn29view1turn31search7 |
| `type: "string"` | `TextField` + `Input`; use `TextArea` for long-form text | String rules such as `minLength`, `maxLength`, and `pattern` attach naturally to `TextField`. HeroUI v3 recommends `TextField` rather than bare `Input` for labels, descriptions, and `FieldError`. citeturn30search0turn28view5turn28view6turn33view1 |
| `type: "number"` / `type: "integer"` | `NumberField` | Use numeric constraints (`minimum`, `maximum`, exclusive variants, `multipleOf`) in Ajv and mirror the most useful subset in field UI hints. JSON Schema treats `integer` and `number` as numeric types sharing keywords. citeturn29view3turn30search4turn33view2 |
| `type: "boolean"` | `Checkbox` for simple booleans, `Switch` when semantics are “on/off” | JSON booleans are strictly `true`/`false`. Use `Checkbox` when consent/acknowledgment wording matters; use `Switch` for toggles. citeturn29view4turn35view1turn33view7 |
| `enum` | `Select`, `RadioGroup`, or `CheckboxGroup` | Use `RadioGroup` when options are few and exclusive; `Select` when options are many; `CheckboxGroup` for multi-select arrays of enum values. `enum` restricts values to a fixed set. citeturn31search0turn28view8turn28view11turn28view10 |
| `format` | Usually `TextField`; `DateField` for `date`; `ComboBox` only when format is domain-specific and searchable | In modern JSON Schema drafts, `format` is annotation by default unless the validator enables assertion. In Ajv, use `ajv-formats` when you want enforcement. citeturn29view2turn7search9turn24search8turn28view12 |
| `required` | `isRequired` on child field components + visible required indicator | `required` applies to object property presence, not to arbitrary values globally. Surface it both visually and programmatically. citeturn30search4turn33view1turn36view1turn21search6 |
| `minLength` / `maxLength` / `pattern` | `TextField` with live helper text and `FieldError` | Use AJV for truth; optionally mirror as HTML hints where safe. Patterns are not implicitly anchored in JSON Schema, so anchor them explicitly when the intent is full-string matching. citeturn30search0turn30search4turn30search9turn28view6 |
| `minimum` / `maximum` / `exclusiveMinimum` / `exclusiveMaximum` | `NumberField` with helper text | Use AJV as source of truth. Where possible, mirror constraints in display text and, if desired, numeric step/min/max input hints. citeturn30search4turn33view2 |
| draft-4/7 `dependencies` | Normalize into internal `dependentRequired` / `dependentSchemas` form | JSON Schema renamed the array form of `dependencies` to `dependentRequired` and moved the schema form to the core spec. Support both on ingestion. citeturn7search6turn7search14 |
| `dependentRequired` | Conditional “required” state on sibling fields | When trigger property exists, mark dependent fields required and visible if your UI hides conditional fields. citeturn28view15turn30search4 |
| `dependentSchemas` | Conditional section activation | Apply the dependent subschema as an additional schema branch when the trigger property exists; do not “merge blindly.” citeturn31search8turn28view14 |
| `allOf` | Pre-merge into effective renderer node where safe | `allOf` means the instance must validate against all subschemas. Use merge for rendering only when property-level composition is unambiguous; always keep Ajv runtime validation intact. citeturn28view14 |
| `oneOf` | Explicit branch selector and branch-specific renderer | `oneOf` means exactly one subschema must validate. Prefer a radio/select discriminator when you can infer it from `const`/`enum` branch tags. Without a discriminator, branch UX becomes fragile. citeturn28view14 |
| `anyOf` | Optional branch activation or tolerant branch chooser | `anyOf` means one or more matching branches are acceptable. For UX, avoid showing every branch at once unless the schema was designed that way. citeturn28view14 |

### Conditional rendering and nested schemas

The hardest part of a JSON-Schema-driven form is not primitive fields; it is **conditional and nested composition**. `dependentRequired` and `dependentSchemas` are relatively straightforward because the trigger is the presence of a property. `oneOf` and `anyOf` are harder because branch validity can depend on multiple values, and because `oneOf` must match **exactly one** branch. For usability, SchematicForm should implement a **branch resolver** that tries the current data against each branch validator and then prefers one of three strategies:

- **discriminator-based selection** when branches expose a unique `const` or single-value `enum` property;
- **manual selection** via `RadioGroup` or `Select` when a discriminator is not inferable;
- **best-effort automatic selection** only when exactly one branch already validates. citeturn28view14turn31search0turn28view11turn28view8

For nested objects, the most accessible structure is usually **progressive disclosure, not a flat mega-form**. HeroUI’s `Fieldset`, `Card`, `Accordion`, and `Disclosure` components are all suitable building blocks. Use `Fieldset` when the group genuinely has a legend and common semantics; use `Accordion` or `Disclosure` for deep schemas to reduce cognitive load and initial render cost; and use `Card` when each subtree is conceptually a self-contained block. citeturn3search7turn28view13turn2search2turn2search22

For arrays, the renderer should distinguish **item identity** from **array position**. Add/remove operations should manipulate the data array, but the UI should keep a separate stable row ID list so that moving or deleting items does not cause widespread React remounting or lost focus. For arrays of objects, render each item in a `Card` or `Fieldset` with **Move Up**, **Move Down**, **Duplicate**, and **Remove** actions; for arrays of primitives, prefer a lighter inline row renderer. JSON Schema’s array model cleanly supports both variable-length lists and fixed tuples, so SchematicForm should support both explicitly rather than pretending every array is a repeatable list. citeturn29view1turn31search7turn28view13

### Validation libraries compared

| Library | Native JSON Schema fit | Strengths | Weaknesses for SchematicForm | Recommendation |
|---|---|---|---|---|
| **Ajv** | **Excellent** | Supports JSON Schema drafts 04/06/07/2019-09/2020-12; compiles validators; caches schemas; supports async keywords/formats; strong extension ecosystem (`ajv-formats`, `ajv-i18n`, `ajv-errors`, `ajv-keywords`). citeturn8search6turn23search4turn23search23turn8search0turn8search2turn24search8turn8search12turn8search3 | Treats schemas as trusted by default, so untrusted schemas need extra care; strict mode means UI-only custom keywords must be stripped or registered. citeturn24search9turn8search1turn8search2 | **Use as the primary validation engine.** |
| **Zod** | Moderate | TypeScript-first ergonomics; strong schema authoring; async refinements via `parseAsync`; native JSON Schema conversion in Zod 4. citeturn9search5turn9search1turn9search7turn9search6 | `z.fromJSONSchema()` is explicitly experimental, so JSON-Schema-in → Zod-runtime is not the strongest stable foundation for a public library centered on JSON Schema input. citeturn9search2 | Good **optional adapter** for teams already authoring in Zod, but not the default engine. |
| **Yup** | Weak | Concise API, built-in async validation, TypeScript support, expressive interdependent validations. citeturn10search0turn10search1 | Not JSON Schema native; `validateSync` only works when no async tests are configured; weaker as a direct runtime for arbitrary JSON Schema. citeturn10search3 | Useful only as a **consumer-side adapter**, not as SchematicForm core. |

### Recommended validation pipeline

The cleanest approach is a **two-stage pipeline**: synchronous schema validation on every local edit, then optional asynchronous business validation after the schema pass. Ajv supports asynchronous formats and keywords, but in practice I recommend keeping **JSON Schema validation synchronous** for fast keystroke feedback and using a second async stage only for business checks such as uniqueness, server-side lookups, or policy checks. Ajv supports async keywords when declared with `async: true`; if you do use them, the validator becomes async and must be awaited. citeturn8search0turn8search2

A robust validation flow looks like this:

```tsx
import Ajv, {ErrorObject} from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({
  allErrors: true,
  strict: true,       // strip/register UI-only keywords before compile
  validateSchema: true
});
addFormats(ajv);

type Issue = {
  path: string;       // JSON Pointer, e.g. /profile/email
  keyword: string;    // e.g. "required", "format", "minLength"
  message: string;    // human-readable
};

function compileSchema(schema: object) {
  return ajv.compile(schema);
}

function validateData(
  validate: ReturnType<typeof compileSchema>,
  data: unknown
): { isValid: boolean; issues: Issue[]; errors: string[] } {
  const ok = validate(data);

  const rawErrors: ErrorObject[] = ok ? [] : (validate.errors ?? []);
  const issues: Issue[] = rawErrors.map((err) => ({
    path: err.instancePath || "/",
    keyword: err.keyword,
    message: err.message ?? "Invalid value",
  }));

  const errors = issues.map((i) =>
    `${i.path === "/" ? "form" : i.path}: ${i.message}`
  );

  return { isValid: ok as boolean, issues, errors };
}
```

Ajv validates the schema against its metaschema by default unless `validateSchema` is disabled, which is useful even if you are told schemas are valid, because it catches draft mismatches and unsupported shapes early. Use `allErrors: true` so the external `errors[]` output contains a complete snapshot rather than the first failure only. citeturn24search1turn24search7

### UI-only metadata and custom keywords

A practical public library almost always needs a few UI hints that pure JSON Schema does not standardize: preferred widget, placeholder, grouping, order, help text variations, or a display-only branch label. The safest design is to keep these **out of the JSON Schema proper** in a separate `uiSchema` prop. If you choose to embed them, use a vendor namespace such as `x-ui`, and either **strip those keys before Ajv compilation** or **register them as no-op custom keywords** so Ajv strict mode does not treat them as suspicious schema mistakes. Ajv’s strict mode exists to catch silently ignored schema errors, and Ajv supports user-defined keywords, including async ones. citeturn8search1turn8search2

### Performance for deep schemas

There are three distinct performance dangers in this kind of library. The first is validation cost, the second is React re-render cost, and the third is union/recursive schema cost. Ajv already helps on the first point because it compiles validators to functions, caches them, and recommends reusing compiled validators for best performance. React’s own guidance warns that controlled inputs can become slow when every keystroke re-renders a large tree, and React’s optimization hooks (`memo`, `useMemo`, `useCallback`) exist specifically to skip repeated work when inputs have not changed. JSON Schema’s own combination docs also warn that recursive use of `oneOf` / `anyOf` / `allOf` can expand processing costs significantly. citeturn23search4turn23search1turn23search16turn23search14turn23search6turn23search21turn28view14

For SchematicForm, the practical performance rules are these:

- **Compile and memoize validators once per schema instance**.
- **Normalize schema once** into a render tree with cached path lookups.
- Keep data in a **path-addressable store** so that a field update only re-renders that field, its ancestor summaries, and any affected conditional branches.
- Use **stable row IDs** for arrays.
- **Lazy mount** deep `Accordion` / `Disclosure` content where possible.
- Cache `oneOf`/`anyOf` branch resolution results until a dependent path changes.
- Consider **debounced full-form validation** for extremely large schemas, but keep cheap field-level invalid state immediate. citeturn23search4turn23search16turn23search14turn2search2turn2search22turn28view14

## Public API and internal architecture

The clearest public surface for SchematicForm is a **controlled/uncontrolled form component** plus a few low-level utilities. The public API should not leak HeroUI complexity, but it should allow consumers to override rendering at field level where they need to. HeroUI’s field components are composition-friendly and support labels, descriptions, validation state, and field errors, so SchematicForm can map its internal field state into those props cleanly. citeturn28view6turn33view1turn33view2turn34view2

### Recommended public component API

```tsx
export type SchematicFormState<TData = unknown> = {
  data: TData;
  isValid: boolean;
  errors: string[]; // required public output
};

export type ValidationMode = "change" | "blur" | "submit" | "hybrid";

export type SchematicFormProps<TData = unknown> = {
  schema: object;
  value?: TData;
  defaultValue?: TData;

  onChange?: (data: TData) => void;
  onStateChange?: (state: SchematicFormState<TData>) => void;
  onSubmit?: (state: SchematicFormState<TData>, event: React.FormEvent) => void;

  validationMode?: ValidationMode;
  validateAsync?: (data: TData) => Promise<string[]>;
  uiSchema?: Record<string, unknown>;

  locale?: string;
  messages?: Partial<{
    addItem: string;
    removeItem: string;
    moveItemUp: string;
    moveItemDown: string;
    required: string;
    invalid: string;
    selectOption: string;
    noOptions: string;
    errorSummaryTitle: string;
  }>;

  className?: string;
  readOnly?: boolean;
  disabled?: boolean;

  // advanced extension points
  fieldRenderer?: (ctx: FieldRenderContext) => React.ReactNode;
  errorFormatter?: (issue: ValidationIssue) => string;
};
```

This design keeps the required outputs exactly as requested—`data`, `isValid`, and `errors[]`—while still allowing professional-grade integration via `uiSchema`, custom field renderers, async validation, and formatter hooks. The library should also export types like `FieldNode`, `ValidationIssue`, and `NormalizeOptions` for advanced users, but the `SchematicForm` component should remain the primary entry point. citeturn24search1turn33view1turn33view2

A typical usage should look like this:

```tsx
import {SchematicForm} from "@schematic-form/react";

const schema = {
  type: "object",
  required: ["name", "email"],
  properties: {
    name: { type: "string", minLength: 2, title: "Full name" },
    email: { type: "string", format: "email", title: "Email" },
    age: { type: "integer", minimum: 18, title: "Age" },
    newsletter: { type: "boolean", title: "Subscribe to newsletter" },
    interests: {
      type: "array",
      title: "Interests",
      items: { enum: ["design", "product", "engineering"] }
    }
  }
} as const;

export function Demo() {
  return (
    <SchematicForm
      schema={schema}
      validationMode="hybrid"
      onStateChange={({data, isValid, errors}) => {
        console.log({data, isValid, errors});
      }}
      onSubmit={({data, isValid, errors}, e) => {
        e.preventDefault();
        if (isValid) {
          console.log("submit", data);
        } else {
          console.warn(errors);
        }
      }}
    />
  );
}
```

### Internal modules

The internal architecture should be narrow and boring. That is a compliment. The best split is:

- **schema-normalizer**: resolves draft differences, `$ref`s, `dependencies` normalization, UI metadata extraction, default titles.
- **render-model**: converts normalized schema into `FieldNode`s with paths, widgets, visibility rules, and branch metadata.
- **state-store**: keeps `data`, `touched`, `dirty`, `branchSelection`, `arrayRowIds`, and `validation`.
- **validator**: owns Ajv instances, compiled validators, format plugins, async stage, and error localization.
- **renderer**: recursively maps `FieldNode` to HeroUI components.
- **error-format**: converts Ajv `ErrorObject[]` into path-indexed issues and public `errors[]` strings. citeturn23search4turn24search1turn8search11turn8search12

```mermaid
flowchart TD
  A[JSON Schema input] --> B[Schema normalizer]
  B --> C[Resolved FieldNode tree]
  C --> D[Renderer]
  D --> E[HeroUI React components]

  C --> F[Visibility / branch resolver]
  F --> D

  G[User input] --> H[State store]
  H --> D
  H --> I[Ajv sync validator]
  I --> J[Issue formatter]
  J --> K[data, isValid, errors[]]

  H --> L[Optional async validator]
  L --> J
```

The most important design choice is that **the renderer never “figures out” validation**. It only receives field state from the store and validator pipeline. That separation keeps the library testable and makes it realistic to add future adapters or alternate field widgets. citeturn23search4turn32view9

### Error reporting format

The external API should satisfy the requirement with:

```ts
type PublicFormState<T> = {
  data: T;
  isValid: boolean;
  errors: string[];
};
```

Internally, however, SchematicForm should preserve structured issues:

```ts
type ValidationIssue = {
  path: string;        // "/profile/email"
  fieldPath: string;   // "profile.email"
  keyword: string;     // "required" | "format" | ...
  message: string;     // localized human message
};
```

Then generate public strings from a formatter like:

```ts
(issue) => `${issue.fieldPath}: ${issue.message}`
```

This gives consumers the requested `errors[]` while still allowing accessible inline errors, summaries, and field linking. WAI guidance is clear that form errors should be identified in text, should reference the corresponding label/control, and should suggest correction where possible. HeroUI’s `FieldError` and `Form` components already align well with this pattern. citeturn21search1turn21search18turn21search19turn36view1turn20search4

### Accessibility, i18n, and theming

For accessibility, there are four non-negotiables. Every field needs a programmatic label. Required state must be conveyed both visually and semantically. Errors must be textual and associated with the field. The form itself should expose a landmark via `aria-label` or `aria-labelledby`, and invalid submission should move focus predictably to the first failing control or error summary. These are all consistent with WAI guidance and with HeroUI Form’s accessibility model. citeturn21search0turn21search3turn21search10turn21search24turn21search4turn36view2turn36view3

For internationalization, the library should be **framework-agnostic**. Do not make `react-i18next` or `react-intl` a hard dependency. Instead, accept `locale`, `messages`, and an optional translator hook/callback; then let consumer apps bridge to **i18next/react-i18next** or **FormatJS/React Intl**. This keeps SchematicForm embeddable in more applications while still supporting ICU-style messages, pluralization, and runtime locale switching. For Ajv validation messages, wire in **`ajv-i18n`** or a consumer-supplied formatter. citeturn22search2turn22search0turn22search1turn22search3turn8search12

For theming, SchematicForm should simply ride HeroUI’s system. HeroUI v3 uses **CSS variables** and **BEM classes** for theming and supports standard CSS, Tailwind utilities, CSS-in-JS, and render props/custom render functions. That means SchematicForm should avoid inventing its own parallel theme system. Instead, expose `className`, fine-grained slot overrides if needed, and respect the host app’s HeroUI theme. citeturn28view3turn20search8turn28view0

## Testing strategy in VS Code with Codex

A strong testing story for SchematicForm should deliberately target **three layers**:

- **unit tests** for schema normalization, path utilities, array operations, branch selection, and Ajv error formatting;
- **component/integration tests** for React rendering and interaction against HeroUI components;
- **end-to-end tests** for true browser behavior, accessibility flows, focus management, and conditional rendering across Chromium/WebKit/Firefox. citeturn32view9turn32view10

### Testing stack compared

| Tool | Primary role | Best use in this project | Trade-off |
|---|---|---|---|
| **Jest** | General-purpose JS/TS test runner | Stable unit testing, mocks, snapshots, JSDOM-based integration if your team already standardizes on Jest. citeturn14search3turn32view8turn26search0 | Slightly less Vite-native than Vitest. |
| **Vitest** | Vite-native test runner | Excellent alternative for unit/integration tests in a Vite-based library; shares Vite config and pipeline. citeturn32view11turn27search1 | Not the framework the user explicitly named, so adopt only if team prefers Vite-native tooling. |
| **React Testing Library** | DOM-centric component testing helpers | Best for renderer behavior, user interactions, and accessibility-oriented queries. Its core principle matches this library well: test the way software is used. citeturn32view9turn26search21 | Not a runner by itself; pair with Jest or Vitest. |
| **Playwright Test** | E2E cross-browser framework | Best for browser fidelity, focus behavior, form submission, and regression coverage in real engines and CI. citeturn32view10turn14search5 | Higher runtime cost than unit/component tests. |

My recommendation is slightly differentiated from the user’s requested examples:

- If your organization already uses Jest, use **Jest + React Testing Library + Playwright**.
- If you are starting greenfield with Vite, use **Vitest + React Testing Library + Playwright**, while still documenting Jest examples for consumers if desired. citeturn32view11turn32view9turn32view10

### What to test

Unit tests should cover schema normalization and validation semantics more heavily than component visuals. That means:

- draft normalization (`dependencies` → `dependentRequired` / `dependentSchemas`);
- path get/set utilities;
- array insertion/removal/move with stable row IDs;
- `oneOf` branch selection heuristics;
- `allOf` merge behavior;
- Ajv error formatting and public `errors[]` generation;
- visibility rule evaluation. citeturn7search6turn28view14turn23search4

Integration tests should cover real rendered forms:

- required/error display with `validationBehavior="aria"`;
- nested object sections;
- arrays of objects with add/remove/reorder;
- enum mapping to `RadioGroup`, `Select`, and `CheckboxGroup`;
- field disabling and read-only state;
- conditional rendering from `dependentRequired`, `dependentSchemas`, and `oneOf`;
- accessibility queries by role, label text, and error text. citeturn36view1turn33view5turn33view6turn34view2turn26search21

End-to-end tests should verify what JSDOM cannot:

- browser focus movement to the first invalid field;
- keyboard navigation inside `Select`, `RadioGroup`, `CheckboxGroup`, and nested disclosures;
- mobile-ish viewport behavior for deep forms;
- cross-browser behavior for date-like or formatted inputs;
- serialized public outputs shown in a demo page or Storybook harness. citeturn32view10turn14search5

### Mocking web components and custom boundaries

If SchematicForm includes optional custom-element adapters, keep those tests narrow. In component tests, the simplest path is usually:

1. register a lightweight custom element stub with `customElements.define(...)`;
2. dispatch `CustomEvent`s manually using Testing Library’s event helpers;
3. use Jest manual mocks for external modules or adapter helpers as needed. React Testing Library and DOM Testing Library support custom queries and event creation; Jest supports manual mocks and class/module mocks. citeturn26search0turn26search3turn26search12turn26search15

```tsx
// custom-element.test.tsx
import {render, screen, fireEvent} from "@testing-library/react";
import {HeroTextFieldAdapter} from "./HeroTextFieldAdapter";

beforeAll(() => {
  class HeroTextField extends HTMLElement {
    value = "";
    invalid = false;
  }
  customElements.define("hero-text-field", HeroTextField);
});

test("bridges valuechange CustomEvent to React callback", () => {
  const onValueChange = jest.fn();

  render(
    <HeroTextFieldAdapter
      value=""
      label="Name"
      onValueChange={onValueChange}
    />
  );

  const el = screen.getByLabelText("Name");
  fireEvent(
    el,
    new CustomEvent("valuechange", { detail: { value: "Alice" } })
  );

  expect(onValueChange).toHaveBeenCalledWith("Alice");
});
```

### Sample test cases

```tsx
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {SchematicForm} from "../SchematicForm";

test("shows required error for missing email", async () => {
  const user = userEvent.setup();
  const onStateChange = jest.fn();

  render(<SchematicForm schema={emailSchema} onStateChange={onStateChange} />);

  await user.click(screen.getByRole("button", { name: /submit/i }));

  expect(screen.getByText(/email/i)).toBeInTheDocument();
  expect(onStateChange).toHaveBeenLastCalledWith(
    expect.objectContaining({
      isValid: false,
      errors: expect.arrayContaining([
        expect.stringMatching(/email/i),
      ]),
    })
  );
});

test("adds and removes array items without losing sibling values", async () => {
  const user = userEvent.setup();
  render(<SchematicForm schema={arrayOfObjectsSchema} />);

  await user.click(screen.getByRole("button", { name: /add item/i }));
  await user.type(screen.getByLabelText(/item 1 name/i), "First");

  await user.click(screen.getByRole("button", { name: /add item/i }));
  await user.type(screen.getByLabelText(/item 2 name/i), "Second");

  await user.click(screen.getByRole("button", { name: /remove item 1/i }));

  expect(screen.queryByDisplayValue("First")).not.toBeInTheDocument();
  expect(screen.getByDisplayValue("Second")).toBeInTheDocument();
});
```

```ts
// playwright.spec.ts
import {test, expect} from "@playwright/test";

test("moves focus to first invalid field", async ({page}) => {
  await page.goto("/playground/required-form");
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByLabel("Email")).toBeFocused();
  await expect(page.getByText(/required/i)).toBeVisible();
});

test("oneOf branch switch updates visible fields", async ({page}) => {
  await page.goto("/playground/payment-form");
  await page.getByRole("radio", { name: "Card" }).check();
  await expect(page.getByLabel("Card number")).toBeVisible();
  await expect(page.getByLabel("IBAN")).toBeHidden();

  await page.getByRole("radio", { name: "Bank transfer" }).check();
  await expect(page.getByLabel("IBAN")).toBeVisible();
});
```

### VS Code, Copilot, and Codex workflow

VS Code already has built-in JavaScript/TypeScript debugging and browser debugging. Vite gives you a fast dev server with HMR, and the docs note HMR updates can reflect in the browser in under 50 ms for supported cases. That makes **Vite + VS Code** a strong default development loop for SchematicForm. citeturn32view15turn32view16turn19search22turn19search10

For AI-assisted development, GitHub documents that the **GitHub Copilot extension in VS Code** provides inline suggestions and Copilot Chat, and that required extensions are installed automatically during initial setup. OpenAI’s **Codex CLI** is a local coding agent that can read, change, and run code in the selected directory from your terminal. GitHub also documents an **OpenAI Codex VS Code extension powered by Copilot**, although that integration currently has plan-specific availability constraints. citeturn32view12turn32view13turn32view14

A pragmatic workflow is:

- use **Copilot Chat** for small edits, test skeletons, and story scaffolds;
- use **Codex CLI** for larger refactors, generating test matrices, and repository-wide changes from the terminal;
- use the **Playwright VS Code extension** for recording/debugging browser tests;
- keep AI-generated tests under human review, especially around `oneOf` branch semantics and accessibility assumptions. citeturn32view13turn14search23turn32view12

## Packaging, CI/CD, publishing, and developer environment

### Bundlers compared

| Bundler | What official docs say | Fit for SchematicForm | Recommendation |
|---|---|---|---|
| **Vite** | Library mode is a “simple and opinionated configuration” for browser-oriented and JS-framework libraries. citeturn32view1 | Excellent dev UX, easy demo/playground setup, natural fit for Storybook and React component libraries. | **Best default choice**. |
| **Rollup** | Rollup is a module bundler aimed at compiling small pieces into libraries/applications, centered on ES modules and multiple output formats. citeturn32view2turn11search4 | Excellent when you want maximal control over outputs and packaging details. | Use if you need finer-grained packaging than Vite library mode. |
| **tsup** | tsup is/was a very simple TS bundler, but its own GitHub repo warns that it is **not actively maintained anymore** and suggests using alternatives. CSS support is also marked experimental. citeturn13search0turn32view0 | Good historically for small libs, but not ideal for a new public component library in 2026. | **Do not choose as the primary greenfield bundler.** |

For SchematicForm, I recommend **Vite library mode** for build + local playground, and optionally **Rollup only if you later need more custom output control**. That gives you the best balance of DX and packaging clarity. citeturn32view1turn32view2

### Package structure and TypeScript output

TypeScript recommends publishing declaration files with the package when the types are generated from your source code. Node’s package docs recommend using the `exports` field for the main entry point, and note that `exports` encapsulates subpaths; they also recommend including `main` alongside `exports` for compatibility with older tooling. citeturn32view7turn25search0turn25search4

A good initial `package.json` shape is:

```json
{
  "name": "@your-scope/schematic-form",
  "version": "0.0.0-development",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./styles.css": "./dist/styles.css"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "sideEffects": [
    "./dist/styles.css"
  ],
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@heroui/react": "^3.0.0 || ^3.1.0"
  }
}
```

If you publish a **scoped public** npm package, remember that npm requires `--access public` on the **initial** publish. citeturn15search11turn32view6

### Storybook and examples

Storybook is an especially good fit here because it is explicitly designed to build, test, and document components in isolation. For SchematicForm, you should include stories for:

- primitive schema fields;
- nested objects;
- arrays of primitives and arrays of objects;
- required/min/max/pattern cases;
- `oneOf` / `anyOf` / `allOf`;
- async validation state;
- i18n and dark/light theming;
- accessibility examples and error summary states. citeturn32view3turn15search4turn15search12turn15search16

### semantic-release and GitHub Actions

semantic-release’s core promise is to automate version determination, release notes generation, and package publishing. GitHub Actions’ official Node package publishing guide shows the intended CI-to-publish flow: run CI, and only after tests pass, publish to npm and/or GitHub Packages. semantic-release’s CI guidance says the release step should run only after all tests succeed. citeturn32view4turn15search17turn32view5

A minimal GitHub Actions pipeline for SchematicForm should run:

1. install dependencies;
2. lint;
3. typecheck;
4. unit/integration tests;
5. Playwright E2E;
6. build;
7. Storybook build;
8. semantic-release on the default branch. citeturn32view5turn14search5turn32view4

```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - run: npm run build
      - run: npm run build:storybook

  release:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm run build
      - env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
```

### License recommendation

With no stated licensing constraints, the safest default for a small public React component library is **MIT** because it is short, permissive, and only requires preservation of copyright and license notices. If you want an explicit patent grant, choose **Apache-2.0** instead. citeturn17search0turn17search2turn17search4

### Recommended VS Code setup

A sensible development environment is:

- **VS Code**
- **Vite** for playground/live reload
- **GitHub Copilot**
- **Codex CLI**
- **Playwright VS Code extension**
- optional **ESLint**, **Prettier**, and **EditorConfig** for consistency

VS Code’s debugger and browser debugging are built in, and Vite provides fast HMR. That is a strong foundation for day-to-day library work. citeturn32view15turn32view16turn19search22turn32view12turn32view13turn14search23

## Implementation checklist, pitfalls, and limitations

### Step-by-step implementation checklist

| Task | Deliverable | Estimate |
|---|---|---:|
| Project bootstrap | React 19 + TypeScript + Vite library workspace, linting, formatting, test runner, demo app | 0.5 day |
| HeroUI integration baseline | Host app wired with `@heroui/react`, theme CSS variables, demo page | 0.5 day |
| Schema normalization | Draft handling, `$ref` resolution strategy, `dependencies` normalization, path model | 1.5 days |
| Renderer core | Recursive object/array/string/number/boolean/enum rendering | 2 days |
| Array engine | Add/remove/reorder/duplicate and stable row IDs | 1 day |
| Conditional engine | `dependentRequired`, `dependentSchemas`, `oneOf`, `anyOf`, basic `allOf` merge | 2 days |
| Ajv validation layer | Sync validator compilation, formats, error shaping, public `errors[]` output | 1 day |
| Async validation layer | Optional business-rule validator hook and pending state | 0.5 day |
| Accessibility pass | Labels, described-by links, error summary, focus routing, keyboard flow | 1 day |
| i18n + theming pass | Locale/messages API, error localization, theme-safe styling | 1 day |
| Test suite | Unit + RTL integration + Playwright E2E + mocks/adapters | 2 days |
| Storybook | Canonical stories and docs examples | 1 day |
| Release automation | semantic-release, GitHub Actions, npm publish dry run, changelog | 0.5 day |
| README + API docs | Usage, schema support matrix, limitations, migration notes | 0.5 day |

A realistic first high-quality public release is therefore about **12 to 14 working days** for one experienced engineer, assuming no major surprises in `$ref` resolution or branch UX. That estimate is not from a source; it is my synthesis based on the scope above.

### Prioritized action list

The fastest path to a strong first release is:

1. **Commit to React-first HeroUI usage** and treat custom elements as optional adapters only. This is the single decision that prevents unnecessary complexity. citeturn28view1turn6view1  
2. **Adopt Ajv as the one true validation engine** and use HeroUI only for presentation and accessibility state. citeturn8search6turn36view1  
3. **Ship only the core schema subset first**: object, array, string, number/integer, boolean, enum, required, min/max, pattern, format, and draft dependencies. Add `oneOf`/`anyOf`/`allOf` after the core renderer is stable. citeturn29view0turn29view1turn30search0turn29view3turn29view4turn31search0turn28view14turn28view15  
4. **Design for field-level rerender isolation from day one**. Retrofitting performance later is much harder. citeturn23search16turn23search14  
5. **Automate release early** with Storybook, Playwright, semantic-release, and GitHub Actions. citeturn32view3turn32view10turn32view4turn32view5  

### Common pitfalls and troubleshooting

The most common pitfall is the **HeroUI/custom-elements mismatch**. If you assume HeroUI v3 is a native custom-element library, you will over-engineer wrappers and event plumbing. The docs support a simpler truth: HeroUI is a React library, while React 19 and HeroUI’s composition APIs make custom-element integration possible when needed. citeturn28view1turn28view0turn6view1

The second pitfall is trying to make HeroUI’s built-in validation the primary validator. HeroUI `Form` can use HTML5/native validation or ARIA validation, and its field components accept validators, but JSON Schema is richer than HTML’s built-in constraint model. Use HeroUI’s validation props for **display and accessibility**, and let Ajv determine truth. citeturn36view0turn33view1turn33view2

The third pitfall is embedding UI-only keys directly into schema documents without a plan. Ajv strict mode exists to catch ignored schema mistakes. If you need UI metadata, prefer a `uiSchema` sidecar; if you must embed UI hints, strip or register those keys. citeturn8search1turn8search2

The fourth pitfall is underestimating branch semantics. `oneOf` is not “pick the first matching branch”; it requires **exactly one** valid branch. `allOf` is not object inheritance in the OO sense; it means the instance must satisfy **all** subschemas. And recursive combinators can become expensive. If branch behavior becomes ambiguous, require an explicit discriminator rather than guessing. citeturn28view14

The fifth pitfall is testing too much in JSDOM and too little in browsers. Focus routing, keyboard behavior, native form semantics, and popover-heavy controls are where Playwright earns its place. citeturn32view10turn14search5

### Open questions and limitations

The main unresolved question is whether the requirement **truly mandates native custom elements** or whether “HeroUI 3.0 web components” means “HeroUI components for the web.” The official HeroUI v3 docs support the latter interpretation, not the former. If native custom elements are a hard requirement, SchematicForm should still keep its **core runtime React-first** and export a separate adapter package. citeturn28view1turn28view0turn6view1

A second limitation is that **union-heavy schemas** (`oneOf` / `anyOf`) often lack enough information for ideal UX. JSON Schema validates data contracts; it does not always specify the best interaction design. In those cases, a sidecar `uiSchema` or vendor UI annotations are not a nice-to-have; they are the difference between a usable form and a confusing one. citeturn28view14turn8search1turn8search2

A third limitation is security. Ajv explicitly treats schemas as trusted application code in its default model. If SchematicForm is ever asked to render **untrusted third-party schemas**, that is a materially different security posture and should be documented, restricted, or sandboxed rather than quietly accepted. citeturn24search9turn23search18