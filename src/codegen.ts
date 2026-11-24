import { BACKENDS, getActivePage } from './data'
import type { BackendId, Project, Widget, WidgetAction } from './types'

const snake = (value: string) => {
  const base = value
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
  if (!base) return 'widget'
  // Rust identifiers cannot start with a digit, so keep a leading underscore.
  return /^[0-9]/.test(base) ? `_${base}` : base
}
const pascal = (value: string) => {
  const name = snake(value).split('_').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
  return /^[0-9]/.test(name) ? `W${name}` : name
}
const q = (value: string) => JSON.stringify(value)
const cssColor = (value: string) => value === 'transparent' ? 'Color32::TRANSPARENT' : `Color32::from_rgb(${hexRgb(value).join(', ')})`
const hexRgb = (hex: string): [number, number, number] => {
  let digits = hex.trim().replace('#', '')
  if (/^[0-9a-f]{3}$/i.test(digits)) digits = digits.split('').map((digit) => digit + digit).join('')
  if (!/^[0-9a-f]{6}$/i.test(digits)) return [39, 39, 42]
  return [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16)) as [number, number, number]
}
// Designer coordinates may be fractional; Rust APIs such as GTK and FLTK need integers.
const int = (value: number) => Math.round(value)
// Slint colors are bare literals, not strings; anything unsupported falls back to transparent.
const slintColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value) ? value : 'transparent'
const actionFor = (widget: Widget, event: 'onClick' | 'onChange') => widget.actions.filter((action) => action.event === event)
const handler = (widget: Widget) => widget.actions[0]?.handlerName || `handle_${snake(widget.id)}`

type ScreenProject = {
  backend: BackendId
  screenName: string
  width: number
  height: number
  background: string
  widgets: Widget[]
}

export function generateCode(project: Project): string {
  const page = getActivePage(project)
  const screen: ScreenProject = {
    backend: project.backend,
    screenName: page.name,
    width: page.width,
    height: page.height,
    background: page.background,
    widgets: page.widgets,
  }
  switch (screen.backend) {
    case 'egui': return generateEgui(screen)
    case 'iced': return generateIced(screen)
    case 'slint': return generateSlint(screen)
    case 'gtk4': return generateGtk(screen)
    case 'dioxus': return generateDioxus(screen)
    case 'fltk': return generateFltk(screen)
  }
}

function rustAction(action: WidgetAction, self: string, eventValue = false): string {
  const state = self ? `${self}.` : ''
  const value = q(action.value)
  switch (action.kind) {
    case 'message': return `${state}status = ${value}.to_string();\n    println!("{}", ${state}status);`
    case 'navigate': return `// Replace with your router or window navigation.\n    println!("Navigate to {}", ${value});`
    case 'setText': return `${state}${snake(action.targetId || 'status')} = ${value}.to_string();`
    case 'toggle': return `${state}show_${snake(action.targetId || '')} = !${state}show_${snake(action.targetId || '')};`
    case 'custom': return eventValue ? action.value || `// ${action.handlerName}` : action.value || `// ${action.handlerName}`
  }
}

function widgetState(project: ScreenProject) {
  return project.widgets.filter((w) => w.type === 'input' || w.type === 'checkbox' || w.type === 'slider')
}

function defaultFields(project: ScreenProject, includeVisibility = true) {
  const fields = widgetState(project).map((w) => `        ${snake(w.id)}: ${w.type === 'input' ? 'String::new()' : w.type === 'checkbox' ? 'false' : '50.0'},`)
  const visibility = includeVisibility ? project.widgets.map((w) => `        show_${snake(w.id)}: ${w.visible},`) : []
  return [...fields, '        status: String::new(),', ...visibility].join('\n')
}

function stateFields(project: ScreenProject, includeVisibility = true) {
  const fields = widgetState(project).map((w) => `    ${snake(w.id)}: ${w.type === 'input' ? 'String' : w.type === 'checkbox' ? 'bool' : 'f32'},`)
  const visibility = includeVisibility ? project.widgets.map((w) => `    show_${snake(w.id)}: bool,`) : []
  return [...fields, '    status: String,', ...visibility].join('\n')
}

