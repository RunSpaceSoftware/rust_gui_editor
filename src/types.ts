export type BackendId = 'egui' | 'iced' | 'slint' | 'gtk4' | 'dioxus' | 'fltk'

export type WidgetType =
  | 'container'
  | 'text'
  | 'input'
  | 'button'
  | 'checkbox'
  | 'slider'
  | 'image'
  | 'divider'

export type ActionKind = 'message' | 'navigate' | 'setText' | 'toggle' | 'custom'
export type ActionEvent = 'onClick' | 'onChange'

export interface WidgetAction {
  id: string
  event: ActionEvent
  kind: ActionKind
  targetId?: string
  value: string
  handlerName: string
}

export interface Widget {
  id: string
  type: WidgetType
  name: string
  x: number
  y: number
  width: number
  height: number
  text: string
  placeholder: string
  inputType: 'text' | 'password'
  color: string
  background: string
  fontSize: number
  fontWeight: number
  borderRadius: number
  opacity: number
  visible: boolean
  locked: boolean
  actions: WidgetAction[]
}

export interface Page {
  id: string
  name: string
  width: number
  height: number
  background: string
  widgets: Widget[]
}

export interface Project {
  name: string
  backend: BackendId
  pages: Page[]
  activePageId: string
}

export interface BackendDefinition {
  id: BackendId
  name: string
  version: string
  description: string
  language: string
  color: string
  crate: string
  tags: string[]
}
