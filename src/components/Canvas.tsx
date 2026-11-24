import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon, Lock, MousePointer2 } from 'lucide-react'
import type { Page, Widget, WidgetAction, WidgetType } from '../types'

interface CanvasProps {
  page: Page
  selectedId: string | null
  zoom: number
  preview: boolean
  onSelect: (id: string | null) => void
  onMove: (id: string, x: number, y: number) => void
  onResize: (id: string, x: number, y: number, width: number, height: number) => void
  onDropWidget: (type: WidgetType, x: number, y: number) => void
  onNotify: (message: string) => void
}

interface DragState {
  id: string
  startX: number
  startY: number
  originX: number
  originY: number
  originWidth: number
  originHeight: number
  mode: 'move' | 'resize'
  corner: ResizeDirection
}

type ResizeDirection = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w'

export default function Canvas({ page, selectedId, zoom, preview, onSelect, onMove, onResize, onDropWidget, onNotify }: CanvasProps) {
  const screenRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [previewValues, setPreviewValues] = useState<Record<string, string | boolean>>({})
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [guides, setGuides] = useState({ vertical: false, horizontal: false })
  // Preview-only state (hidden widgets, typed values) must not leak into design mode or other pages.
  useEffect(() => {
    setHidden(new Set())
    setPreviewValues({})
  }, [preview, page.id])
  const scale = zoom / 100

  const runActions = (widget: Widget, event: 'onClick' | 'onChange') => {
    for (const action of widget.actions.filter((item) => item.event === event)) {
      runAction(action)
    }
    if (widget.actions.some((item) => item.event === event)) {
      onNotify(`${widget.name} · ${widget.actions.find((item) => item.event === event)?.handlerName || 'action'}`)
    }
  }

  const runAction = (action: WidgetAction) => {
    switch (action.kind) {
      case 'message': onNotify(action.value || 'Action triggered'); break
      case 'navigate': onNotify(`Navigate to ${action.value || 'next screen'}`); break
      case 'custom': break
      case 'setText':
        if (action.targetId) {
          const target = page.widgets.find((widget) => widget.id === action.targetId)
          if (target?.type === 'text') {
            // Text values stay immutable in the design model; previewing this action is communicated below.
            onNotify(`${target.name} → ${action.value}`)
          } else {
            setPreviewValues((values) => ({ ...values, [action.targetId!]: action.value }))
          }
        }
        break
      case 'toggle':
        if (action.targetId) {
          setHidden((current) => {
            const next = new Set(current)
            if (next.has(action.targetId!)) next.delete(action.targetId!)
            else next.add(action.targetId!)
            return next
          })
        }
        break
    }
  }

  const pointerDown = (event: React.PointerEvent, widget: Widget, mode: 'move' | 'resize' = 'move', corner: DragState['corner'] = 'se') => {
    if (preview || widget.locked || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    onSelect(widget.id)
    setGuides({ vertical: false, horizontal: false })
    dragRef.current = { id: widget.id, startX: event.clientX, startY: event.clientY, originX: widget.x, originY: widget.y, originWidth: widget.width, originHeight: widget.height, mode, corner }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const pointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = (event.clientX - drag.startX) / scale
    const dy = (event.clientY - drag.startY) / scale
    if (drag.mode === 'move') {
      const snapDistance = 8 / scale
      const centerX = (page.width - drag.originWidth) / 2
      const centerY = (page.height - drag.originHeight) / 2
      const rawX = drag.originX + dx
      const rawY = drag.originY + dy
      const vertical = Math.abs(rawX - centerX) <= snapDistance
      const horizontal = Math.abs(rawY - centerY) <= snapDistance
      const x = vertical ? centerX : rawX
      const y = horizontal ? centerY : rawY
      setGuides({ vertical, horizontal })
      onMove(drag.id, Math.round(Math.max(0, Math.min(page.width - 8, x))), Math.round(Math.max(0, Math.min(page.height - 8, y))))
      return
    }
    setGuides({ vertical: false, horizontal: false })
    let x = drag.originX
    let y = drag.originY
    let width = drag.originWidth
    let height = drag.originHeight
    if (drag.corner.includes('e')) width = drag.originWidth + dx
    if (drag.corner.includes('s')) height = drag.originHeight + dy
    if (drag.corner.includes('w')) { x = drag.originX + dx; width = drag.originWidth - dx }
    if (drag.corner.includes('n')) { y = drag.originY + dy; height = drag.originHeight - dy }
    if (x < 0) { width += x; x = 0 }
    if (y < 0) { height += y; y = 0 }
    // Keep the opposite edge fixed when the minimum size clamps a west/north resize.
    if (width < 8) { if (drag.corner.includes('w')) x += width - 8; width = 8 }
    if (height < 8) { if (drag.corner.includes('n')) y += height - 8; height = 8 }
    onResize(drag.id, Math.round(x), Math.round(y), Math.round(width), Math.round(height))
  }

  const pointerUp = () => {
    dragRef.current = null
    setGuides({ vertical: false, horizontal: false })
  }

  const drop = (event: React.DragEvent) => {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/x-rustform-widget') as WidgetType
    if (!type || !screenRef.current) return
    const rect = screenRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.round((event.clientX - rect.left) / scale) - 60)
    const y = Math.max(0, Math.round((event.clientY - rect.top) / scale) - 20)
    onDropWidget(type, Math.min(x, page.width - 80), Math.min(y, page.height - 24))
  }

  return (
    <div className="canvas-stage" style={{ width: page.width * scale, height: page.height * scale }}>
      <div
        ref={screenRef}
        className={`design-canvas ${preview ? 'is-preview' : ''}`}
        style={{ width: page.width, height: page.height, background: page.background, transform: `scale(${scale})` }}
        onPointerDown={(event) => { if (event.target === event.currentTarget) onSelect(null) }}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }}
        onDrop={drop}
      >
        {page.widgets.length === 0 && (
          <div className="empty-canvas">
            <span><MousePointer2 size={22} /></span>
            <strong>Start building your interface</strong>
            <p>Drag a component here, or choose one from the library.</p>
          </div>
        )}
        {page.widgets.map((widget, index) => (
          <div
            key={widget.id}
            className={`canvas-widget widget-${widget.type} ${selectedId === widget.id && !preview ? 'is-selected' : ''} ${widget.locked ? 'is-locked' : ''}`}
            style={{ left: widget.x, top: widget.y, width: widget.width, height: widget.height, opacity: widget.opacity / 100, display: widget.visible && !hidden.has(widget.id) ? undefined : 'none', zIndex: index + 1 }}
            onPointerDown={(event) => pointerDown(event, widget)}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
            onClick={(event) => {
              event.stopPropagation()
              if (preview && widget.type === 'button') runActions(widget, 'onClick')
              else if (!preview) onSelect(widget.id)
            }}
            title={preview ? '' : widget.name}
          >
            <WidgetContent
              widget={widget}
              preview={preview}
              value={previewValues[widget.id]}
              onValueChange={(value) => {
                setPreviewValues((values) => ({ ...values, [widget.id]: value }))
                runActions(widget, 'onChange')
              }}
            />
            {selectedId === widget.id && !preview && (
              <>
                <span className="selection-label">{widget.name}{widget.locked && <Lock size={9} />}</span>
                <i className="resize-edge edge-n" onPointerDown={(event) => pointerDown(event, widget, 'resize', 'n')} />
                <i className="resize-edge edge-e" onPointerDown={(event) => pointerDown(event, widget, 'resize', 'e')} />
                <i className="resize-edge edge-s" onPointerDown={(event) => pointerDown(event, widget, 'resize', 's')} />
                <i className="resize-edge edge-w" onPointerDown={(event) => pointerDown(event, widget, 'resize', 'w')} />
                <i className="resize-handle handle-nw" onPointerDown={(event) => pointerDown(event, widget, 'resize', 'nw')} />
                <i className="resize-handle handle-ne" onPointerDown={(event) => pointerDown(event, widget, 'resize', 'ne')} />
                <i className="resize-handle handle-sw" onPointerDown={(event) => pointerDown(event, widget, 'resize', 'sw')} />
                <i className="resize-handle handle-se" onPointerDown={(event) => pointerDown(event, widget, 'resize', 'se')} />
                <span className="widget-dimensions">{Math.round(widget.width)} × {Math.round(widget.height)}</span>
              </>
            )}
          </div>
        ))}
        {!preview && guides.vertical && <div className="snap-guide snap-guide-v"><span>center</span></div>}
        {!preview && guides.horizontal && <div className="snap-guide snap-guide-h"><span>center</span></div>}
      </div>
    </div>
  )
}

