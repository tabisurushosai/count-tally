type CounterPreview = {
  id: string;
  name: string;
  emoji: string;
  value: number;
};

const counters: CounterPreview[] = [
  { id: "sample-1", name: "サンプル", emoji: "🔢", value: 0 },
];

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Popup root element was not found.");
}

app.innerHTML = "";

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

  h3 {
    margin: 0;
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
    background: #f6f8fa;
  }

  .counter-emoji {
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border-radius: 8px;
    background: #ffffff;
    font-size: 18px;
  }

  .counter-name {
    overflow: hidden;
    font-size: 14px;
    font-weight: 600;
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

  .empty-state {
    margin: 0;
    padding: 16px 8px;
    border: 1px dashed #d0d7de;
    border-radius: 8px;
    color: #57606a;
    text-align: center;
  }
`;
document.head.append(style);

const shell = document.createElement("main");
shell.className = "popup-shell";

const header = document.createElement("header");
header.className = "popup-header";

const title = document.createElement("h3");
title.textContent = "かぞえカウンター";

header.append(title);
shell.append(header);

if (counters.length === 0) {
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = "カウンターがありません";
  shell.append(empty);
} else {
  const list = document.createElement("ul");
  list.className = "counter-list";
  list.setAttribute("aria-label", "カウンター一覧");

  for (const counter of counters) {
    const item = document.createElement("li");
    item.className = "counter-row";
    item.dataset.counterId = counter.id;

    const emoji = document.createElement("span");
    emoji.className = "counter-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = counter.emoji;

    const name = document.createElement("span");
    name.className = "counter-name";
    name.textContent = counter.name;

    const value = document.createElement("span");
    value.className = "counter-value";
    value.textContent = counter.value.toString();

    item.append(emoji, name, value);
    list.append(item);
  }

  shell.append(list);
}

app.append(shell);
