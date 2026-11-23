import { useState } from 'react'
import { ArrowRight, Box, Check, CheckCircle2, ChevronRight, CodeXml, Layers3, X } from 'lucide-react'
import { BACKENDS } from '../data'
import type { BackendId, Project } from '../types'

const ecosystem = [
  { group: 'Immediate & reactive', items: ['egui', 'iced', 'Xilem', 'KAS', 'Vizia', 'Azul'] },
  { group: 'Declarative & cross-platform', items: ['Slint', 'Dioxus', 'Freya', 'Makepad', 'Tauri'] },
  { group: 'Native toolkits & bindings', items: ['gtk4-rs', 'Relm4', 'fltk-rs', 'CXX-Qt'] },
]

export default function BackendModal({ project, onSelect, onClose }: { project: Project; onSelect: (backend: BackendId) => void; onClose: () => void }) {
  const [tab, setTab] = useState<'generator' | 'ecosystem'>('generator')
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="backend-modal" role="dialog" aria-modal="true" aria-label="Choose Rust GUI backend">
      <header className="backend-modal-header">
        <div><div className="eyebrow"><CodeXml size={13} />UNIVERSAL PROJECT MODEL</div><h2>One design. Your favorite Rust GUI.</h2><p>Choose a generator for this screen. Your widgets and interactions stay in the project.</p></div>
        <button className="icon-button" onClick={onClose}><X size={20} /></button>
      </header>
      <div className="backend-tabs"><button className={tab === 'generator' ? 'active' : ''} onClick={() => setTab('generator')}><Box size={14} />Code generators<span>6</span></button><button className={tab === 'ecosystem' ? 'active' : ''} onClick={() => setTab('ecosystem')}><Layers3 size={14} />Ecosystem map</button></div>
      {tab === 'generator' ? <div className="backend-grid">
        {BACKENDS.map((backend) => {
          const selected = backend.id === project.backend
          return <button key={backend.id} className={`backend-card ${selected ? 'selected' : ''}`} onClick={() => { onSelect(backend.id); onClose() }}>
            <div className="backend-card-top"><span className={`backend-logo backend-${backend.id}`} style={{ '--backend-color': backend.color } as React.CSSProperties}>{backend.id === 'gtk4' ? 'GTK' : backend.id === 'fltk' ? 'F' : backend.name.charAt(0)}</span><span className="backend-version">v{backend.version}</span>{selected && <span className="backend-check"><Check size={12} /></span>}</div>
            <strong>{backend.name}</strong><p>{backend.description}</p>
            <div className="backend-tags">{backend.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
            <div className="backend-card-footer"><code>{backend.language}</code><span>{selected ? 'Current backend' : 'Use backend'}{!selected && <ArrowRight size={12} />}</span></div>
          </button>
        })}
      </div> : <div className="ecosystem-list">
        <div className="ecosystem-note"><CheckCircle2 size={17} /><p><strong>6 adapters are ready to use.</strong> The remaining libraries are mapped for future adapters; they are not represented as working generators yet.</p></div>
        {ecosystem.map(({ group, items }) => <div className="ecosystem-group" key={group}><h3>{group}<span>{items.length}</span></h3><div>{items.map((item) => {
          const supported = BACKENDS.some((backend) => item.toLowerCase().startsWith(backend.name.toLowerCase())) || item === 'gtk4-rs'
          return <span className="ecosystem-item" key={item}><i className={supported ? 'supported' : ''} />{item}<small>{supported ? 'Ready' : 'Planned'}</small><ChevronRight size={12} /></span>
        })}</div></div>)}
      </div>}
      <footer className="backend-modal-footer"><span>Backend adapters share widgets, properties, and actions.</span>{tab === 'generator' ? <button onClick={() => setTab('ecosystem')}>Explore the Rust GUI ecosystem<ArrowRight size={13} /></button> : <button onClick={() => setTab('generator')}>Back to generators<ArrowRight size={13} /></button>}</footer>
    </div>
  </div>
}
