# URLs de complemento por Control

El mismo deployment sirve al Central y a los Controles hijos.

## Central
`https://TU-DOMINIO.vercel.app/mcp`

## Negocios
- LINK Empresa: `https://TU-DOMINIO.vercel.app/c/link_empresa/mcp`
- Lama Travelers: `https://TU-DOMINIO.vercel.app/c/lama/mcp`
- Hotel Experience: `https://TU-DOMINIO.vercel.app/c/hotel_experience/mcp`
- LINK Cupones: `https://TU-DOMINIO.vercel.app/c/link_cupones/mcp`

La URL define un scope inicial, pero **no es autenticación**. Antes de usar datos privados, el servidor debe autenticar al usuario y comprobar que su `control_membership` autoriza ese scope.

Esto permite que cada cliente agregue a su ChatGPT el complemento de su negocio sin recibir acceso a LINK CONTROL CENTRAL ni a otros negocios.
