// src/data.ts
var BACKENDS = [
  {
    id: "egui",
    name: "egui",
    version: "0.31",
    crate: "eframe",
    description: "Immediate-mode UI for native apps and the web.",
    language: "Rust",
    color: "#e8a849",
    tags: ["Desktop", "Web", "Immediate"]
  },
  {
    id: "iced",
    name: "iced",
    version: "0.13",
    crate: "iced",
    description: "Elm-inspired, reactive cross-platform applications.",
    language: "Rust",
    color: "#6b8afd",
    tags: ["Desktop", "Reactive", "Typed"]
  },
  {
    id: "slint",
    name: "Slint",
    version: "1.9",
    crate: "slint",
    description: "Declarative native interfaces with a dedicated UI language.",
    language: ".slint",
    color: "#4fbfa4",
    tags: ["Desktop", "Embedded", "Declarative"]
  },
  {
    id: "gtk4",
    name: "GTK4",
    version: "0.9",
    crate: "gtk4",
    description: "Native Linux and cross-platform apps with gtk4-rs.",
    language: "Rust",
    color: "#83b95d",
    tags: ["Linux", "Desktop", "Native"]
  },
  {
    id: "dioxus",
    name: "Dioxus",
    version: "0.6",
    crate: "dioxus",
    description: "React-like Rust apps for desktop, web, and mobile.",
    language: "Rust",
    color: "#ee7e68",
    tags: ["Cross-platform", "RSX", "Reactive"]
  },
  {
    id: "fltk",
    name: "FLTK",
    version: "1.5",
    crate: "fltk",
    description: "Fast, lightweight native desktop interfaces.",
    language: "Rust",
    color: "#ae85dd",
    tags: ["Desktop", "Native", "Lightweight"]
  }
];
var baseWidget = {
  name: "Widget",
  placeholder: "",
  inputType: "text",
  color: "#27272a",
  background: "transparent",
  fontSize: 14,
  fontWeight: 400,
  borderRadius: 0,
  opacity: 100,
  visible: true,
  locked: false,
  actions: []
};
function createWidget(type, x = 80, y = 80) {
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const defaults = {
    container: { name: "Container", width: 280, height: 180, background: "#f4f4f5", borderRadius: 10 },
    text: { name: "Text", width: 200, height: 28, text: "Text label" },
    input: { name: "Text input", width: 240, height: 40, text: "", placeholder: "Enter text\u2026", background: "#ffffff", borderRadius: 6 },
    button: { name: "Button", width: 140, height: 40, text: "Button", color: "#ffffff", background: "#5b55d9", fontWeight: 600, borderRadius: 6 },
    checkbox: { name: "Checkbox", width: 150, height: 24, text: "Checkbox", fontSize: 13 },
    slider: { name: "Slider", width: 220, height: 24, text: "50" },
    image: { name: "Image", width: 160, height: 120, background: "#ececf1", borderRadius: 8 },
    divider: { name: "Divider", width: 240, height: 2, background: "#e4e4e7" }
  };
  return { ...baseWidget, id, type, x, y, text: "", width: 160, height: 40, ...defaults[type] };
}
function getActivePage(project) {
  return project.pages.find((page) => page.id === project.activePageId) ?? project.pages[0];
}
var INITIAL_PROJECT = {
  name: "Untitled project",
  backend: "slint",
  activePageId: "page-sign-in",
  pages: [{
    id: "page-sign-in",
    name: "Sign in",
    width: 560,
    height: 440,
    background: "#ffffff",
    widgets: [
      { ...createWidget("text", 42, 34), id: "title", text: "Welcome back", name: "Title", width: 360, height: 36, fontSize: 27, fontWeight: 650 },
      { ...createWidget("text", 42, 76), id: "subtitle", text: "Sign in to continue to your workspace.", name: "Subtitle", width: 390, height: 22, fontSize: 13, color: "#777780" },
      { ...createWidget("text", 42, 124), id: "email-label", text: "Email address", name: "Email label", width: 180, height: 20, fontSize: 12, fontWeight: 550 },
      { ...createWidget("input", 42, 148), id: "email", name: "Email input", width: 476, height: 40, placeholder: "you@company.com" },
      { ...createWidget("text", 42, 207), id: "password-label", text: "Password", name: "Password label", width: 180, height: 20, fontSize: 12, fontWeight: 550 },
      { ...createWidget("input", 42, 231), id: "password", name: "Password input", width: 476, height: 40, placeholder: "Enter your password", inputType: "password" },
      { ...createWidget("checkbox", 42, 291), id: "remember", name: "Remember me", text: "Remember me", width: 160, height: 24 },
      {
        ...createWidget("button", 364, 282),
        id: "sign-in",
        name: "Sign in button",
        text: "Sign in",
        width: 154,
        height: 42,
        actions: [{ id: "action-1", event: "onClick", kind: "custom", value: "// Validate your form and authenticate here", handlerName: "handle_sign_in" }]
      },
      { ...createWidget("divider", 42, 351), id: "footer-divider", name: "Footer divider", width: 476, height: 1 },
      { ...createWidget("text", 143, 374), id: "footer", name: "Footer text", text: "New to Rustform?   Create an account", width: 300, height: 24, fontSize: 12, color: "#777780" }
    ]
  }]
};

