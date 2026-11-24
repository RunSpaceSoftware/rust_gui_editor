import { generateCode } from './codegen.mjs'
const widgets = [
  { id: '2FA code', type: 'input', name: 'x', x: 12.5, y: 10, width: 200, height: 40, fontSize: 13.5, color: '#27272a', background: 'fff', text: 'hi', placeholder: 'p', inputType: 'password', actions: [], visible: false, opacity: 100, locked: false, borderRadius: 4, fontWeight: 400, actionsAll: [] },
  { id: 'btn', type: 'button', name: 'b', x: 0, y: 0, width: 100, height: 40, fontSize: 13, color: '#ffffff', background: 'red', text: 'Go', placeholder: '', inputType: 'text', actions: [{ id: 'a', event: 'onClick', kind: 'setText', value: 'x', targetId: '2FA code' }], visible: true, opacity: 100, locked: false, borderRadius: 4, fontWeight: 600 },
  { id: 'sl', type: 'slider', name: 's', x: 0, y: 0, width: 100, height: 20, fontSize: 13, color: '#ffffff', background: '#ffffff', text: '', placeholder: '', inputType: 'text', actions: [], visible: true, opacity: 100, locked: false, borderRadius: 0, fontWeight: 400 },
]
const project = { name: 'p', backend: process.argv[2], screenName: 'Main', width: 560, height: 440, background: '#f4f4f5', widgets }
const page = { id: 'pg', name: 'Main', width: 560, height: 440, background: '#f4f4f5', widgets }
const proj = { name: 'p', backend: process.argv[2], pages: [page], activePageId: 'pg' }
console.log(generateCode(proj))
