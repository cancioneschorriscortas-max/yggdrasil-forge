// ── A proba de agnosticismo (17.0) ──
// O core non sabe que React existe — proba: este ficheiro.
// Só @yggdrasil-forge/core e o DOM a pelo: cargar un documento da
// galería, preguntar canUnlock, chamar unlock e pintar estados.

import { TreeEngine } from '@yggdrasil-forge/core'
import doc from '../gallery/panadeiro.json'

const engine = new TreeEngine(doc.tree, { locale: 'gl' })
const app = document.querySelector('#app')

// As labels son dato plano ({ gl, en, … }) — resólvense sen librería.
const gl = (label) => (typeof label === 'string' ? label : (label?.gl ?? label?.en ?? ''))

function paint() {
  const budget = engine.getBudget()
  app.replaceChildren()

  const title = document.createElement('h1')
  title.textContent = gl(doc.tree.label)
  const resources = document.createElement('p')
  for (const r of doc.tree.resources ?? []) {
    resources.append(`${gl(r.label)}: ${budget.resources[r.id] ?? 0} `)
    const grant = document.createElement('button')
    grant.textContent = `+1 ${gl(r.label)}`
    grant.style.display = 'inline'
    grant.style.width = 'auto'
    grant.addEventListener('click', () => engine.grantResource(r.id, 1))
    resources.append(grant)
  }
  app.append(title, resources)

  for (const node of doc.tree.nodes) {
    const state = engine.getNodeState(node.id)?.state ?? 'locked'
    const check = engine.canUnlock(node.id)
    const allowed = check.ok && check.value.allowed

    const button = document.createElement('button')
    button.dataset.state = state
    button.disabled = !allowed
    button.textContent = `${gl(node.label)} — ${state}`
    if (check.ok && check.value.reason) {
      const why = document.createElement('small')
      why.textContent = ` (${gl(check.value.reason)})`
      button.append(why)
    }
    button.addEventListener('click', () => engine.unlock(node.id))
    app.append(button)
  }
}

engine.subscribe(paint)
paint()
