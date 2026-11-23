import { useState } from 'react'
import { Braces, ChevronDown, Code2, Copy, Eye, EyeOff, Info, Lock, MousePointerClick, Plus, Settings2, Sparkles, Trash2, Unlock, Zap } from 'lucide-react'
import type { ActionEvent, ActionKind, Page, Widget, WidgetAction } from '../types'

interface InspectorProps {
  page: Page
  pageCount: number
  selected: Widget | null
  onUpdate: (patch: Partial<Widget>) => void
  onUpdatePage: (patch: Partial<Page>) => void
  onAddPage: () => void
  onDuplicatePage: () => void
  onDeletePage: () => void
  onAddAction: (action: WidgetAction) => void
  onUpdateAction: (id: string, patch: Partial<WidgetAction>) => void
  onRemoveAction: (id: string) => void
}

export default function Inspector({ page, pageCount, selected, onUpdate, onUpdatePage, onAddPage, onDuplicatePage, onDeletePage, onAddAction, onUpdateAction, onRemoveAction }: InspectorProps) {
  const [tab, setTab] = useState<'design' | 'actions'>('design')
  const isInteractive = selected && ['button', 'input', 'checkbox', 'slider'].includes(selected.type)

  const addAction = () => {
    if (!selected) return
    const event: ActionEvent = selected.type === 'button' ? 'onClick' : 'onChange'
    onAddAction({
      id: `action-${Date.now()}`,
      event,
      kind: 'custom',
      value: '// Write your Rust handler here',
      handlerName: `handle_${selected.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
    })
  }

  return (
    <aside className="inspector panel">
      <div className="inspector-tabs">
        <button className={tab === 'design' ? 'active' : ''} onClick={() => setTab('design')}><Settings2 size={14} />Design</button>
        <button className={tab === 'actions' ? 'active' : ''} onClick={() => setTab('actions')}><Zap size={14} />Interactions{selected?.actions.length ? <span>{selected.actions.length}</span> : null}</button>
      </div>
      {!selected ? (
        <PageProperties page={page} pageCount={pageCount} onUpdatePage={onUpdatePage} onAddPage={onAddPage} onDuplicatePage={onDuplicatePage} onDeletePage={onDeletePage} />
      ) : tab === 'design' ? (
        <div className="inspector-scroll">
          <div className="selected-heading">
            <div className={`selected-type-icon type-${selected.type}`}><SelectedIcon type={selected.type} /></div>
            <div><input value={selected.name} onChange={(event) => onUpdate({ name: event.target.value })} aria-label="Widget name" /><span>{humanType(selected.type)}</span></div>
            <button className="icon-button subtle" title={selected.locked ? 'Unlock widget' : 'Lock widget'} onClick={() => onUpdate({ locked: !selected.locked })}>{selected.locked ? <Lock size={15} /> : <Unlock size={15} />}</button>
          </div>

          <InspectorSection title="Layout">
            <div className="property-grid">
              <NumberField label="X" value={selected.x} onChange={(x) => onUpdate({ x })} />
              <NumberField label="Y" value={selected.y} onChange={(y) => onUpdate({ y })} />
              <NumberField label="W" value={selected.width} onChange={(width) => onUpdate({ width: Math.max(1, width) })} />
              <NumberField label="H" value={selected.height} onChange={(height) => onUpdate({ height: Math.max(1, height) })} />
            </div>
          </InspectorSection>

          {(selected.type === 'text' || selected.type === 'button' || selected.type === 'checkbox') && (
            <InspectorSection title="Content">
              <label className="field-label">Text<input value={selected.text} onChange={(event) => onUpdate({ text: event.target.value })} /></label>
              <div className="field-label">Typography</div>
              <div className="property-grid typography-grid">
                <NumberField label="Size" value={selected.fontSize} onChange={(fontSize) => onUpdate({ fontSize: Math.max(6, fontSize) })} />
                <label className="mini-select"><span>Weight</span><select value={selected.fontWeight} onChange={(event) => onUpdate({ fontWeight: Number(event.target.value) })}><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option></select><ChevronDown size={11} /></label>
              </div>
            </InspectorSection>
          )}
          {selected.type === 'input' && (
            <InspectorSection title="Input">
              <label className="field-label">Placeholder<input value={selected.placeholder} onChange={(event) => onUpdate({ placeholder: event.target.value })} /></label>
              <label className="field-label">Input type<span className="select-wrap"><select value={selected.inputType} onChange={(event) => onUpdate({ inputType: event.target.value as 'text' | 'password' })}><option value="text">Text</option><option value="password">Password</option></select><ChevronDown size={12} /></span></label>
            </InspectorSection>
          )}

          <InspectorSection title="Appearance">
            {(selected.type === 'text' || selected.type === 'button' || selected.type === 'checkbox' || selected.type === 'input') && (
              <ColorField label="Text color" value={selected.color} onChange={(color) => onUpdate({ color })} />
            )}
            {!['text', 'checkbox', 'slider'].includes(selected.type) && (
              <ColorField label="Fill" value={selected.background} onChange={(background) => onUpdate({ background })} />
            )}
            {(selected.type === 'button' || selected.type === 'container' || selected.type === 'input' || selected.type === 'image') && (
              <label className="range-field"><span>Corner radius <b>{selected.borderRadius}px</b></span><input type="range" min="0" max="30" value={selected.borderRadius} onChange={(event) => onUpdate({ borderRadius: Number(event.target.value) })} /></label>
            )}
            <label className="range-field"><span>Opacity <b>{selected.opacity}%</b></span><input type="range" min="0" max="100" value={selected.opacity} onChange={(event) => onUpdate({ opacity: Number(event.target.value) })} /></label>
            <button className="visibility-row" onClick={() => onUpdate({ visible: !selected.visible })}>{selected.visible ? <Eye size={14} /> : <EyeOff size={14} />}<span>{selected.visible ? 'Visible on canvas' : 'Hidden on canvas'}</span><span className={`mini-toggle ${selected.visible ? 'on' : ''}`} /></button>
          </InspectorSection>

          <button className="interaction-shortcut" onClick={() => setTab('actions')}><span><Zap size={15} />Interactions</span><span>{selected.actions.length || 'Add'}<Plus size={13} /></span></button>
        </div>
      ) : (
        <div className="inspector-scroll actions-panel">
          <div className="actions-intro"><div className="action-orb"><MousePointerClick size={19} /></div><div><strong>Bring it to life</strong><p>Connect events to actions or write your own Rust function.</p></div></div>
          {!isInteractive ? (
            <div className="info-callout"><Info size={16} /><p>Choose a button, input, checkbox, or slider to add an interaction.</p></div>
          ) : (
            <>
              {selected.actions.map((action) => (
                <ActionEditor key={action.id} action={action} widget={selected} page={page} onUpdate={(patch) => onUpdateAction(action.id, patch)} onRemove={() => onRemoveAction(action.id)} />
              ))}
              <button className="add-interaction" onClick={addAction}><Plus size={15} />Add interaction</button>
              <div className="rust-note"><Braces size={15} /><div><strong>Real Rust, your way</strong><p>Custom handlers are inserted into the generated backend code.</p></div></div>
            </>
          )}
        </div>
      )}
    </aside>
  )
}

function PageProperties({ page, pageCount, onUpdatePage, onAddPage, onDuplicatePage, onDeletePage }: { page: Page; pageCount: number; onUpdatePage: (patch: Partial<Page>) => void; onAddPage: () => void; onDuplicatePage: () => void; onDeletePage: () => void }) {
  return <div className="inspector-scroll">
    <div className="selected-heading screen-heading"><div className="selected-type-icon"><Sparkles size={18} /></div><div><input value={page.name} onChange={(event) => onUpdatePage({ name: event.target.value })} aria-label="Page name" /><span>Page properties · {pageCount} page{pageCount === 1 ? '' : 's'}</span></div></div>
    <InspectorSection title="Canvas size"><div className="property-grid"><NumberField label="W" value={page.width} onChange={(width) => onUpdatePage({ width: Math.max(240, width) })} /><NumberField label="H" value={page.height} onChange={(height) => onUpdatePage({ height: Math.max(200, height) })} /></div></InspectorSection>
    <InspectorSection title="Appearance"><ColorField label="Background" value={page.background} onChange={(background) => onUpdatePage({ background })} /></InspectorSection>
    <InspectorSection title="Pages">
      <div className="page-management">
        <button onClick={onAddPage}><Plus size={13} />New page</button>
        <button onClick={onDuplicatePage}><Copy size={13} />Duplicate</button>
        <button className="danger" onClick={onDeletePage} disabled={pageCount <= 1} title={pageCount <= 1 ? 'A project needs at least one page' : 'Delete this page'}><Trash2 size={13} />Delete</button>
      </div>
      <p className="page-management-note">Each page has its own widgets, size, and background. Switch pages with the tabs above the canvas.</p>
    </InspectorSection>
    <div className="empty-selection-note"><MousePointerClick size={20} /><strong>No widget selected</strong><p>Select a widget on the canvas to edit its layout, style, and interactions.</p></div>
  </div>
}

function ActionEditor({ action, widget, page, onUpdate, onRemove }: { action: WidgetAction; widget: Widget; page: Page; onUpdate: (patch: Partial<WidgetAction>) => void; onRemove: () => void }) {
  const labels: Record<ActionKind, string> = { message: 'Show a message', navigate: 'Navigate to screen', setText: 'Set widget text', toggle: 'Toggle visibility', custom: 'Run Rust function' }
  const targets = page.widgets.filter((target) => action.kind === 'setText' ? target.type === 'input' : target.id !== widget.id)
  return <div className="action-card">
    <div className="action-card-heading"><span><Zap size={12} />Interaction</span><button className="icon-button subtle" onClick={onRemove} title="Delete interaction"><Trash2 size={13} /></button></div>
    <label className="field-label">When<span className="select-wrap"><select value={action.event} onChange={(event) => onUpdate({ event: event.target.value as ActionEvent })}>{widget.type === 'button' ? <option value="onClick">Clicked</option> : <option value="onChange">Value changed</option>}{widget.type !== 'button' && <option value="onClick">Clicked</option>}</select><ChevronDown size={12} /></span></label>
    <label className="field-label">Do this<span className="select-wrap"><select value={action.kind} onChange={(event) => onUpdate({ kind: event.target.value as ActionKind, value: '' })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={12} /></span></label>
    {(action.kind === 'setText' || action.kind === 'toggle') && <label className="field-label">Target<span className="select-wrap"><select value={action.targetId || ''} onChange={(event) => onUpdate({ targetId: event.target.value })}><option value="">Choose widget…</option>{targets.map((target) => <option value={target.id} key={target.id}>{target.name}</option>)}</select><ChevronDown size={12} /></span></label>}
    {(action.kind === 'message' || action.kind === 'navigate' || action.kind === 'setText') && <label className="field-label">{action.kind === 'message' ? 'Message' : action.kind === 'navigate' ? 'Screen or route' : 'New value'}<input value={action.value} onChange={(event) => onUpdate({ value: event.target.value })} placeholder={action.kind === 'navigate' ? '/dashboard' : 'Enter a value…'} /></label>}
    {action.kind === 'custom' && <><label className="field-label"><span className="label-icon"><Code2 size={12} />Function name</span><input className="mono-input" value={action.handlerName} onChange={(event) => onUpdate({ handlerName: event.target.value })} spellCheck={false} /></label><label className="field-label">Rust code<textarea className="code-input" rows={5} value={action.value} onChange={(event) => onUpdate({ value: event.target.value })} spellCheck={false} /></label></>}
  </div>
}

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="inspector-section"><h3>{title}</h3>{children}</section>
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="number-field"><span>{label}</span><input type="number" value={Math.round(value)} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="color-field"><span>{label}</span><div><input className="color-swatch" type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'} onChange={(event) => onChange(event.target.value)} /><input value={value} onChange={(event) => onChange(event.target.value)} /></div></label>
}

function humanType(type: Widget['type']) {
  return ({ container: 'Container', text: 'Text label', input: 'Text input', button: 'Push button', checkbox: 'Checkbox', slider: 'Slider', image: 'Image', divider: 'Divider' })[type]
}

function SelectedIcon({ type }: { type: Widget['type'] }) {
  if (type === 'button') return <MousePointerClick size={17} />
  if (type === 'text') return <span className="text-icon">T</span>
  return <Settings2 size={17} />
}
