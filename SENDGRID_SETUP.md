# Configuración de SendGrid en REED

## Archivos creados:

1. **supabase/functions/send-email/index.ts** - Edge Function de Supabase para enviar emails
2. **services/emailService.ts** - Servicio para llamar a la función desde el frontend
3. **components/EmailTest.tsx** - Componente de ejemplo para probar el envío de emails
4. **.env** - Actualizado con las variables de SendGrid

## Pasos para desplegar:

### 1. Configurar variables de entorno en Supabase

Ve a tu dashboard de Supabase → Project Settings → Secrets y agrega:

```
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@usered.com
```

### 2. Desplegar la Edge Function

```bash
npx supabase functions deploy send-email
```

O si tienes el CLI de Supabase:

```bash
supabase functions deploy send-email
```

### 3. Probar el envío de emails

Puedes usar el componente `EmailTest` importándolo en cualquier página:

```tsx
import { EmailTest } from './components/EmailTest'

function App() {
  return (
    <div>
      <EmailTest />
    </div>
  )
}
```

### 4. Uso en tu código

```tsx
import { sendContactEmail, sendNotificationEmail } from './services/emailService'

// Enviar email de contacto
await sendContactEmail('usuario@email.com', 'Juan', 'Hola, tengo una pregunta')

// Enviar notificación
await sendNotificationEmail(
  'usuario@email.com',
  'Bienvenido a REED',
  'Gracias por registrarte'
)
```

## Funciones disponibles:

- `sendEmail({ to, subject, text, html })` - Envío genérico
- `sendContactEmail(userEmail, userName, message)` - Email de contacto a tu correo
- `sendNotificationEmail(userEmail, subject, message)` - Notificación al usuario

## Notas:

- La API Key está configurada para usar el dominio noreply@usered.com
- El sender "REED" ya está verificado en SendGrid
- Los emails se envían desde la Edge Function de Supabase (seguro)