function eguiWidget(widget: Widget): string {
  const id = snake(widget.id)
  const actions = (event: 'onClick' | 'onChange') => actionFor(widget, event)
    .map((a) => rustAction(a, 'self', event === 'onChange').replaceAll('\n', '\n        '))
    .join('\n        ')
  const rect = `Rect::from_min_size(pos2(${widget.x.toFixed(1)}, ${widget.y.toFixed(1)}), vec2(${widget.width.toFixed(1)}, ${widget.height.toFixed(1)}))`
  let content = ''
  switch (widget.type) {
    case 'text':
      content = `ui.painter().text(${rect}.min, Align2::LEFT_TOP, ${q(widget.text)}, FontId::proportional(${widget.fontSize.toFixed(1)}), ${cssColor(widget.color)});`
      break
    case 'input':
      content = `let response = ui.put(${rect}, TextEdit::singleline(&mut self.${id}).hint_text(${q(widget.placeholder)}).font(FontId::proportional(${widget.fontSize.toFixed(1)}))${widget.inputType === 'password' ? '.password(true)' : ''});\n      if response.changed() {\n        ${actions('onChange')}\n      }`
      break
    case 'button':
      content = `let response = ui.put(${rect}, Button::new(RichText::new(${q(widget.text)}).color(${cssColor(widget.color)})).fill(${cssColor(widget.background)}));\n      if response.clicked() {\n        ${actions('onClick')}\n      }`
      break
    case 'checkbox':
      content = `let response = ui.put(${rect}, Checkbox::new(&mut self.${id}, ${q(widget.text)}));\n      if response.changed() {\n        ${actions('onChange')}\n      }`
      break
    case 'slider':
      content = `let response = ui.put(${rect}, Slider::new(&mut self.${id}, 0.0..=100.0).show_value(false));\n      if response.changed() {\n        ${actions('onChange')}\n      }`
      break
    case 'container':
      content = `ui.painter().rect_filled(${rect}, ${widget.borderRadius.toFixed(1)}, ${cssColor(widget.background)});`
      break
    case 'image':
      content = `ui.painter().rect_filled(${rect}, ${widget.borderRadius.toFixed(1)}, Color32::from_rgb(236, 236, 241));\n      ui.painter().text(${rect}.center(), Align2::CENTER_CENTER, "Image", FontId::proportional(13.0), Color32::GRAY);`
      break
    case 'divider':
      content = `ui.painter().line_segment([${rect}.min, ${rect}.right_bottom()], Stroke::new(${Math.max(widget.height, 1).toFixed(1)}, ${cssColor(widget.background)}));`
      break
  }
  return `    if self.show_${id} {\n      ${content}\n    }`
}

function generateEgui(project: ScreenProject): string {
  const name = pascal(project.screenName)
  return `// Generated by Rustform Studio — egui / eframe
// Cargo.toml: eframe = "${BACKENDS.find((b) => b.id === 'egui')?.version}"
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
${project.widgets.map(eguiWidget).join('\n')}
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
`
}

function generateIced(project: ScreenProject): string {
  const interactive = project.widgets.filter((w) => ['input', 'checkbox', 'button', 'slider'].includes(w.type))
  const variants = interactive.map((w) => {
    const value = w.type === 'input' ? '(String)' : w.type === 'checkbox' || w.type === 'slider' ? `(${w.type === 'checkbox' ? 'bool' : 'f32'})` : ''
    return `    ${pascal(w.id)}${w.type === 'button' ? 'Pressed' : 'Changed'}${value},`
  }).join('\n')
  const arms = interactive.map((w) => {
    const variant = `${pascal(w.id)}${w.type === 'button' ? 'Pressed' : 'Changed'}`
    const value = w.type === 'button' ? '' : '(value)'
    const assignment = w.type === 'input' || w.type === 'checkbox' || w.type === 'slider' ? `state.${snake(w.id)} = value;\n        ` : ''
    const actions = actionFor(w, w.type === 'button' ? 'onClick' : 'onChange').map((a) => rustAction(a, 'state', true).replaceAll('\n    ', '\n        ')).join('\n        ')
    return `        Message::${variant}${value} => {\n            ${assignment}${actions}\n        }`
  }).join('\n')
  const elements = project.widgets.map((w) => {
    switch (w.type) {
      case 'text': return `    text(${q(w.text)}).size(${w.fontSize}).color(${cssIced(w.color)}),`
      case 'input': return `    text_input(${q(w.placeholder)}, &state.${snake(w.id)})${w.inputType === 'password' ? '.secure(true)' : ''}.on_input(Message::${pascal(w.id)}Changed).width(${w.width}),`
      case 'button': return `    button(text(${q(w.text)}).center()).on_press(Message::${pascal(w.id)}Pressed).width(${w.width}),`
      case 'checkbox': return `    checkbox(${q(w.text)}, state.${snake(w.id)}).on_toggle(Message::${pascal(w.id)}Changed),`
      case 'slider': return `    slider(0.0..=100.0, state.${snake(w.id)}, Message::${pascal(w.id)}Changed).width(${w.width}),`
      case 'divider': return `    rule::horizontal(${Math.max(1, w.height)}),`
      case 'image': return `    container(text("Image").center()).width(${w.width}).height(${w.height}).style(container::rounded_box),`
      case 'container': return `    container(text("" )).width(${w.width}).height(${w.height}).style(container::rounded_box),`
    }
  }).join('\n')
  return `// Generated by Rustform Studio — iced
// Cargo.toml: iced = "${BACKENDS.find((b) => b.id === 'iced')?.version}"
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
`
}

