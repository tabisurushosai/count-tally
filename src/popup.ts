type Counter = {
  id: string;
  name: string;
  emoji: string;
  initialValue: number;
  value: number;
  step: number;
};

type AppState = {
  counters: Counter[];
};

const STORAGE_KEY = "countTallyState";
const DEFAULT_EMOJI = "🔢";
const DEFAULT_STEP = 1;
const DEFAULT_STATE: AppState = {
  counters: [],
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Popup root element was not found.");
}

const t = (key: string, substitutions?: string | string[]): string => {
  const message = chrome.i18n.getMessage(key, substitutions);
  return message || key;
};

document.title = t("appTitle");

const style = document.createElement("style");
style.textContent = `
  :root {
    color: #1f2328;
    background: #ffffff;
  }

  body {
    box-sizing: border-box;
    margin: 0;
    width: 320px;
    min-height: 240px;
    padding: 12px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  * {
    box-sizing: inherit;
  }

  h3,
  p {
    margin: 0;
  }

  button,
  input {
    font: inherit;
  }

  button {
    min-height: 32px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #ffffff;
    color: #1f2328;
    cursor: pointer;
  }

  button.primary {
    border-color: #0969da;
    background: #0969da;
    color: #ffffff;
    font-weight: 700;
  }

  button.danger {
    color: #cf222e;
  }

  input {
    width: 100%;
    min-width: 0;
    min-height: 32px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    padding: 4px 8px;
    color: #1f2328;
    background: #ffffff;
  }

  label {
    display: grid;
    gap: 4px;
    min-width: 0;
    color: #57606a;
    font-size: 12px;
    font-weight: 600;
  }

  .popup-shell {
    display: grid;
    gap: 12px;
  }

  .popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .counter-form {
    display: grid;
    gap: 8px;
    padding: 10px;
    border: 1px solid #d0d7de;
    border-radius: 8px;
    background: #f6f8fa;
  }

  .field-row {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) 68px 68px;
    gap: 8px;
  }

  .form-actions {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
  }

  .counter-list {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .counter-row {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border: 1px solid #d0d7de;
    border-radius: 8px;
    background: #ffffff;
  }

  .counter-emoji {
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border-radius: 8px;
    background: #f6f8fa;
    font-size: 18px;
  }

  .counter-summary {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .counter-name {
    overflow: hidden;
    font-size: 14px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .counter-initial {
    overflow: hidden;
    color: #57606a;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .counter-value {
    min-width: 44px;
    font-variant-numeric: tabular-nums;
    font-size: 20px;
    font-weight: 700;
    text-align: right;
  }

  .row-actions {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 8px;
  }

  .row-actions button:disabled {
    color: #8c959f;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .empty-state {
    padding: 16px 8px;
    border: 1px dashed #d0d7de;
    border-radius: 8px;
    color: #57606a;
    text-align: center;
  }
`;
document.head.append(style);

let state: AppState = DEFAULT_STATE;
let editingCounterId: string | null = null;

const isStoredCounter = (value: unknown): value is Omit<Counter, "step"> & {
  step?: unknown;
} => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.emoji === "string" &&
    typeof candidate.initialValue === "number" &&
    Number.isFinite(candidate.initialValue) &&
    typeof candidate.value === "number" &&
    Number.isFinite(candidate.value)
  );
};

const normalizeCounter = (
  counter: Omit<Counter, "step"> & { step?: unknown },
): Counter => {
  const step =
    typeof counter.step === "number" &&
    Number.isFinite(counter.step) &&
    counter.step > 0
      ? counter.step
      : DEFAULT_STEP;

  return { ...counter, step };
};

const loadState = async (): Promise<AppState> => {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const storedState = stored[STORAGE_KEY] as Partial<AppState> | undefined;

  if (!storedState || !Array.isArray(storedState.counters)) {
    return { ...DEFAULT_STATE };
  }

  return {
    counters: storedState.counters.filter(isStoredCounter).map(normalizeCounter),
  };
};

const saveState = async (nextState: AppState): Promise<void> => {
  state = nextState;
  await chrome.storage.local.set({ [STORAGE_KEY]: nextState });
};

