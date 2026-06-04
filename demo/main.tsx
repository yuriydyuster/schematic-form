import React from "react";
import {createRoot} from "react-dom/client";

import {SchematicForm} from "../src";
import {kitchenSinkSchema} from "../src/sampleSchemas";
import "./styles.css";

function App() {
  const [state, setState] = React.useState<unknown>({});

  return (
    <main className="demo-shell">
      <section className="demo-form">
        <SchematicForm
          schema={kitchenSinkSchema}
          persistence={{key: "schematic-form:kitchen-sink-demo"}}
          validationMode="hybrid"
          onStateChange={(nextState) => setState(nextState)}
          onSubmit={(nextState) => {
            setState(nextState);
          }}
        />
      </section>
      <aside className="demo-state" aria-label="Current form state">
        <h2>State</h2>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </aside>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(<App />);