function cssIced(value: string): string {
  const [r, g, b] = hexRgb(value)
  return `Color::from_rgb(${(r / 255).toFixed(3)}, ${(g / 255).toFixed(3)}, ${(b / 255).toFixed(3)})`
}

function slintKind(widget: Widget): string {
  return `component-${snake(widget.id)}`
}

function generateSlint(project: ScreenProject): string {
  const callbacks = [...new Set(project.widgets.flatMap((w) => w.actions.map((a) => a.handlerName || `handle_${snake(w.id)}`)))]
  const fields = widgetState(project).map((w) => `    in-out property <${w.type === 'input' ? 'string' : w.type === 'checkbox' ? 'bool' : 'float'}> ${snake(w.id)}${w.type === 'slider' ? ': 50' : ''};`).join('\n')
  const body = project.widgets.map((w) => {
    const common = `        x: ${w.x}px;\n        y: ${w.y}px;\n        width: ${w.width}px;\n        height: ${w.height}px;`
    const actions = w.actions.map((a) => `root.${snake(a.handlerName || `handle_${snake(w.id)}`)}();`).join(' ')
    switch (w.type) {
      case 'text': return `    Text {\n${common}\n        text: ${q(w.text)};\n        color: ${slintColor(w.color)};\n        font-size: ${w.fontSize}px;\n        font-weight: ${Math.round(w.fontWeight)};\n    }`
      case 'input': return `    ${w.inputType === 'password' ? 'PasswordInput' : 'LineEdit'} {\n${common}\n        placeholder-text: ${q(w.placeholder)};\n        text <=> root.${snake(w.id)};\n        edited => { ${actions} }\n    }`
      case 'button': return `    Button {\n${common}\n        text: ${q(w.text)};\n        clicked => { ${actions} }\n    }`
      case 'checkbox': return `    CheckBox {\n${common}\n        text: ${q(w.text)};\n        checked <=> root.${snake(w.id)};\n        toggled => { ${actions} }\n    }`
      case 'slider': return `    Slider {\n${common}\n        value <=> root.${snake(w.id)};\n        minimum: 0;\n        maximum: 100;\n        changed => { ${actions} }\n    }`
      case 'divider': return `    Rectangle {\n${common}\n        background: ${slintColor(w.background)};\n    }`
      case 'image': return `    Rectangle {\n${common}\n        background: #ececf1;\n        border-radius: ${w.borderRadius}px;\n        Text { text: "Image"; color: #8b8b94; }\n    }`
      case 'container': return `    Rectangle {\n${common}\n        background: ${slintColor(w.background)};\n        border-radius: ${w.borderRadius}px;\n    }`
    }
  }).join('\n\n')
  return `// Generated by Rustform Studio — Slint
// Import this file from your main.slint or compile it with slint-build.
import { Button, CheckBox, LineEdit, PasswordInput, Slider } from "std-widgets.slint";

export component ${pascal(project.screenName)}Window inherits Window {
    title: ${q(project.screenName)};
    preferred-width: ${project.width}px;
    preferred-height: ${project.height}px;
    background: ${slintColor(project.background)};
${fields}
${callbacks.map((name) => `    callback ${snake(name)}();`).join('\n') || '    // Add an interaction to a widget to generate callbacks.'}

${body}
}

// Connect callbacks from Rust:
// let ui = ${pascal(project.screenName)}Window::new()?;
// ui.on_${snake(callbacks[0] || 'handle_sign_in')}(|| { /* your Rust logic */ });
`
}

