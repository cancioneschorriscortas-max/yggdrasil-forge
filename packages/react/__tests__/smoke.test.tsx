import { renderToString } from 'react-dom/server'
// ── INICIO: smoke test para @yggdrasil-forge/react ──
import { describe, expect, it } from 'vitest'
import { VERSION } from '../src/index.js'

describe('@yggdrasil-forge/react — smoke', () => {
  it('exporta VERSION', () => {
    expect(VERSION).toBe('0.0.0')
  })

  it('React 19 está dispoñible (renderToString funciona)', () => {
    // Compoñente trivial usando JSX automatic runtime (cero import React)
    const TrivialComponent = (): JSX.Element => <div>Yggdrasil</div>

    const html = renderToString(<TrivialComponent />)
    expect(html).toBe('<div>Yggdrasil</div>')
  })

  it('renderToString manexa props básicas', () => {
    interface GreetingProps {
      readonly name: string
    }
    const Greeting = ({ name }: GreetingProps): JSX.Element => <span>Ola, {name}</span>

    const html = renderToString(<Greeting name="Yggdrasil" />)
    expect(html).toBe('<span>Ola, <!-- -->Yggdrasil</span>')
  })
})
// ── FIN: smoke test ──
