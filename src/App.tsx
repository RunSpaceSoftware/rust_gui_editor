import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine, BookOpen, Braces, Check, CheckSquare, ChevronDown, ChevronRight,
  CircleHelp, Code2, Component, Copy, Eye, EyeOff, Frame, Grid2X2, GripVertical, Image,
  Keyboard, Layers3, LayoutDashboard, LayoutGrid, LoaderCircle, Lock, Maximize, Minus,
  Monitor, MousePointer2, MousePointerClick, MoveHorizontal, PanelLeftClose, Play, Plus,
  Redo2, Search, SlidersHorizontal, Smartphone, Sparkles, Square, Tablet, TextCursorInput,
  Trash2, Type, Undo2, Unlock, X, Zap,
} from 'lucide-react'
import { BACKENDS, INITIAL_PROJECT, WIDGET_LIBRARY, createPage, createWidget, getActivePage } from './data'
import type { Page, Project, Widget, WidgetAction, WidgetType } from './types'
import Canvas from './components/Canvas'
import Inspector from './components/Inspector'
import CodeModal from './components/CodeModal'
import BackendModal from './components/BackendModal'

const STORAGE_KEY = 'rustform-project-v1'

type StoredProject = {
  name?: string
  backend?: Project['backend']
  pages?: Page[]
  activePageId?: string
  screenName?: string
  width?: number
  height?: number
  background?: string
  widgets?: Widget[]
}

function loadProject(): Project {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return INITIAL_PROJECT
    const raw = JSON.parse(stored) as StoredProject
    if (raw.pages?.length) {
      const activePageId = raw.activePageId && raw.pages.some((page) => page.id === raw.activePageId)
        ? raw.activePageId
        : raw.pages[0].id
      return {
        name: raw.name || 'Untitled project',
        backend: BACKENDS.find((item) => item.id === raw.backend)?.id ?? 'slint',
        pages: raw.pages.map((page) => ({ ...page, widgets: Array.isArray(page.widgets) ? page.widgets : [] })),
        activePageId,
      }
    }
    if (raw.widgets) {
      const page = createPage(raw.screenName || 'Page 1', {
        width: raw.width,
        height: raw.height,
        background: raw.background,
        widgets: raw.widgets,
      })
      return {
        name: raw.name || 'Untitled project',
        backend: BACKENDS.find((item) => item.id === raw.backend)?.id ?? 'slint',
        pages: [page],
        activePageId: page.id,
      }
    }
  } catch { /* Local storage may be disabled or the saved project is invalid. */ }
  return INITIAL_PROJECT
}

