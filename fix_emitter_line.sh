#!/usr/bin/env bash
set -e
 
python3 -c "
path = 'packages/core/src/engine/EventEmitter.ts'
old = '        ;(handler as (...a: Parameters<EventMap[K]>) => void)(...args)'
new = '        ;(handler as unknown as (...a: Parameters<EventMap[K]>) => void)(...args)'
text = open(path, encoding='utf-8').read()
assert old in text, 'ERRO: texto non atopado'
open(path, 'w', encoding='utf-8').write(text.replace(old, new, 1))
print('OK')
"