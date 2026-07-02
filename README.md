# Logistica Sellers Pro

Aplicacion simple, rapida y escalable para despacho por sellers, tracking publico y confirmacion de entrega por cliente.

## Incluye

- Setup Wizard para crear el primer administrador desde la app.
- Registro de usuarios con estado pendiente.
- Aprobacion/rechazo de usuarios por administrador.
- Asignacion de rol y seller.
- Sellers con API Key.
- Ordenes por seller.
- Carga manual.
- Importacion CSV.
- Edicion y eliminacion logica.
- Boton "Sale a entregar".
- Email log para conectar luego Resend/SendGrid.
- Tracking token por orden.
- SQL corregido, sin columna `status` inexistente.

## Puesta en marcha

### 1. Crear proyecto en Supabase

Crear un proyecto nuevo y copiar:

- Project URL
- anon public key

### 2. Ejecutar schema

Ir a Supabase > SQL Editor y pegar todo el contenido de:

`supabase-schema.sql`

Ejecutar una sola vez.

### 3. Configurar variables

Copiar `.env.example` a `.env` y completar:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
VITE_PUBLIC_APP_URL=http://localhost:5173
```

### 4. Instalar y correr

```bash
npm install
npm run dev
```

### 5. Crear primer administrador

Abrir la app. Si no existe ningun admin, aparece el Setup Wizard.

Completar:

- Empresa
- Nombre administrador
- Email
- Password

El sistema crea:

- Empresa
- Seller principal
- Usuario administrador aprobado

### 6. Crear usuarios nuevos

Desde la pantalla de login, el usuario selecciona "Solicitar nueva cuenta".

La cuenta queda pendiente.

El admin entra en Usuarios y puede:

- Aprobar
- Rechazar
- Cambiar rol
- Asignar seller

## CSV de importacion

Columnas aceptadas:

```csv
order_number,nombre,apellido,email,dni,direccion,producto,operador
1001,Juan,Perez,juan@email.com,12345678,Av Siempre Viva 123,Producto X,Andreani
```

Tambien acepta nombres tecnicos:

```csv
order_number,customer_first_name,customer_last_name,customer_email,customer_dni,customer_address,product_name,logistics_operator
```

## API sugerida

Para una API real en Vercel, crear una funcion serverless que reciba:

`POST /api/orders`

Header:

`x-api-key: API_KEY_DEL_SELLER`

Body:

```json
{
  "order_number": "1001",
  "customer_first_name": "Juan",
  "customer_last_name": "Perez",
  "customer_email": "juan@email.com",
  "customer_dni": "12345678",
  "customer_address": "Av Siempre Viva 123",
  "product_name": "Producto X"
}
```

La funcion debe buscar el seller por `api_key` e insertar la orden con ese `seller_id`.

## Emails

El MVP deja registros en `email_logs` cuando una orden sale a entregar.

Para enviar emails reales conectar Resend o SendGrid desde una serverless function.

## Siguiente mejora recomendada

Crear `/tracking/:token` como pantalla publica real. La base ya genera `tracking_token` por orden.