export default function App() {
  const [project, setProject] = useState<Project>(loadProject)
  const [selectedId, setSelectedId] = useState<string | null>('sign-in')
  const [zoom, setZoom] = useState(90)
  const [preview, setPreview] = useState(false)
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [leftTab, setLeftTab] = useState<'widgets' | 'layers'>('widgets')
  const [widgetSearch, setWidgetSearch] = useState('')
  const [backendOpen, setBackendOpen] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [leftOpen, setLeftOpen] = useState(true)
  const [gridVisible, setGridVisible] = useState(true)
  const [past, setPast] = useState<Project[]>([])
  const [future, setFuture] = useState<Project[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'saving' | 'saved'>('saved')
  const toastTimer = useRef<number | undefined>(undefined)
  const page = getActivePage(project)
  const selected = page.widgets.find((widget) => widget.id === selectedId) || null
  const backend = BACKENDS.find((item) => item.id === project.backend)!

  const notify = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }, [])

  const changeProject = useCallback((updater: (current: Project) => Project, recordHistory = true) => {
    const next = updater(project)
    if (next === project) return
    setSaveState('saving')
    if (recordHistory) {
      setPast((items) => [...items.slice(-39), project])
      setFuture([])
    }
    setProject(next)
  }, [project])

  const undo = useCallback(() => {
    const previous = past.at(-1)
    if (!previous) return
    setPast(past.slice(0, -1))
    setFuture([project, ...future])
    setProject(previous)
    setSaveState('saving')
  }, [future, past, project])

  const redo = useCallback(() => {
    const next = future[0]
    if (!next) return
    setPast([...past, project])
    setFuture(future.slice(1))
    setProject(next)
    setSaveState('saving')
  }, [future, past, project])

  const updateActivePage = useCallback((updater: (current: Page) => Page, recordHistory = true) => {
    changeProject((current) => {
      const currentPage = getActivePage(current)
      const nextPage = updater(currentPage)
      if (nextPage === currentPage) return current
      return { ...current, pages: current.pages.map((item) => item.id === currentPage.id ? nextPage : item) }
    }, recordHistory)
  }, [changeProject])

  const addWidget = useCallback((type: WidgetType, x?: number, y?: number) => {
    const widget = createWidget(type, x ?? Math.round(page.width / 2 - 90), y ?? Math.round(page.height / 2 - 40))
    if (x === undefined) {
      const count = page.widgets.filter((item) => item.type === type).length
      widget.x += (count % 4) * 16
      widget.y += (count % 4) * 16
    }
    updateActivePage((current) => ({ ...current, widgets: [...current.widgets, widget] }))
    setSelectedId(widget.id)
  }, [page.height, page.widgets, page.width, updateActivePage])

  const deleteWidget = useCallback((id: string) => {
    updateActivePage((current) => ({ ...current, widgets: current.widgets.filter((widget) => widget.id !== id).map((widget) => ({ ...widget, actions: widget.actions.filter((action) => action.targetId !== id) })) }))
    setSelectedId(null)
    notify('Widget deleted')
  }, [notify, updateActivePage])

  const duplicateWidget = useCallback((id: string) => {
    const source = page.widgets.find((widget) => widget.id === id)
    if (!source) return
    const copy = { ...source, id: `${source.type}-${Date.now()}`, name: `${source.name} copy`, x: source.x + 16, y: source.y + 16, actions: source.actions.map((action) => ({ ...action, id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` })) }
    updateActivePage((current) => ({ ...current, widgets: [...current.widgets, copy] }))
    setSelectedId(copy.id)
    notify('Widget duplicated')
  }, [notify, page.widgets, updateActivePage])

  const updateSelected = useCallback((patch: Partial<Widget>) => {
    if (!selectedId) return
    updateActivePage((current) => ({ ...current, widgets: current.widgets.map((widget) => widget.id === selectedId ? { ...widget, ...patch } : widget) }))
  }, [selectedId, updateActivePage])

  // One pointer gesture is one undo step: only the first geometry update of a drag records history.
  const gestureRef = useRef(false)
  useEffect(() => {
    const endGesture = () => { gestureRef.current = false }
    window.addEventListener('pointerup', endGesture)
    window.addEventListener('pointercancel', endGesture)
    return () => {
      window.removeEventListener('pointerup', endGesture)
      window.removeEventListener('pointercancel', endGesture)
    }
  }, [])

  const moveWidget = useCallback((id: string, x: number, y: number) => {
    const recordHistory = !gestureRef.current
    gestureRef.current = true
    updateActivePage((current) => ({ ...current, widgets: current.widgets.map((widget) => widget.id === id ? { ...widget, x, y } : widget) }), recordHistory)
  }, [updateActivePage])

  const resizeWidget = useCallback((id: string, x: number, y: number, width: number, height: number) => {
    const recordHistory = !gestureRef.current
    gestureRef.current = true
    updateActivePage((current) => ({ ...current, widgets: current.widgets.map((widget) => widget.id === id ? { ...widget, x, y, width, height } : widget) }), recordHistory)
  }, [updateActivePage])

  const switchPage = useCallback((id: string) => {
    if (id === project.activePageId) return
    changeProject((current) => ({ ...current, activePageId: id }), false)
    setSelectedId(null)
    setPreview(false)
  }, [changeProject, project.activePageId])

  const addPage = useCallback(() => {
    const used = new Set(project.pages.map((item) => item.name))
    let number = project.pages.length + 1
    while (used.has(`Page ${number}`)) number++
    const next = createPage(`Page ${number}`, { width: page.width, height: page.height, background: page.background })
    changeProject((current) => ({ ...current, pages: [...current.pages, next], activePageId: next.id }))
    setSelectedId(null)
    setPreview(false)
    notify(`${next.name} created`)
  }, [changeProject, notify, page.background, page.height, page.width, project.pages])

  const duplicatePage = useCallback(() => {
    const stamp = Date.now()
    const idMap = new Map<string, string>()
    const widgets = page.widgets.map((widget, index) => {
      const id = `${widget.type}-${stamp}-${index}-${Math.random().toString(36).slice(2, 5)}`
      idMap.set(widget.id, id)
      return { ...widget, id }
    }).map((widget, index) => ({
      ...widget,
      actions: page.widgets[index].actions.map((action, actionIndex) => ({
        ...action,
        id: `action-${stamp}-${index}-${actionIndex}`,
        targetId: action.targetId ? idMap.get(action.targetId) : undefined,
      })),
    }))
    const next = createPage(`${page.name || 'Page'} copy`, { width: page.width, height: page.height, background: page.background, widgets })
    changeProject((current) => ({ ...current, pages: [...current.pages, next], activePageId: next.id }))
    setSelectedId(null)
    setPreview(false)
    notify(`${next.name} created`)
  }, [changeProject, notify, page])

  const deletePage = useCallback(() => {
    if (project.pages.length <= 1) {
      notify('A project needs at least one page')
      return
    }
    const index = project.pages.findIndex((item) => item.id === page.id)
    const remaining = project.pages.filter((item) => item.id !== page.id)
    const nextActive = project.activePageId === page.id
      ? remaining[Math.min(index, remaining.length - 1)].id
      : project.activePageId
    changeProject((current) => ({ ...current, pages: remaining, activePageId: nextActive }))
    setSelectedId(null)
    notify(`${page.name} deleted`)
  }, [changeProject, notify, page.id, page.name, project.activePageId, project.pages])

  const updateAction = (id: string, patch: Partial<WidgetAction>) => {
    if (!selected) return
    updateSelected({ actions: selected.actions.map((action) => action.id === id ? { ...action, ...patch } : action) })
  }

  useEffect(() => {
    setSaveState('saving')
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)) } catch { /* Keep the in-memory project. */ }
      setSaveState('saved')
    }, 450)
    return () => window.clearTimeout(timer)
  }, [project])

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      const modifier = event.ctrlKey || event.metaKey
      if (modifier && event.key.toLowerCase() === 's') {
        event.preventDefault()
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
          notify('Project saved locally')
        } catch {
          notify('Could not save: browser storage is unavailable')
        }
        return
      }
      if (modifier && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        setPreview(!preview)
        if (!preview) setSelectedId(null)
        return
      }
      if (modifier && event.key.toLowerCase() === 'z' && !editing) {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (event.key === 'Escape') {
        setBackendOpen(false)
        setCodeOpen(false)
        setHelpOpen(false)
        setSelectedId(null)
        setPreview(false)
      }
      // Locked widgets can be selected but not nudged, duplicated, or deleted from the keyboard.
      if (editing || !selectedId || selected?.locked) return
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteWidget(selectedId)
      }
      if (modifier && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        duplicateWidget(selectedId)
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault()
        const dx = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
        const dy = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
        const amount = event.shiftKey ? 10 : 1
        updateActivePage((current) => ({ ...current, widgets: current.widgets.map((widget) => widget.id === selectedId ? { ...widget, x: Math.max(0, widget.x + dx * amount), y: Math.max(0, widget.y + dy * amount) } : widget) }))
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [deleteWidget, duplicateWidget, notify, preview, project, redo, selected, selectedId, undo, updateActivePage])

  const setDeviceSize = (next: typeof device) => {
    setDevice(next)
    if (next === 'desktop') updateActivePage((current) => ({ ...current, width: 560, height: 440 }))
    if (next === 'tablet') updateActivePage((current) => ({ ...current, width: 768, height: 700 }))
    if (next === 'mobile') updateActivePage((current) => ({ ...current, width: 375, height: 700 }))
    setZoom(next === 'desktop' ? 90 : 70)
  }

  const resetProject = () => {
    if (!window.confirm('Start a new project? This replaces all pages.')) return
    const freshPage = createPage('Page 1')
    setProject({ name: 'Untitled project', backend: project.backend, pages: [freshPage], activePageId: freshPage.id })
    setPast([])
    setFuture([])
    setSelectedId(null)
    notify('New project created')
    setHelpOpen(false)
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className={`brand-block ${leftOpen ? '' : 'collapsed'}`}>
        <button className="brand" onClick={() => notify('Rustform Studio · Visual Rust GUI designer')} aria-label="Rustform home"><span className="brand-mark"><span /><span /><span /></span><span>rustform<span className="brand-dot">.</span></span></button>
        <span className="studio-label">STUDIO</span>
      </div>
      <div className="project-block"><button className="project-icon"><LayoutDashboard size={16} /></button><span className="project-breadcrumb">Projects <ChevronRight size={12} /></span><input className="project-name" value={project.name} onChange={(event) => changeProject((current) => ({ ...current, name: event.target.value }))} aria-label="Project name" /><span className="save-status" title="Saved in this browser's localStorage (rustform-project-v1)">{saveState === 'saving' ? <LoaderCircle size={12} className="spin" /> : <Check size={12} />}{saveState === 'saving' ? 'Saving…' : 'Saved'}</span></div>
      <div className="top-actions">
        <button className={`backend-button ${backendOpen ? 'active' : ''}`} onClick={() => setBackendOpen(true)}><span className="backend-mini-logo" style={{ background: backend.color }}>{project.backend === 'gtk4' ? 'G' : backend.name.charAt(0)}</span><span className="backend-button-label"><small>BACKEND</small><strong>{backend.name}<span>v{backend.version}</span></strong></span><ChevronDown size={14} /></button>
        <span className="top-divider" />
        <button className={`preview-button ${preview ? 'active' : ''}`} onClick={() => { setPreview(!preview); if (!preview) setSelectedId(null) }}><Play size={14} fill={preview ? 'currentColor' : 'none'} />{preview ? 'Stop preview' : 'Preview'}<kbd>⌘ P</kbd></button>
        <button className="primary-button generate-button" onClick={() => setCodeOpen(true)}><Code2 size={16} />Generate code<ArrowDownToLine size={14} /></button>
        <button className="avatar" title="Local project">R</button>
      </div>
    </header>

    <div className="workbench">
      <nav className="navigation-rail" aria-label="Studio navigation">
        <div className="rail-top">
          <button className="rail-button active" title="Design" onClick={() => { setPreview(false); setLeftTab('widgets'); setLeftOpen(true) }}><Component size={19} /><span>Design</span></button>
          <button className="rail-button" title="Layers" onClick={() => { setLeftTab('layers'); setLeftOpen(true) }}><Layers3 size={19} /><span>Layers</span></button>
          <button className="rail-button" title="Interactions" onClick={() => { const target = page.widgets.find((widget) => widget.type === 'button') || page.widgets[0]; if (target) setSelectedId(target.id); notify('Choose the Interactions tab in the inspector') }}><Zap size={19} /><span>Actions</span></button>
          <span className="rail-divider" />
          <button className="rail-button" title="Generate source" onClick={() => setCodeOpen(true)}><Braces size={19} /><span>Code</span></button>
        </div>
        <div className="rail-bottom"><button className="rail-button" title="Keyboard shortcuts" onClick={() => setHelpOpen(true)}><Keyboard size={18} /><span>Help</span></button><button className="rail-button" title="GUI ecosystem" onClick={() => setBackendOpen(true)}><BookOpen size={18} /><span>Libraries</span></button></div>
      </nav>

      {leftOpen && <aside className="library-panel panel">
        <div className="library-heading"><div><span className="panel-kicker">BUILD</span><h2>Components</h2></div><button className="icon-button subtle" onClick={() => setLeftOpen(false)} title="Collapse panel"><PanelLeftClose size={16} /></button></div>
        <div className="library-tabs"><button className={leftTab === 'widgets' ? 'active' : ''} onClick={() => setLeftTab('widgets')}><LayoutGrid size={13} />Widgets</button><button className={leftTab === 'layers' ? 'active' : ''} onClick={() => setLeftTab('layers')}><Layers3 size={13} />Layers<span>{page.widgets.length}</span></button></div>
        {leftTab === 'widgets' ? <div className="library-scroll">
          <label className="search-field"><Search size={14} /><input placeholder="Search components…" value={widgetSearch} onChange={(event) => setWidgetSearch(event.target.value)} /><kbd>/</kbd></label>
          <div className="section-label"><span>ESSENTIALS</span><span>{WIDGET_LIBRARY.filter((item) => item.label.toLowerCase().includes(widgetSearch.toLowerCase())).length}</span></div>
          <div className="widget-grid">
            {WIDGET_LIBRARY.filter((item) => item.label.toLowerCase().includes(widgetSearch.toLowerCase())).map((item) => <button
              className="widget-library-item"
              key={item.type}
              draggable
              onDragStart={(event) => { event.dataTransfer.setData('application/x-rustform-widget', item.type); event.dataTransfer.effectAllowed = 'copy' }}
              onClick={() => addWidget(item.type)}
              title={`${item.description}. Drag onto the canvas or click to add.`}
            ><span className={`widget-icon widget-icon-${item.type}`}><WidgetIcon type={item.type} /></span><span>{item.label}</span><GripVertical size={12} className="widget-grip" /></button>)}
          </div>
          {widgetSearch && WIDGET_LIBRARY.every((item) => !item.label.toLowerCase().includes(widgetSearch.toLowerCase())) && <div className="no-widgets"><Search size={20} /><p>No components match “{widgetSearch}”.</p></div>}
          <div className="library-tip"><Sparkles size={16} /><div><strong>Drag it. Drop it. Ship it.</strong><p>Components become native {backend.name} code.</p></div></div>
          <div className="screen-tree-heading"><span>ON THIS SCREEN</span><button className="icon-button subtle" onClick={() => setLeftTab('layers')}><ChevronRight size={13} /></button></div>
          <div className="screen-tree-quick">{page.widgets.slice(0, 5).map((widget) => <button key={widget.id} className={selectedId === widget.id ? 'selected' : ''} onClick={() => setSelectedId(widget.id)}><WidgetIcon type={widget.type} /><span>{widget.name}</span>{selectedId === widget.id && <span className="selected-dot" />}</button>)}{page.widgets.length > 5 && <button className="more-layers" onClick={() => setLeftTab('layers')}>+ {page.widgets.length - 5} more layers</button>}</div>
        </div> : <div className="library-scroll layers-panel">
          <div className="layer-screen"><Monitor size={15} /><strong>{page.name}</strong><span>{page.width} × {page.height}</span></div>
          <div className="section-label"><span>LAYERS</span><span>{page.widgets.length}</span></div>
          <div className="full-layer-list">{[...page.widgets].reverse().map((widget) => <div key={widget.id} className={`layer-row ${selectedId === widget.id ? 'selected' : ''}`}>
            <button className="layer-main" onClick={() => setSelectedId(widget.id)}><ChevronRight size={11} className="layer-chevron" /><WidgetIcon type={widget.type} /><span>{widget.name}</span></button>
            <button className="layer-icon" title={widget.visible ? 'Hide layer' : 'Show layer'} onClick={() => updateActivePage((current) => ({ ...current, widgets: current.widgets.map((item) => item.id === widget.id ? { ...item, visible: !item.visible } : item) }))}>{widget.visible ? <Eye size={12} /> : <EyeOff size={12} />}</button>
            <button className="layer-icon" title={widget.locked ? 'Unlock layer' : 'Lock layer'} onClick={() => updateActivePage((current) => ({ ...current, widgets: current.widgets.map((item) => item.id === widget.id ? { ...item, locked: !item.locked } : item) }))}>{widget.locked ? <Lock size={12} /> : <Unlock size={12} />}</button>
          </div>)}</div>
          {page.widgets.length === 0 && <div className="no-widgets"><Layers3 size={22} /><p>Your screen is empty. Add a widget to get started.</p></div>}
        </div>}
        <div className="library-footer"><span className="status-dot" />{backend.name} adapter ready<span>v{backend.version}</span></div>
      </aside>}

      <main className="editor-center">
        <div className="editor-toolbar">
          <div className="history-controls"><button className="icon-button" title="Undo (Ctrl+Z)" disabled={!past.length} onClick={undo}><Undo2 size={16} /></button><button className="icon-button" title="Redo (Ctrl+Shift+Z)" disabled={!future.length} onClick={redo}><Redo2 size={16} /></button><span className="toolbar-divider" />{!leftOpen && <button className="icon-button" title="Open components" onClick={() => setLeftOpen(true)}><LayoutGrid size={16} /></button>}<button className={`mode-button ${!preview ? 'active' : ''}`} onClick={() => setPreview(false)}><MousePointer2 size={13} />Design</button><button className={`mode-button ${preview ? 'active' : ''}`} onClick={() => { setPreview(true); setSelectedId(null) }}><Play size={12} />Preview</button></div>
          <div className="device-controls"><button className={device === 'desktop' ? 'active' : ''} title="Desktop canvas" onClick={() => setDeviceSize('desktop')}><Monitor size={15} /></button><button className={device === 'tablet' ? 'active' : ''} title="Tablet canvas" onClick={() => setDeviceSize('tablet')}><Tablet size={15} /></button><button className={device === 'mobile' ? 'active' : ''} title="Mobile canvas" onClick={() => setDeviceSize('mobile')}><Smartphone size={15} /></button></div>
          <div className="canvas-controls"><button className={`icon-button ${gridVisible ? 'active-soft' : ''}`} title="Toggle canvas grid" onClick={() => setGridVisible(!gridVisible)}><Grid2X2 size={15} /></button><span className="toolbar-divider" /><button className="icon-button" onClick={() => setZoom(Math.max(40, zoom - 10))} title="Zoom out"><Minus size={14} /></button><button className="zoom-value" onClick={() => setZoom(90)}>{zoom}%</button><button className="icon-button" onClick={() => setZoom(Math.min(160, zoom + 10))} title="Zoom in"><Plus size={14} /></button><button className="icon-button fit-button" title="Fit screen" onClick={() => setZoom(90)}><Maximize size={14} /></button></div>
        </div>
        <div className="page-bar">
          <div className="page-tabs" role="tablist" aria-label="Pages">
            {project.pages.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={item.id === project.activePageId}
                className={`page-tab ${item.id === project.activePageId ? 'active' : ''}`}
                onClick={() => switchPage(item.id)}
                title={`${item.name} · ${item.width} × ${item.height}`}
              >
                <Frame size={11} />
                <span>{item.name || 'Untitled page'}</span>
                <em>{item.widgets.length}</em>
              </button>
            ))}
          </div>
          <button className="add-page-button" onClick={addPage} title="Add a page"><Plus size={12} /><span>Add page</span></button>
        </div>
        <div className={`canvas-viewport ${gridVisible ? 'with-grid' : ''} ${preview ? 'preview-viewport' : ''}`}>
          <div className="canvas-meta"><span><Frame size={12} />{page.name}</span><span>{page.width} × {page.height}</span></div>
          {preview && <div className="preview-ribbon"><Play size={11} fill="currentColor" />INTERACTIVE PREVIEW<span>Click or edit widgets to test actions</span><button onClick={() => setPreview(false)}><X size={12} /></button></div>}
          <div className="canvas-centering"><Canvas page={page} selectedId={selectedId} zoom={zoom} preview={preview} onSelect={setSelectedId} onMove={moveWidget} onResize={resizeWidget} onDropWidget={addWidget} onNotify={notify} /></div>
          <div className="canvas-footnote"><span><MoveHorizontal size={12} />Drag to move</span><span>Snap to center guides</span><span>Shift + arrows for 10px</span></div>
        </div>
        <footer className="editor-statusbar"><div><span className="status-dot" />{preview ? 'Preview mode' : 'Editing'}<span className="status-separator">/</span><span>{page.name}</span></div><div><span>{page.widgets.length} widgets</span><span className="status-separator">·</span><span>{page.widgets.reduce((count, widget) => count + widget.actions.length, 0)} interactions</span><span className="status-separator">·</span><span>{project.pages.length} page{project.pages.length === 1 ? '' : 's'}</span></div><button onClick={() => setHelpOpen(true)}><CircleHelp size={12} />Shortcuts</button></footer>
      </main>

      <Inspector
        key={`${project.activePageId}-${selectedId || 'page'}`}
        page={page}
        pageCount={project.pages.length}
        selected={selected}
        onUpdate={updateSelected}
        onUpdatePage={(patch) => updateActivePage((current) => ({ ...current, ...patch }))}
        onAddPage={addPage}
        onDuplicatePage={duplicatePage}
        onDeletePage={deletePage}
        onAddAction={(action) => selected && updateSelected({ actions: [...selected.actions, action] })}
        onUpdateAction={updateAction}
        onRemoveAction={(id) => selected && updateSelected({ actions: selected.actions.filter((action) => action.id !== id) })}
      />
    </div>
    {selected && !preview && <div className="selection-actions"><button onClick={() => duplicateWidget(selected.id)} title="Duplicate (Ctrl+D)"><Copy size={14} /><span>Duplicate</span></button><span /><button className="danger" onClick={() => deleteWidget(selected.id)} title="Delete"><Trash2 size={14} /><span>Delete</span></button></div>}
    {toast && <div className="toast"><span><Check size={13} /></span>{toast}</div>}
    {backendOpen && <BackendModal project={project} onSelect={(id) => { changeProject((current) => ({ ...current, backend: id })); notify(`Backend switched to ${BACKENDS.find((item) => item.id === id)?.name}`) }} onClose={() => setBackendOpen(false)} />}
    {codeOpen && <CodeModal project={project} onClose={() => setCodeOpen(false)} />}
    {helpOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setHelpOpen(false) }}><div className="help-modal"><header><div className="code-title-icon"><Keyboard size={21} /></div><div><h2>Move at the speed of thought</h2><p>A few shortcuts to make designing feel effortless.</p></div><button className="icon-button" onClick={() => setHelpOpen(false)}><X size={19} /></button></header><div className="shortcut-grid">{[['Undo', 'Ctrl / ⌘ + Z'], ['Redo', 'Ctrl / ⌘ + Shift + Z'], ['Duplicate widget', 'Ctrl / ⌘ + D'], ['Delete widget', 'Delete / Backspace'], ['Nudge by 1px', 'Arrow keys'], ['Nudge by 10px', 'Shift + Arrow keys'], ['Save project', 'Ctrl / ⌘ + S'], ['Close / deselect', 'Esc'], ['Snap to center', 'Drag near center']].map(([label, keys]) => <div key={label}><span>{label}</span><kbd>{keys}</kbd></div>)}</div><div className="help-bottom"><span><Layers3 size={16} />Saved in this browser's localStorage.</span><button className="text-danger" onClick={resetProject}>Start a new project</button></div></div></div>}
  </div>
}

function WidgetIcon({ type }: { type: WidgetType }) {
  switch (type) {
    case 'container': return <Square size={17} />
    case 'text': return <Type size={17} />
    case 'input': return <TextCursorInput size={17} />
    case 'button': return <MousePointerClick size={17} />
    case 'checkbox': return <CheckSquare size={17} />
    case 'slider': return <SlidersHorizontal size={17} />
    case 'image': return <Image size={17} />
    case 'divider': return <Minus size={17} />
  }
}