function gtkAction(action: WidgetAction): string {
  switch (action.kind) {
    case 'message': return `println!("{}", ${q(action.value)});`
    case 'navigate': return `println!("Navigate to {}", ${q(action.value)});`
    case 'setText': return `// Keep a clone of the target Entry and call set_text(${q(action.value)}).`
    case 'toggle': return `// Keep a clone of the target widget and toggle its visibility.`
    case 'custom': return action.value || `// ${action.handlerName}`
  }
}

function generateGtk(project: ScreenProject): string {
  const setup = project.widgets.map((w) => {
    const id = snake(w.id)
    switch (w.type) {
      case 'text': return `    let ${id} = Label::new(Some(${q(w.text)}));\n    ${id}.set_halign(gtk::Align::Start);`
      case 'input': return `    let ${id} = ${w.inputType === 'password' ? 'PasswordEntry' : 'Entry'}::new();\n    ${id}.set_placeholder_text(Some(${q(w.placeholder)}));`
      case 'button': return `    let ${id} = Button::with_label(${q(w.text)});`
      case 'checkbox': return `    let ${id} = CheckButton::with_label(${q(w.text)});`
      case 'slider': return `    let ${id} = Scale::with_range(gtk::Orientation::Horizontal, 0.0, 100.0, 1.0);\n    ${id}.set_value(50.0);`
      case 'divider': return `    let ${id} = Separator::new(gtk::Orientation::Horizontal);`
      case 'image': return `    let ${id} = Label::new(Some("Image"));`
      case 'container': return `    let ${id} = Box::new(gtk::Orientation::Vertical, 0);`
    }
  }).join('\n')
  const placement = project.widgets.map((w) => `    ${snake(w.id)}.set_size_request(${int(w.width)}, ${int(w.height)});\n    fixed.put(&${snake(w.id)}, ${int(w.x)}.0, ${int(w.y)}.0);`).join('\n')
  const actions = project.widgets.flatMap((w) => w.actions.map((a) => {
    const id = snake(w.id)
    const code = gtkAction(a).replaceAll('\n', '\n        ')
    return a.event === 'onClick' && w.type === 'button'
      ? `    ${id}.connect_clicked(move |_| {\n        ${code}\n    });`
      : w.type === 'checkbox' ? `    ${id}.connect_toggled(move |_| {\n        ${code}\n    });` : w.type === 'slider' ? `    ${id}.connect_value_changed(move |_| {\n        ${code}\n    });` : `    ${id}.connect_changed(move |_| {\n        ${code}\n    });`
  })).join('\n')
  return `// Generated by Rustform Studio — gtk4-rs
// Cargo.toml: gtk = { version = "${BACKENDS.find((b) => b.id === 'gtk4')?.version}", package = "gtk4" }
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
${actions || '    // Select a widget and add an interaction to connect signals.'}
    window.set_child(Some(&fixed));
    window.present();
}
`
}

function dioxusAction(action: WidgetAction): string {
  switch (action.kind) {
    case 'message': return `status.set(${q(action.value)}.to_string());`
    case 'navigate': return `// Use your Dioxus router to navigate to ${q(action.value)}.`
    case 'setText': return `${snake(action.targetId || 'status')}.set(${q(action.value)}.to_string());`
    case 'toggle': return `// Add a visibility signal for ${snake(action.targetId || 'target')}.`
    case 'custom': return action.value || `// ${action.handlerName}`
  }
}