function WidgetContent({ widget, preview, value, onValueChange }: {
  widget: Widget
  preview: boolean
  value: string | boolean | undefined
  onValueChange: (value: string | boolean) => void
}) {
  const textStyle = { color: widget.color, fontSize: widget.fontSize, fontWeight: widget.fontWeight }
  switch (widget.type) {
    case 'text':
      return <div className="rendered-text" style={textStyle}>{widget.text}</div>
    case 'input':
      return <input
        className="rendered-input"
        style={{ ...textStyle, background: widget.background, borderRadius: widget.borderRadius }}
        type={widget.inputType}
        placeholder={widget.placeholder}
        value={typeof value === 'string' ? value : ''}
        readOnly={!preview}
        onChange={(event) => onValueChange(event.target.value)}
        tabIndex={preview ? 0 : -1}
      />
    case 'button':
      return <button className="rendered-button" style={{ ...textStyle, background: widget.background, borderRadius: widget.borderRadius }} tabIndex={preview ? 0 : -1}>{widget.text}</button>
    case 'checkbox':
      return <label className="rendered-checkbox" style={textStyle}>
        <input type="checkbox" checked={Boolean(value)} readOnly={!preview} onChange={(event) => onValueChange(event.target.checked)} tabIndex={preview ? 0 : -1} />
        <span className="fake-checkbox">{Boolean(value) && '✓'}</span>
        <span>{widget.text}</span>
      </label>
    case 'slider': {
      const sliderValue = typeof value === 'number' ? value : typeof value === 'string' && value !== '' ? Number(value) : 50
      return <div className="rendered-slider"><input type="range" min="0" max="100" value={sliderValue} readOnly={!preview} onChange={(event) => onValueChange(event.target.value)} /><span>{sliderValue}</span></div>
    }
    case 'container':
      return <div className="rendered-container" style={{ background: widget.background, borderRadius: widget.borderRadius }} />
    case 'image':
      return <div className="rendered-image" style={{ background: widget.background, borderRadius: widget.borderRadius }}><ImageIcon size={24} /><span>Image</span></div>
    case 'divider':
      return <div className="rendered-divider" style={{ background: widget.background }} />
  }
}
