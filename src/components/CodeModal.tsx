import { useMemo, useState } from 'react'
import { Check, Clipboard, Code2, Download, FileCode2, FolderGit2, Info, Package, X } from 'lucide-react'
import { BACKENDS, getActivePage } from '../data'
import { generateCode, generatedFilename } from '../codegen'
import type { Project } from '../types'

export default function CodeModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [tab, setTab] = useState<'source' | 'cargo'>('source')
  const [copied, setCopied] = useState(false)
  const code = useMemo(() => generateCode(project), [project])
  const page = getActivePage(project)
  const sourceFilename = generatedFilename(project)
  const backend = BACKENDS.find((item) => item.id === project.backend)!
  const dependency = backend.id === 'gtk4'
    ? `gtk = { version = "${backend.version}", package = "gtk4" }`
    : backend.id === 'dioxus' ? `dioxus = { version = "${backend.version}", features = ["desktop"] }`
    : `${backend.crate} = "${backend.version}"`
  const cargo = `[package]\nname = "${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'rustform-app'}"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\n${dependency}${backend.id === 'slint' ? '\nslint = "1.9"' : ''}\n`
  const content = tab === 'source' ? code : cargo
  const filename = tab === 'source' ? sourceFilename : 'Cargo.toml'

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="code-modal" role="dialog" aria-modal="true" aria-label="Generated Rust code">
      <header className="code-modal-header">
        <div className="code-title-icon"><Code2 size={22} /></div>
        <div><h2>Your interface, in real code</h2><p>Generated for <strong>{backend.name}</strong> from the <strong>{page.name}</strong> page.</p></div>
        <button className="icon-button" onClick={onClose} title="Close"><X size={19} /></button>
      </header>
      <div className="code-modal-meta"><span className="ready-dot" />Ready to customize<span>·</span><span>{code.split('\n').length} lines</span><span>·</span><span>No runtime dependency on Rustform</span></div>
      <div className="code-tabs">
        <div><button className={tab === 'source' ? 'active' : ''} onClick={() => setTab('source')}><FileCode2 size={14} />{sourceFilename}</button><button className={tab === 'cargo' ? 'active' : ''} onClick={() => setTab('cargo')}><Package size={14} />Cargo.toml</button></div>
        <span><FolderGit2 size={13} />src / {filename}</span>
      </div>
      <div className="code-editor">
        <div className="line-numbers">{content.split('\n').map((_, index) => <span key={index}>{index + 1}</span>)}</div>
        <pre><code>{content}</code></pre>
      </div>
      <div className="code-note"><Info size={15} /><p>{project.backend === 'slint' ? 'Import the .slint file from a Rust binary and connect the generated callbacks to your application logic.' : project.backend === 'iced' ? 'The iced adapter exports a clean vertical layout. Absolute positioning can be customized with iced stack widgets.' : 'Review the generated dependencies and replace placeholder logic with your application state and services.'}</p></div>
      <footer className="code-modal-footer"><span>Made to be read, edited, and owned.</span><div><button className="secondary-button" onClick={copy}>{copied ? <Check size={15} /> : <Clipboard size={15} />}{copied ? 'Copied!' : 'Copy code'}</button><button className="primary-button" onClick={download}><Download size={15} />Download {filename}</button></div></footer>
    </div>
  </div>
}