function generateDioxus(project: ScreenProject): string {
  const signals = widgetState(project).map((w) => `    let mut ${snake(w.id)} = use_signal(|| ${w.type === 'input' ? 'String::new()' : w.type === 'checkbox' ? 'false' : '50.0_f32'});`).join('\n')
  const body = project.widgets.map((w) => {
    const id = snake(w.id)
    const style = `position: absolute; left: ${w.x}px; top: ${w.y}px; width: ${w.width}px; height: ${w.height}px; color: ${w.color}; font-size: ${w.fontSize}px;`
    const actions = w.actions.map((a) => dioxusAction(a).replaceAll('\n', '\n                    ')).join('\n                    ')
    switch (w.type) {
      case 'text':
        return `            span { style: ${q(style)}, ${q(w.text)} }`
      case 'input':
        return `            input {
                style: ${q(style)},
                r#type: ${q(w.inputType)},
                placeholder: ${q(w.placeholder)},
                value: "{${id}}",
                oninput: move |event| {
                    ${id}.set(event.value());
                    ${actions}
                }
            }`
      case 'button':
        return `            button {
                style: ${q(`${style} background: ${w.background}; border-radius: ${w.borderRadius}px;`)},
                onclick: move |_| {
                    ${actions}
                },
                ${q(w.text)}
            }`
      case 'checkbox':
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
            }`
      case 'slider':
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
            }`
      case 'divider':
        return `            div { style: ${q(`${style} background: ${w.background};`)} }`
      case 'image':
        return `            div { style: ${q(`${style} background: #ececf1; display: grid; place-items: center; border-radius: ${w.borderRadius}px;`)}, "Image" }`
      case 'container':
        return `            div { style: ${q(`${style} background: ${w.background}; border-radius: ${w.borderRadius}px;`)} }`
    }
  }).join('\n')
  return `// Generated by Rustform Studio — Dioxus
// Cargo.toml: dioxus = { version = "${BACKENDS.find((b) => b.id === 'dioxus')?.version}", features = ["desktop"] }
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
`
}

function fltkAction(action: WidgetAction): string {
  switch (action.kind) {
    case 'message': return `println!("{}", ${q(action.value)});`
    case 'navigate': return `println!("Navigate to {}", ${q(action.value)});`
    case 'setText': return `// Keep the target input mutable and call set_value(${q(action.value)}).`
    case 'toggle': return `// Keep the target widget mutable and call show()/hide().`
    case 'custom': return action.value || `// ${action.handlerName}`
  }
}

function generateFltk(project: ScreenProject): string {
  const setup = project.widgets.map((w) => {
    const id = snake(w.id)
    const args = `${int(w.x)}, ${int(w.y)}, ${int(w.width)}, ${int(w.height)}`
    let code = ''
    switch (w.type) {
      case 'text': code = `let mut ${id} = Frame::new(${args}, None);\n    ${id}.set_label(${q(w.text)});\n    ${id}.set_label_size(${int(w.fontSize)});`; break
      case 'input': code = `let mut ${id} = ${w.inputType === 'password' ? 'SecretInput' : 'Input'}::new(${args}, None);`; break
      case 'button': code = `let mut ${id} = Button::new(${args}, ${q(w.text)});`; break
      case 'checkbox': code = `let mut ${id} = CheckButton::new(${args}, ${q(w.text)});`; break
      case 'slider': code = `let mut ${id} = Slider::new(${args}, None);\n    ${id}.set_type(SliderType::Horizontal);\n    ${id}.set_bounds(0.0, 100.0);\n    ${id}.set_value(50.0);`; break
      case 'divider': code = `let mut ${id} = Frame::new(${args}, None);\n    ${id}.set_color(fltk::enums::Color::from_rgb(${hexRgb(w.background).join(', ')}));\n    ${id}.set_frame(FrameType::FlatBox);`; break
      case 'image': code = `let mut ${id} = Frame::new(${args}, "Image");`; break
      case 'container': code = `let mut ${id} = Frame::new(${args}, None);\n    ${id}.set_frame(FrameType::RFlatBox);`; break
    }
    const actions = w.actions.map((a) => {
      const callback = fltkAction(a).replaceAll('\n', '\n        ')
      return `    ${id}.set_callback(move |_| {\n        ${callback}\n    });`
    }).join('\n')
    return `    ${code}${actions ? `\n${actions}` : ''}`
  }).join('\n')
  return `// Generated by Rustform Studio — fltk-rs
// Cargo.toml: fltk = "${BACKENDS.find((b) => b.id === 'fltk')?.version}"
use fltk::{app, button::{Button, CheckButton}, frame::{Frame, FrameType}, input::{Input, SecretInput}, valuator::{Slider, SliderType}, prelude::*, window::Window};

fn main() {
    let app = app::App::default();
    let mut window = Window::new(100, 100, ${int(project.width)}, ${int(project.height)}, ${q(project.screenName)});
${setup}
    window.end();
    window.show();
    app.run().unwrap();
}
`
}

export function generatedFilename(project: Project): string {
  const page = getActivePage(project)
  if (project.backend === 'slint') return `${snake(page.name)}.slint`
  return 'main.rs'
}

export function callbackNameFor(widget: Widget): string {
  return handler(widget)
}

export { slintKind }