// src/codegen.ts
var snake = (value) => {
  const base = value.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[^a-zA-Z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").toLowerCase();
  if (!base) return "widget";
  return /^[0-9]/.test(base) ? `_${base}` : base;
};
var pascal = (value) => {
  const name = snake(value).split("_").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
  return /^[0-9]/.test(name) ? `W${name}` : name;
};
var q = (value) => JSON.stringify(value);
var cssColor = (value) => value === "transparent" ? "Color32::TRANSPARENT" : `Color32::from_rgb(${hexRgb(value).join(", ")})`;
var hexRgb = (hex) => {
  let digits = hex.trim().replace("#", "");
  if (/^[0-9a-f]{3}$/i.test(digits)) digits = digits.split("").map((digit) => digit + digit).join("");
  if (!/^[0-9a-f]{6}$/i.test(digits)) return [39, 39, 42];
  return [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16));
};
var int = (value) => Math.round(value);
var slintColor = (value) => /^#[0-9a-f]{6}$/i.test(value) ? value : "transparent";
var actionFor = (widget, event) => widget.actions.filter((action) => action.event === event);
var handler = (widget) => widget.actions[0]?.handlerName || `handle_${snake(widget.id)}`;
function generateCode(project) {
  const page = getActivePage(project);
  const screen = {
    backend: project.backend,
    screenName: page.name,
    width: page.width,
    height: page.height,
    background: page.background,
    widgets: page.widgets
  };
  switch (screen.backend) {
    case "egui":
      return generateEgui(screen);
    case "iced":
      return generateIced(screen);
    case "slint":
      return generateSlint(screen);
    case "gtk4":
      return generateGtk(screen);
    case "dioxus":
      return generateDioxus(screen);
    case "fltk":
      return generateFltk(screen);
  }
}
function rustAction(action, self, eventValue = false) {
  const state = self ? `${self}.` : "";
  const value = q(action.value);
  switch (action.kind) {
    case "message":
      return `${state}status = ${value}.to_string();
    println!("{}", ${state}status);`;
    case "navigate":
      return `// Replace with your router or window navigation.
    println!("Navigate to {}", ${value});`;
    case "setText":
      return `${state}${snake(action.targetId || "status")} = ${value}.to_string();`;
    case "toggle":
      return `${state}show_${snake(action.targetId || "")} = !${state}show_${snake(action.targetId || "")};`;
    case "custom":
      return eventValue ? action.value || `// ${action.handlerName}` : action.value || `// ${action.handlerName}`;
  }
}
function widgetState(project) {
  return project.widgets.filter((w) => w.type === "input" || w.type === "checkbox" || w.type === "slider");
}
function defaultFields(project, includeVisibility = true) {
  const fields = widgetState(project).map((w) => `        ${snake(w.id)}: ${w.type === "input" ? "String::new()" : w.type === "checkbox" ? "false" : "50.0"},`);
  const visibility = includeVisibility ? project.widgets.map((w) => `        show_${snake(w.id)}: ${w.visible},`) : [];
  return [...fields, "        status: String::new(),", ...visibility].join("\n");
}
function stateFields(project, includeVisibility = true) {
  const fields = widgetState(project).map((w) => `    ${snake(w.id)}: ${w.type === "input" ? "String" : w.type === "checkbox" ? "bool" : "f32"},`);
  const visibility = includeVisibility ? project.widgets.map((w) => `    show_${snake(w.id)}: bool,`) : [];
  return [...fields, "    status: String,", ...visibility].join("\n");
}
function eguiWidget(widget) {
  const id = snake(widget.id);
  const actions = (event) => actionFor(widget, event).map((a) => rustAction(a, "self", event === "onChange").replaceAll("\n", "\n        ")).join("\n        ");
  const rect = `Rect::from_min_size(pos2(${widget.x.toFixed(1)}, ${widget.y.toFixed(1)}), vec2(${widget.width.toFixed(1)}, ${widget.height.toFixed(1)}))`;
  let content = "";
  switch (widget.type) {
    case "text":
      content = `ui.painter().text(${rect}.min, Align2::LEFT_TOP, ${q(widget.text)}, FontId::proportional(${widget.fontSize.toFixed(1)}), ${cssColor(widget.color)});`;
      break;
    case "input":
      content = `let response = ui.put(${rect}, TextEdit::singleline(&mut self.${id}).hint_text(${q(widget.placeholder)}).font(FontId::proportional(${widget.fontSize.toFixed(1)}))${widget.inputType === "password" ? ".password(true)" : ""});
      if response.changed() {
        ${actions("onChange")}
      }`;
      break;
    case "button":
      content = `let response = ui.put(${rect}, Button::new(RichText::new(${q(widget.text)}).color(${cssColor(widget.color)})).fill(${cssColor(widget.background)}));
      if response.clicked() {
        ${actions("onClick")}
      }`;
      break;
    case "checkbox":
      content = `let response = ui.put(${rect}, Checkbox::new(&mut self.${id}, ${q(widget.text)}));
      if response.changed() {
        ${actions("onChange")}
      }`;
      break;
    case "slider":
      content = `let response = ui.put(${rect}, Slider::new(&mut self.${id}, 0.0..=100.0).show_value(false));
      if response.changed() {
        ${actions("onChange")}
      }`;
      break;
    case "container":
      content = `ui.painter().rect_filled(${rect}, ${widget.borderRadius.toFixed(1)}, ${cssColor(widget.background)});`;
      break;
    case "image":
      content = `ui.painter().rect_filled(${rect}, ${widget.borderRadius.toFixed(1)}, Color32::from_rgb(236, 236, 241));
      ui.painter().text(${rect}.center(), Align2::CENTER_CENTER, "Image", FontId::proportional(13.0), Color32::GRAY);`;
      break;
    case "divider":
      content = `ui.painter().line_segment([${rect}.min, ${rect}.right_bottom()], Stroke::new(${Math.max(widget.height, 1).toFixed(1)}, ${cssColor(widget.background)}));`;
      break;
  }
  return `    if self.show_${id} {
      ${content}
    }`;
}
function generateEgui(project) {
  const name = pascal(project.screenName);
  return `// Generated by Rustform Studio \u2014 egui / eframe
// Cargo.toml: eframe = "${BACKENDS.find((b) => b.id === "egui")?.version}"
use eframe::egui::{self, pos2, vec2, Align2, Button, Checkbox, Color32, FontId, Rect, RichText, Slider, Stroke, TextEdit};

struct ${name} {
${stateFields(project)}
}

impl Default for ${name} {
  fn default() -> Self {
    Self {
${defaultFields(project)}
    }
  }
}

impl eframe::App for ${name} {
  fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
    egui::CentralPanel::default().show(ctx, |ui| {
      let rect = ui.max_rect();
      ui.painter().rect_filled(rect, 0.0, ${cssColor(project.background)});
${project.widgets.map(eguiWidget).join("\n")}
      if !self.status.is_empty() {
        ui.painter().text(pos2(24.0, rect.bottom() - 20.0), Align2::LEFT_CENTER, &self.status, FontId::proportional(12.0), Color32::GRAY);
      }
    });
  }
}

fn main() -> eframe::Result<()> {
  let options = eframe::NativeOptions {
    viewport: egui::ViewportBuilder::default().with_inner_size([${project.width.toFixed(1)}, ${project.height.toFixed(1)}]),
    ..Default::default()
  };
  eframe::run_native(${q(project.screenName)}, options, Box::new(|_| Ok(Box::new(${name}::default()))))
}
`;
}
function generateIced(project) {
  const interactive = project.widgets.filter((w) => ["input", "checkbox", "button", "slider"].includes(w.type));
  const variants = interactive.map((w) => {
    const value = w.type === "input" ? "(String)" : w.type === "checkbox" || w.type === "slider" ? `(${w.type === "checkbox" ? "bool" : "f32"})` : "";
    return `    ${pascal(w.id)}${w.type === "button" ? "Pressed" : "Changed"}${value},`;
  }).join("\n");
  const arms = interactive.map((w) => {
    const variant = `${pascal(w.id)}${w.type === "button" ? "Pressed" : "Changed"}`;
    const value = w.type === "button" ? "" : "(value)";
    const assignment = w.type === "input" || w.type === "checkbox" || w.type === "slider" ? `state.${snake(w.id)} = value;
        ` : "";
    const actions = actionFor(w, w.type === "button" ? "onClick" : "onChange").map((a) => rustAction(a, "state", true).replaceAll("\n    ", "\n        ")).join("\n        ");
    return `        Message::${variant}${value} => {
            ${assignment}${actions}
        }`;
  }).join("\n");
  const elements = project.widgets.map((w) => {
    switch (w.type) {
      case "text":
        return `    text(${q(w.text)}).size(${w.fontSize}).color(${cssIced(w.color)}),`;
      case "input":
        return `    text_input(${q(w.placeholder)}, &state.${snake(w.id)})${w.inputType === "password" ? ".secure(true)" : ""}.on_input(Message::${pascal(w.id)}Changed).width(${w.width}),`;
      case "button":
        return `    button(text(${q(w.text)}).center()).on_press(Message::${pascal(w.id)}Pressed).width(${w.width}),`;
      case "checkbox":
        return `    checkbox(${q(w.text)}, state.${snake(w.id)}).on_toggle(Message::${pascal(w.id)}Changed),`;
      case "slider":
        return `    slider(0.0..=100.0, state.${snake(w.id)}, Message::${pascal(w.id)}Changed).width(${w.width}),`;
      case "divider":
        return `    rule::horizontal(${Math.max(1, w.height)}),`;
      case "image":
        return `    container(text("Image").center()).width(${w.width}).height(${w.height}).style(container::rounded_box),`;
      case "container":
        return `    container(text("" )).width(${w.width}).height(${w.height}).style(container::rounded_box),`;
    }
  }).join("\n");
  return `// Generated by Rustform Studio \u2014 iced
// Cargo.toml: iced = "${BACKENDS.find((b) => b.id === "iced")?.version}"
use iced::widget::{button, checkbox, column, container, rule, slider, text, text_input};
use iced::{Color, Element, Task};

struct State {
${stateFields(project, false)}
}

impl Default for State {
    fn default() -> Self {
        Self {
${defaultFields(project, false)}
        }
    }
}

#[derive(Debug, Clone)]
enum Message {
${variants}
}

fn update(state: &mut State, message: Message) -> Task<Message> {
    match message {
${arms}
    }
    Task::none()
}

fn view(state: &State) -> Element<'_, Message> {
    // Rustform exports a readable vertical layout. Replace column! with stack!
    // when preserving the designer's absolute positions is required.
    container(column![
${elements}
    ].spacing(12).padding(40)).into()
}

fn main() -> iced::Result {
    iced::application(${q(project.screenName)}, update, view).run()
}
`;
}
function cssIced(value) {
  const [r, g, b] = hexRgb(value);
  return `Color::from_rgb(${(r / 255).toFixed(3)}, ${(g / 255).toFixed(3)}, ${(b / 255).toFixed(3)})`;
}
function slintKind(widget) {
  return `component-${snake(widget.id)}`;
}
function generateSlint(project) {
  const callbacks = [...new Set(project.widgets.flatMap((w) => w.actions.map((a) => a.handlerName || `handle_${snake(w.id)}`)))];
  const fields = widgetState(project).map((w) => `    in-out property <${w.type === "input" ? "string" : w.type === "checkbox" ? "bool" : "float"}> ${snake(w.id)}${w.type === "slider" ? ": 50" : ""};`).join("\n");
  const body = project.widgets.map((w) => {
    const common = `        x: ${w.x}px;
        y: ${w.y}px;
        width: ${w.width}px;
        height: ${w.height}px;`;
    const actions = w.actions.map((a) => `root.${snake(a.handlerName || `handle_${snake(w.id)}`)}();`).join(" ");
    switch (w.type) {
      case "text":
        return `    Text {
${common}
        text: ${q(w.text)};
        color: ${slintColor(w.color)};
        font-size: ${w.fontSize}px;
        font-weight: ${Math.round(w.fontWeight)};
    }`;
      case "input":
        return `    ${w.inputType === "password" ? "PasswordInput" : "LineEdit"} {
${common}
        placeholder-text: ${q(w.placeholder)};
        text <=> root.${snake(w.id)};
        edited => { ${actions} }
    }`;
      case "button":
        return `    Button {
${common}
        text: ${q(w.text)};
        clicked => { ${actions} }
    }`;
      case "checkbox":
        return `    CheckBox {
${common}
        text: ${q(w.text)};
        checked <=> root.${snake(w.id)};
        toggled => { ${actions} }
    }`;
      case "slider":
        return `    Slider {
${common}
        value <=> root.${snake(w.id)};
        minimum: 0;
        maximum: 100;
        changed => { ${actions} }
    }`;
      case "divider":
        return `    Rectangle {
${common}
        background: ${slintColor(w.background)};
    }`;
      case "image":
        return `    Rectangle {
${common}
        background: #ececf1;
        border-radius: ${w.borderRadius}px;
        Text { text: "Image"; color: #8b8b94; }
    }`;
      case "container":
        return `    Rectangle {
${common}
        background: ${slintColor(w.background)};
        border-radius: ${w.borderRadius}px;
    }`;
    }
  }).join("\n\n");
  return `// Generated by Rustform Studio \u2014 Slint
// Import this file from your main.slint or compile it with slint-build.
import { Button, CheckBox, LineEdit, PasswordInput, Slider } from "std-widgets.slint";

export component ${pascal(project.screenName)}Window inherits Window {
    title: ${q(project.screenName)};
    preferred-width: ${project.width}px;
    preferred-height: ${project.height}px;
    background: ${slintColor(project.background)};
${fields}
${callbacks.map((name) => `    callback ${snake(name)}();`).join("\n") || "    // Add an interaction to a widget to generate callbacks."}

${body}
}

// Connect callbacks from Rust:
// let ui = ${pascal(project.screenName)}Window::new()?;
// ui.on_${snake(callbacks[0] || "handle_sign_in")}(|| { /* your Rust logic */ });
`;
}
function gtkAction(action) {
  switch (action.kind) {
    case "message":
      return `println!("{}", ${q(action.value)});`;
    case "navigate":
      return `println!("Navigate to {}", ${q(action.value)});`;
    case "setText":
      return `// Keep a clone of the target Entry and call set_text(${q(action.value)}).`;
    case "toggle":
      return `// Keep a clone of the target widget and toggle its visibility.`;
    case "custom":
      return action.value || `// ${action.handlerName}`;
  }
}
function generateGtk(project) {
  const setup = project.widgets.map((w) => {
    const id = snake(w.id);
    switch (w.type) {
      case "text":
        return `    let ${id} = Label::new(Some(${q(w.text)}));
    ${id}.set_halign(gtk::Align::Start);`;
      case "input":
        return `    let ${id} = ${w.inputType === "password" ? "PasswordEntry" : "Entry"}::new();
    ${id}.set_placeholder_text(Some(${q(w.placeholder)}));`;
      case "button":
        return `    let ${id} = Button::with_label(${q(w.text)});`;
      case "checkbox":
        return `    let ${id} = CheckButton::with_label(${q(w.text)});`;
      case "slider":
        return `    let ${id} = Scale::with_range(gtk::Orientation::Horizontal, 0.0, 100.0, 1.0);
    ${id}.set_value(50.0);`;
      case "divider":
        return `    let ${id} = Separator::new(gtk::Orientation::Horizontal);`;
      case "image":
        return `    let ${id} = Label::new(Some("Image"));`;
      case "container":
        return `    let ${id} = Box::new(gtk::Orientation::Vertical, 0);`;
    }
  }).join("\n");
  const placement = project.widgets.map((w) => `    ${snake(w.id)}.set_size_request(${int(w.width)}, ${int(w.height)});
    fixed.put(&${snake(w.id)}, ${int(w.x)}.0, ${int(w.y)}.0);`).join("\n");
  const actions = project.widgets.flatMap((w) => w.actions.map((a) => {
    const id = snake(w.id);
    const code = gtkAction(a).replaceAll("\n", "\n        ");
    return a.event === "onClick" && w.type === "button" ? `    ${id}.connect_clicked(move |_| {
        ${code}
    });` : w.type === "checkbox" ? `    ${id}.connect_toggled(move |_| {
        ${code}
    });` : w.type === "slider" ? `    ${id}.connect_value_changed(move |_| {
        ${code}
    });` : `    ${id}.connect_changed(move |_| {
        ${code}
    });`;
  })).join("\n");
  return `// Generated by Rustform Studio \u2014 gtk4-rs
// Cargo.toml: gtk = { version = "${BACKENDS.find((b) => b.id === "gtk4")?.version}", package = "gtk4" }
use gtk::{prelude::*, Application, ApplicationWindow, Box, Button, CheckButton, Entry, Fixed, Label, PasswordEntry, Scale, Separator};

fn main() {
    let app = Application::builder().application_id("dev.rustform.app").build();
    app.connect_activate(build_ui);
    app.run();
}

fn build_ui(app: &Application) {
    let window = ApplicationWindow::builder()
        .application(app)
        .title(${q(project.screenName)})
        .default_width(${int(project.width)})
        .default_height(${int(project.height)})
        .build();
    let fixed = Fixed::new();
${setup}
${placement}
${actions || "    // Select a widget and add an interaction to connect signals."}
    window.set_child(Some(&fixed));
    window.present();
}
`;
}
function dioxusAction(action) {
  switch (action.kind) {
    case "message":
      return `status.set(${q(action.value)}.to_string());`;
    case "navigate":
      return `// Use your Dioxus router to navigate to ${q(action.value)}.`;
    case "setText":
      return `${snake(action.targetId || "status")}.set(${q(action.value)}.to_string());`;
    case "toggle":
      return `// Add a visibility signal for ${snake(action.targetId || "target")}.`;
    case "custom":
      return action.value || `// ${action.handlerName}`;
  }
}
function generateDioxus(project) {
  const signals = widgetState(project).map((w) => `    let mut ${snake(w.id)} = use_signal(|| ${w.type === "input" ? "String::new()" : w.type === "checkbox" ? "false" : "50.0_f32"});`).join("\n");
  const body = project.widgets.map((w) => {
    const id = snake(w.id);
    const style = `position: absolute; left: ${w.x}px; top: ${w.y}px; width: ${w.width}px; height: ${w.height}px; color: ${w.color}; font-size: ${w.fontSize}px;`;
    const actions = w.actions.map((a) => dioxusAction(a).replaceAll("\n", "\n                    ")).join("\n                    ");
    switch (w.type) {
      case "text":
        return `            span { style: ${q(style)}, ${q(w.text)} }`;
      case "input":
        return `            input {
                style: ${q(style)},
                r#type: ${q(w.inputType)},
                placeholder: ${q(w.placeholder)},
                value: "{${id}}",
                oninput: move |event| {
                    ${id}.set(event.value());
                    ${actions}
                }
            }`;
      case "button":
        return `            button {
                style: ${q(`${style} background: ${w.background}; border-radius: ${w.borderRadius}px;`)},
                onclick: move |_| {
                    ${actions}
                },
                ${q(w.text)}
            }`;
      case "checkbox":
        return `            label {
                style: ${q(style)},
                input {
                    r#type: "checkbox",
                    checked: ${id}.cloned(),
                    onchange: move |event| {
                        ${id}.set(event.checked());
                        ${actions}
                    }
                },
                ${q(w.text)}
            }`;
      case "slider":
        return `            input {
                style: ${q(style)},
                r#type: "range",
                min: "0",
                max: "100",
                value: "{${id}}",
                oninput: move |event| {
                    ${id}.set(event.value().parse().unwrap_or(0.0));
                    ${actions}
                }
            }`;
      case "divider":
        return `            div { style: ${q(`${style} background: ${w.background};`)} }`;
      case "image":
        return `            div { style: ${q(`${style} background: #ececf1; display: grid; place-items: center; border-radius: ${w.borderRadius}px;`)}, "Image" }`;
      case "container":
        return `            div { style: ${q(`${style} background: ${w.background}; border-radius: ${w.borderRadius}px;`)} }`;
    }
  }).join("\n");
  return `// Generated by Rustform Studio \u2014 Dioxus
// Cargo.toml: dioxus = { version = "${BACKENDS.find((b) => b.id === "dioxus")?.version}", features = ["desktop"] }
use dioxus::prelude::*;

fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
${signals}
    let mut status = use_signal(String::new);
    rsx! {
        div {
            style: "position: relative; width: ${project.width}px; height: ${project.height}px; background: ${project.background}; overflow: hidden;",
${body}
            span { style: "position: absolute; left: 16px; bottom: 10px; font-size: 12px;", "{status}" }
        }
    }
}
`;
}
function fltkAction(action) {
  switch (action.kind) {
    case "message":
      return `println!("{}", ${q(action.value)});`;
    case "navigate":
      return `println!("Navigate to {}", ${q(action.value)});`;
    case "setText":
      return `// Keep the target input mutable and call set_value(${q(action.value)}).`;
    case "toggle":
      return `// Keep the target widget mutable and call show()/hide().`;
    case "custom":
      return action.value || `// ${action.handlerName}`;
  }
}
function generateFltk(project) {
  const setup = project.widgets.map((w) => {
    const id = snake(w.id);
    const args = `${int(w.x)}, ${int(w.y)}, ${int(w.width)}, ${int(w.height)}`;
    let code = "";
    switch (w.type) {
      case "text":
        code = `let mut ${id} = Frame::new(${args}, None);
    ${id}.set_label(${q(w.text)});
    ${id}.set_label_size(${int(w.fontSize)});`;
        break;
      case "input":
        code = `let mut ${id} = ${w.inputType === "password" ? "SecretInput" : "Input"}::new(${args}, None);`;
        break;
      case "button":
        code = `let mut ${id} = Button::new(${args}, ${q(w.text)});`;
        break;
      case "checkbox":
        code = `let mut ${id} = CheckButton::new(${args}, ${q(w.text)});`;
        break;
      case "slider":
        code = `let mut ${id} = Slider::new(${args}, None);
    ${id}.set_type(SliderType::Horizontal);
    ${id}.set_bounds(0.0, 100.0);
    ${id}.set_value(50.0);`;
        break;
      case "divider":
        code = `let mut ${id} = Frame::new(${args}, None);
    ${id}.set_color(fltk::enums::Color::from_rgb(${hexRgb(w.background).join(", ")}));
    ${id}.set_frame(FrameType::FlatBox);`;
        break;
      case "image":
        code = `let mut ${id} = Frame::new(${args}, "Image");`;
        break;
      case "container":
        code = `let mut ${id} = Frame::new(${args}, None);
    ${id}.set_frame(FrameType::RFlatBox);`;
        break;
    }
    const actions = w.actions.map((a) => {
      const callback = fltkAction(a).replaceAll("\n", "\n        ");
      return `    ${id}.set_callback(move |_| {
        ${callback}
    });`;
    }).join("\n");
    return `    ${code}${actions ? `
${actions}` : ""}`;
  }).join("\n");
  return `// Generated by Rustform Studio \u2014 fltk-rs
// Cargo.toml: fltk = "${BACKENDS.find((b) => b.id === "fltk")?.version}"
use fltk::{app, button::{Button, CheckButton}, frame::{Frame, FrameType}, input::{Input, SecretInput}, valuator::{Slider, SliderType}, prelude::*, window::Window};

fn main() {
    let app = app::App::default();
    let mut window = Window::new(100, 100, ${int(project.width)}, ${int(project.height)}, ${q(project.screenName)});
${setup}
    window.end();
    window.show();
    app.run().unwrap();
}
`;
}
function generatedFilename(project) {
  const page = getActivePage(project);
  if (project.backend === "slint") return `${snake(page.name)}.slint`;
  return "main.rs";
}
function callbackNameFor(widget) {
  return handler(widget);
}
export {
  callbackNameFor,
  generateCode,
  generatedFilename,
  slintKind
};
