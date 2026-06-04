# SchematicForm

SchematicForm is a React-first JSON Schema form renderer built with HeroUI v3.

## Install

```bash
npm install @schematic-form/react @heroui/react @heroui/styles react react-dom
```

HeroUI v3 expects React 19+ and Tailwind CSS v4. Import styles in this order:

```css
@import "tailwindcss";
@import "@heroui/styles";
@import "@schematic-form/react/styles.css";
```

## Usage

```tsx
import {SchematicForm} from "@schematic-form/react";
import "@schematic-form/react/styles.css";

const schema = {
  type: "object",
  title: "Profile",
  required: ["name"],
  properties: {
    intro: {
      type: "null",
      title: "Public profile",
      description: "This display-only field is not included in form data.",
    },
    name: {type: "string", title: "Name"},
  },
};

export function Demo() {
  return (
    <SchematicForm
      schema={schema}
      persistence={{key: "profile-draft"}}
      onStateChange={({data, isValid, errors}) => {
        console.log({data, isValid, errors});
      }}
    />
  );
}
```

The `persistence` prop is optional. When provided on an uncontrolled form, drafts are saved to `localStorage` by default and restored after refresh when the schema fingerprint still matches. Use `storage: "sessionStorage"` or a custom `{getItem, setItem, removeItem}` adapter to change where drafts are stored.

## V1 Scope

- No `uiSchema`; rendering behavior is derived from JSON Schema and SchematicForm conventions.
- `type: "null"` properties render display-only title/description blocks and are excluded from data.
- `propertyOrdering` can order object fields.
- `anyOf` is intentionally rendered and validated as `oneOf` in V1.
- Inactive `oneOf`/`anyOf` branch values are cached internally so switching back restores prior inputs without adding inactive values to submitted data.
- Dependency logic such as `dependencies`, `dependentRequired`, `dependentSchemas`, and `if`/`then`/`else` is ignored in V1.
