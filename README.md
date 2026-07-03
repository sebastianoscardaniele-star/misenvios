# Logistica Clean SaaS

Proyecto limpio para una app logistica multi-seller con Next.js + Supabase.

## Instalacion

1. Crear proyecto en Supabase.
2. Ejecutar `supabase/schema.sql` completo en SQL Editor.
3. Copiar `.env.example` a `.env.local` y completar:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
4. Instalar y correr:

```bash
npm install
npm run dev
```

## Primer uso

Al abrir la app por primera vez, si no existe ninguna empresa, aparece el Setup Wizard.
Ese wizard crea:
- Empresa
- Primer seller
- Usuario administrador
- Perfil admin aprobado

Luego los nuevos usuarios se registran como pendientes y el admin debe aprobarlos.

## Flujo operativo

Orden entra por API/importacion/manual -> seller marca Sale a entregar -> estado En camino -> cliente confirma entrega desde link publico.

## Nombres de columnas unificados

Se usa solo ingles para evitar inconsistencias:
- `role`
- `is_active`
- `approval_status`
- `company_id`
- `seller_id`