const createCounterId = (): string => {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `counter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getEditingCounter = (): Counter | undefined =>
  state.counters.find((counter) => counter.id === editingCounterId);

const render = (): void => {
  app.innerHTML = "";

  const shell = document.createElement("main");
  shell.className = "popup-shell";

  const header = document.createElement("header");
  header.className = "popup-header";

  const title = document.createElement("h3");
  title.textContent = t("appTitle");

  header.append(title);
  shell.append(header, buildForm(), buildCounterList());
  app.append(shell);
};

const buildForm = (): HTMLFormElement => {
  const editingCounter = getEditingCounter();
  const form = document.createElement("form");
  form.className = "counter-form";

  const fieldRow = document.createElement("div");
  fieldRow.className = "field-row";

  const emojiLabel = document.createElement("label");
  emojiLabel.textContent = t("emojiLabel");
  const emojiInput = document.createElement("input");
  emojiInput.name = "emoji";
  emojiInput.maxLength = 4;
  emojiInput.value = editingCounter?.emoji ?? DEFAULT_EMOJI;
  emojiLabel.append(emojiInput);

  const nameLabel = document.createElement("label");
  nameLabel.textContent = t("nameLabel");
  const nameInput = document.createElement("input");
  nameInput.name = "name";
  nameInput.required = true;
  nameInput.maxLength = 40;
  nameInput.placeholder = t("counterNamePlaceholder");
  nameInput.value = editingCounter?.name ?? "";
  nameLabel.append(nameInput);

  const initialLabel = document.createElement("label");
  initialLabel.textContent = t("initialValueLabel");
  const initialInput = document.createElement("input");
  initialInput.name = "initialValue";
  initialInput.type = "number";
  initialInput.step = "1";
  initialInput.value = (editingCounter?.initialValue ?? 0).toString();
  initialLabel.append(initialInput);

  const stepLabel = document.createElement("label");
  stepLabel.textContent = t("stepLabel");
  const stepInput = document.createElement("input");
  stepInput.name = "step";
  stepInput.type = "number";
  stepInput.min = "1";
  stepInput.step = "1";
  stepInput.value = (editingCounter?.step ?? DEFAULT_STEP).toString();
  stepLabel.append(stepInput);

  fieldRow.append(emojiLabel, nameLabel, initialLabel, stepLabel);

  const actions = document.createElement("div");
  actions.className = "form-actions";

  const submit = document.createElement("button");
  submit.className = "primary";
  submit.type = "submit";
  submit.textContent = editingCounter ? t("updateCounter") : t("addCounter");
  actions.append(submit);

  if (editingCounter) {
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = t("cancelEdit");
    cancel.addEventListener("click", () => {
      editingCounterId = null;
      render();
    });
    actions.append(cancel);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleFormSubmit(new FormData(form));
  });

  form.append(fieldRow, actions);
  return form;
};

const buildCounterList = (): HTMLElement => {
  if (state.counters.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = t("emptyState");
    return empty;
  }

  const list = document.createElement("ul");
  list.className = "counter-list";
  list.setAttribute("aria-label", t("counterListLabel"));

  state.counters.forEach((counter, index) => {
    const item = document.createElement("li");
    item.className = "counter-row";
    item.dataset.counterId = counter.id;

    const emoji = document.createElement("span");
    emoji.className = "counter-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = counter.emoji;

    const summary = document.createElement("div");
    summary.className = "counter-summary";

    const name = document.createElement("span");
    name.className = "counter-name";
    name.textContent = counter.name;

    const initial = document.createElement("span");
    initial.className = "counter-initial";
    initial.textContent = t("counterMeta", [
      counter.initialValue.toString(),
      counter.step.toString(),
    ]);

    summary.append(name, initial);

    const value = document.createElement("span");
    value.className = "counter-value";
    value.textContent = counter.value.toString();

    const actions = document.createElement("div");
    actions.className = "row-actions";

    const moveUp = document.createElement("button");
    moveUp.type = "button";
    moveUp.disabled = index === 0;
    moveUp.setAttribute("aria-label", t("moveUpLabel", counter.name));
    moveUp.textContent = "↑";
    moveUp.addEventListener("click", () => {
      void moveCounter(counter.id, -1);
    });

    const moveDown = document.createElement("button");
    moveDown.type = "button";
    moveDown.disabled = index === state.counters.length - 1;
    moveDown.setAttribute("aria-label", t("moveDownLabel", counter.name));
    moveDown.textContent = "↓";
    moveDown.addEventListener("click", () => {
      void moveCounter(counter.id, 1);
    });

    const increment = document.createElement("button");
    increment.type = "button";
    increment.setAttribute(
      "aria-label",
      t("incrementLabel", [counter.name, counter.step.toString()]),
    );
    increment.textContent = "+";
    increment.addEventListener("click", () => {
      void updateCounterValue(counter.id, counter.value + counter.step);
    });

    const decrement = document.createElement("button");
    decrement.type = "button";
    decrement.setAttribute(
      "aria-label",
      t("decrementLabel", [counter.name, counter.step.toString()]),
    );
    decrement.textContent = "-";
    decrement.addEventListener("click", () => {
      void updateCounterValue(counter.id, counter.value - counter.step);
    });

    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = t("resetCounter");
    reset.addEventListener("click", () => {
      void resetCounter(counter.id);
    });

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = t("editCounter");
    edit.addEventListener("click", () => {
      editingCounterId = counter.id;
      render();
    });

    const remove = document.createElement("button");
    remove.className = "danger";
    remove.type = "button";
    remove.textContent = t("deleteCounter");
    remove.addEventListener("click", () => {
      void deleteCounter(counter.id);
    });

    actions.append(moveUp, moveDown, increment, decrement, reset, edit, remove);
    item.append(emoji, summary, value, actions);
    list.append(item);
  });

  return list;
};

const handleFormSubmit = async (formData: FormData): Promise<void> => {
  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim() || DEFAULT_EMOJI;
  const initialValue = Number(formData.get("initialValue") ?? 0);
  const step = Number(formData.get("step") ?? DEFAULT_STEP);

  if (!name || !Number.isFinite(initialValue) || !Number.isFinite(step) || step <= 0) {
    return;
  }

  const editingCounter = getEditingCounter();

  if (editingCounter) {
    const counters = state.counters.map((counter) =>
      counter.id === editingCounter.id
        ? { ...counter, name, emoji, initialValue, step }
        : counter,
    );
    editingCounterId = null;
    await saveState({ counters });
    render();
    return;
  }

  const nextCounter: Counter = {
    id: createCounterId(),
    name,
    emoji,
    initialValue,
    value: initialValue,
    step,
  };

  await saveState({ counters: [...state.counters, nextCounter] });
  render();
};

const updateCounterValue = async (
  counterId: string,
  value: number,
): Promise<void> => {
  const counters = state.counters.map((counter) =>
    counter.id === counterId ? { ...counter, value } : counter,
  );

  await saveState({ counters });
  render();
};

const resetCounter = async (counterId: string): Promise<void> => {
  const counters = state.counters.map((counter) =>
    counter.id === counterId
      ? { ...counter, value: counter.initialValue }
      : counter,
  );

  await saveState({ counters });
  render();
};

const moveCounter = async (
  counterId: string,
  direction: -1 | 1,
): Promise<void> => {
  const currentIndex = state.counters.findIndex(
    (counter) => counter.id === counterId,
  );
  const nextIndex = currentIndex + direction;

  if (
    currentIndex === -1 ||
    nextIndex < 0 ||
    nextIndex >= state.counters.length
  ) {
    return;
  }

  const counters = [...state.counters];
  const [counter] = counters.splice(currentIndex, 1);
  counters.splice(nextIndex, 0, counter);

  await saveState({ counters });
  render();
};

const deleteCounter = async (counterId: string): Promise<void> => {
  const counters = state.counters.filter((counter) => counter.id !== counterId);

  if (editingCounterId === counterId) {
    editingCounterId = null;
  }

  await saveState({ counters });
  render();
};

const init = async (): Promise<void> => {
  state = await loadState();
  render();
};

void init();
