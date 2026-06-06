import React from "react";
import {createRoot} from "react-dom/client";

import {SchematicForm, type JsonSchema, type SchematicFormState} from "../src";
import {protoSchemaToJsonSchema, type ProtoSchemaObject} from "../src/protoSchema";
import {kitchenSinkSchema} from "../src/sampleSchemas";
import "./styles.css";

function App() {
  const [state, setState] = React.useState<SchematicFormState>({data: {}, isValid: false, errors: []});
  const [convertedSchema, setConvertedSchema] = React.useState<JsonSchema | null>(null);
  const [conversionError, setConversionError] = React.useState<string | null>(null);
  const [isPreviewOpen, setPreviewOpen] = React.useState(false);

  const previewKey = React.useMemo(
    () => (convertedSchema ? JSON.stringify(convertedSchema) : "empty-preview"),
    [convertedSchema],
  );

  return (
    <main className="demo-shell">
      <section className="demo-form">
        <SchematicForm
          schema={kitchenSinkSchema}
          persistence={{key: "schematic-form:proto-schema-demo"}}
          validationMode="hybrid"
          onStateChange={(nextState) => setState(nextState)}
          onSubmit={(nextState) => {
            setState(nextState);
            if (!nextState.isValid) return;

            try {
              const nextSchema = protoSchemaToJsonSchema(nextState.data as ProtoSchemaObject);
              setConvertedSchema(nextSchema);
              setConversionError(null);
              setPreviewOpen(true);
            } catch (error) {
              setPreviewOpen(false);
              setConvertedSchema(null);
              setConversionError(error instanceof Error ? error.message : "The proto-schema could not be converted.");
            }
          }}
        />
        {conversionError ? (
          <p className="demo-conversion-error" role="alert">
            {conversionError}
          </p>
        ) : null}
      </section>
      <aside className="demo-state" aria-label="Current form state">
        <h2>State</h2>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </aside>
      {isPreviewOpen && convertedSchema ? (
        <div className="demo-drawer-backdrop">
          <aside
            className="demo-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-preview-title"
          >
            <header className="demo-drawer__header">
              <h2 id="demo-preview-title">Generated Form Preview</h2>
              <button className="demo-drawer__close" type="button" onClick={() => setPreviewOpen(false)}>
                Close
              </button>
            </header>
            <div className="demo-drawer__body">
              <SchematicForm key={previewKey} schema={convertedSchema} validationMode="hybrid" />
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(<App />);
