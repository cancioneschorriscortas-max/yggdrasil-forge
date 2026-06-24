# BRIEFING — F11.2b-bis · `list` honra `growOutward`

(Briefing tracked; corpo non incluído aquí — gardado polo Director.)

Sub-fase F11.2b-bis: primeira aplicación dun invariante explícito
do contrato de auto-layout (A.1 `growOutward`) ao motor
`clustered-radial`.

Cambios:

1. **`list` irradia cara afóra**: grupo por riba do centro → cara
   arriba (dir = -1); grupo no centro ou por baixo → cara abaixo
   (dir = +1). A columna nunca se achega ao centro.
2. **Elimina `effGroupRadius` + `centerClearance`**: o corrective
   queda obsoleto polo invariante. Demostración do contrato:
   honrar `growOutward` quita a corrección.
3. `'fan'` (default) intacto — regresión cero.
4. `'cluster'` segue diferido.

Cero renderer, cero exemplos.
