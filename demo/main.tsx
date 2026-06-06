import React from "react";
import {createRoot} from "react-dom/client";
import {Button, Drawer, Surface, Tabs, useOverlayState} from "@heroui/react";
import {Copy} from "@gravity-ui/icons";

import {SchematicForm, type JsonSchema, type SchematicFormState} from "../src";
import {protoSchemaToJsonSchema, type ProtoSchemaObject} from "../src/protoSchema";
import {kitchenSinkSchema, kitchenSinkSchemaInitialValue} from "../src/sampleSchemas";
import "./styles.css";

function App() {
  const [state, setState] = React.useState<SchematicFormState>({data: {}, isValid: false, errors: []});
  const [convertedSchema, setConvertedSchema] = React.useState<JsonSchema | null>(null);
  const [conversionError, setConversionError] = React.useState<string | null>(null);
  const [isPreviewOpen, setPreviewOpen] = React.useState(false);
  const previewDrawerState = useOverlayState({
    isOpen: isPreviewOpen,
    onOpenChange: setPreviewOpen,
  });

  const previewKey = React.useMemo(
    () => (convertedSchema ? JSON.stringify(convertedSchema) : "empty-preview"),
    [convertedSchema],
  );
  const previewJson = React.useMemo(
    () => (convertedSchema ? JSON.stringify(convertedSchema, null, 2) : ""),
    [convertedSchema],
  );
  const copyPreviewJson = React.useCallback(() => {
    if (!previewJson) return;
    void navigator.clipboard?.writeText(previewJson).catch(() => undefined);
  }, [previewJson]);

  return (
    <main className="demo-shell">
      <section className="demo-form">
        <SchematicForm
          schema={kitchenSinkSchema}
          defaultValue={kitchenSinkSchemaInitialValue}
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
      {convertedSchema ? (
        <Drawer.Backdrop isOpen={previewDrawerState.isOpen} onOpenChange={previewDrawerState.setOpen}>
          <Drawer.Content placement="right">
            <Drawer.Dialog aria-label="Generated Form Preview" className="demo-drawer">
              <Drawer.CloseTrigger />
              <Drawer.Body className="demo-drawer__body">
                <Tabs defaultSelectedKey="form" className="demo-drawer__tabs">
                  <Tabs.ListContainer>
                    <Tabs.List aria-label="Generated preview sections">
                      <Tabs.Tab id="form">
                        Form
                        <Tabs.Indicator />
                      </Tabs.Tab>
                      <Tabs.Tab id="json">
                        JSON
                        <Tabs.Indicator />
                      </Tabs.Tab>
                    </Tabs.List>
                  </Tabs.ListContainer>
                  <Tabs.Panel id="form" className="demo-drawer__tabpanel">
                    <SchematicForm key={previewKey} schema={convertedSchema} validationMode="hybrid" />
                  </Tabs.Panel>
                  <Tabs.Panel id="json" className="demo-drawer__tabpanel">
                    <Surface className="demo-json-surface">
                      <Button
                        aria-label="Copy generated JSON schema"
                        className="demo-json-copy"
                        isIconOnly
                        type="button"
                        variant="secondary"
                        onPress={copyPreviewJson}
                      >
                        <Copy aria-hidden="true" focusable="false" />
                      </Button>
                      <pre>{previewJson}</pre>
                    </Surface>
                  </Tabs.Panel>
                </Tabs>
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      ) : null}
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(<App />);
