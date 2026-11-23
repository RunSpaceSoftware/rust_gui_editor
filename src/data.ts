import type { BackendDefinition, Page, Project, Widget, WidgetType } from './types'

export const BACKENDS: BackendDefinition[] = [
  {
    id: 'egui', name: 'egui', version: '0.31', crate: 'eframe',
    description: 'Immediate-mode UI for native apps and the web.', language: 'Rust', color: '#e8a849',
    tags: ['Desktop', 'Web', 'Immediate'],
  },
  {
    id: 'iced', name: 'iced', version: '0.13', crate: 'iced',
    description: 'Elm-inspired, reactive cross-platform applications.', language: 'Rust', color: '#6b8afd',
    tags: ['Desktop', 'Reactive', 'Typed'],
  },
  {
    id: 'slint', name: 'Slint', version: '1.9', crate: 'slint',
    description: 'Declarative native interfaces with a dedicated UI language.', language: '.slint', color: '#4fbfa4',
    tags: ['Desktop', 'Embedded', 'Declarative'],
  },
  {
    id: 'gtk4', name: 'GTK4', version: '0.9', crate: 'gtk4',
    description: 'Native Linux and cross-platform apps with gtk4-rs.', language: 'Rust', color: '#83b95d',
    tags: ['Linux', 'Desktop', 'Native'],
  },
  {
    id: 'dioxus', name: 'Dioxus', version: '0.6', crate: 'dioxus',
    description: 'React-like Rust apps for desktop, web, and mobile.', language: 'Rust', color: '#ee7e68',
    tags: ['Cross-platform', 'RSX', 'Reactive'],
  },
  {
    id: 'fltk', name: 'FLTK', version: '1.5', crate: 'fltk',
    description: 'Fast, lightweight native desktop interfaces.', language: 'Rust', color: '#ae85dd',
    tags: ['Desktop', 'Native', 'Lightweight'],
  },
]

export const WIDGET_LIBRARY: { type: WidgetType; label: string; description: string }[] = [
  { type: 'container', label: 'Container', description: 'Group and layout elements' },
  { type: 'text', label: 'Text', description: 'Headings and labels' },
  { type: 'input', label: 'Text input', description: 'Single-line text field' },
  { type: 'button', label: 'Button', description: 'Trigger an action' },
  { type: 'checkbox', label: 'Checkbox', description: 'Toggle a boolean value' },
  { type: 'slider', label: 'Slider', description: 'Select a numeric value' },
  { type: 'image', label: 'Image', description: 'Display an image or icon' },
  { type: 'divider', label: 'Divider', description: 'Separate sections' },
]

const baseWidget = {
  name: 'Widget',
  placeholder: '', inputType: 'text' as const, color: '#27272a', background: 'transparent',
  fontSize: 14, fontWeight: 400, borderRadius: 0, opacity: 100, visible: true, locked: false, actions: [],
}

export function createWidget(type: WidgetType, x = 80, y = 80): Widget {
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const defaults: Record<WidgetType, Partial<Widget>> = {
    container: { name: 'Container', width: 280, height: 180, background: '#f4f4f5', borderRadius: 10 },
    text: { name: 'Text', width: 200, height: 28, text: 'Text label' },
    input: { name: 'Text input', width: 240, height: 40, text: '', placeholder: 'Enter text…', background: '#ffffff', borderRadius: 6 },
    button: { name: 'Button', width: 140, height: 40, text: 'Button', color: '#ffffff', background: '#5b55d9', fontWeight: 600, borderRadius: 6 },
    checkbox: { name: 'Checkbox', width: 150, height: 24, text: 'Checkbox', fontSize: 13 },
    slider: { name: 'Slider', width: 220, height: 24, text: '50' },
    image: { name: 'Image', width: 160, height: 120, background: '#ececf1', borderRadius: 8 },
    divider: { name: 'Divider', width: 240, height: 2, background: '#e4e4e7' },
  }
  return { ...baseWidget, id, type, x, y, text: '', width: 160, height: 40, ...defaults[type] }
}

export function createPage(name: string, options: Partial<Pick<Page, 'width' | 'height' | 'background' | 'widgets'>> = {}): Page {
  return {
    id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    width: options.width ?? 560,
    height: options.height ?? 440,
    background: options.background ?? '#ffffff',
    widgets: options.widgets ?? [],
  }
}

export function getActivePage(project: Project): Page {
  return project.pages.find((page) => page.id === project.activePageId) ?? project.pages[0]
}

export const INITIAL_PROJECT: Project = {
  name: 'Untitled project',
  backend: 'slint',
  activePageId: 'page-sign-in',
  pages: [{
    id: 'page-sign-in',
    name: 'Sign in',
    width: 560,
    height: 440,
    background: '#ffffff',
    widgets: [
      { ...createWidget('text', 42, 34), id: 'title', text: 'Welcome back', name: 'Title', width: 360, height: 36, fontSize: 27, fontWeight: 650 },
      { ...createWidget('text', 42, 76), id: 'subtitle', text: 'Sign in to continue to your workspace.', name: 'Subtitle', width: 390, height: 22, fontSize: 13, color: '#777780' },
      { ...createWidget('text', 42, 124), id: 'email-label', text: 'Email address', name: 'Email label', width: 180, height: 20, fontSize: 12, fontWeight: 550 },
      { ...createWidget('input', 42, 148), id: 'email', name: 'Email input', width: 476, height: 40, placeholder: 'you@company.com' },
      { ...createWidget('text', 42, 207), id: 'password-label', text: 'Password', name: 'Password label', width: 180, height: 20, fontSize: 12, fontWeight: 550 },
      { ...createWidget('input', 42, 231), id: 'password', name: 'Password input', width: 476, height: 40, placeholder: 'Enter your password', inputType: 'password' },
      { ...createWidget('checkbox', 42, 291), id: 'remember', name: 'Remember me', text: 'Remember me', width: 160, height: 24 },
      { ...createWidget('button', 364, 282), id: 'sign-in', name: 'Sign in button', text: 'Sign in', width: 154, height: 42,
        actions: [{ id: 'action-1', event: 'onClick', kind: 'custom', value: '// Validate your form and authenticate here', handlerName: 'handle_sign_in' }] },
      { ...createWidget('divider', 42, 351), id: 'footer-divider', name: 'Footer divider', width: 476, height: 1 },
      { ...createWidget('text', 143, 374), id: 'footer', name: 'Footer text', text: 'New to Rustform?   Create an account', width: 300, height: 24, fontSize: 12, color: '#777780' },
    ],
  }],
}
