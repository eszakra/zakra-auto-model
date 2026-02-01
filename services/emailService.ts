import { supabase } from './supabaseClient'

export interface EmailData {
  to: string
  subject: string
  text?: string
  html?: string
}

export async function sendEmail(emailData: EmailData): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: emailData,
    })

    if (error) {
      console.error('Error invoking send-email function:', error)
      return { success: false, error: error.message }
    }

    return data
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error: error.message }
  }
}

// Función de ayuda para enviar emails de contacto
export async function sendContactEmail(
  userEmail: string,
  userName: string,
  message: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  return sendEmail({
    to: 'contact.zakra@gmail.com', // Tu email de contacto
    subject: `Nuevo mensaje de contacto de ${userName}`,
    html: `
      <h2>Nuevo mensaje de contacto</h2>
      <p><strong>De:</strong> ${userName} (${userEmail})</p>
      <p><strong>Mensaje:</strong></p>
      <p>${message}</p>
    `,
    text: `Nuevo mensaje de contacto\n\nDe: ${userName} (${userEmail})\n\nMensaje:\n${message}`,
  })
}

// Función de ayuda para enviar notificaciones a usuarios
export async function sendNotificationEmail(
  userEmail: string,
  subject: string,
  message: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  return sendEmail({
    to: userEmail,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0;">REED</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Model Customization</p>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">${subject}</h2>
          <p style="color: #4b5563; line-height: 1.6;">${message}</p>
        </div>
        <div style="padding: 20px; text-align: center; background: #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>Este es un email automático de REED. Por favor no respondas a este mensaje.</p>
          <p>© 2026 REED. Todos los derechos reservados.</p>
        </div>
      </div>
    `,
    text: `${subject}\n\n${message}\n\n---\nEste es un email automático de REED. Por favor no respondas a este mensaje.\n© 2026 REED`,
  })
}
