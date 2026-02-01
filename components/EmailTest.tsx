import React, { useState } from 'react'
import { sendContactEmail, sendNotificationEmail } from '../services/emailService'

export function EmailTest() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string }>({})

  const handleSendContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const response = await sendContactEmail(email, name, message)
    
    setResult({
      success: response.success,
      message: response.success ? 'Email enviado correctamente' : response.error,
    })
    setLoading(false)
  }

  const handleSendNotification = async () => {
    setLoading(true)
    
    const response = await sendNotificationEmail(
      email,
      'Bienvenido a REED',
      'Gracias por registrarte en REED. Estamos emocionados de tenerte con nosotros.'
    )
    
    setResult({
      success: response.success,
      message: response.success ? 'Notificación enviada correctamente' : response.error,
    })
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Prueba de Email</h2>
      
      {result.message && (
        <div
          className={`p-3 rounded mb-4 ${
            result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {result.message}
        </div>
      )}

      <form onSubmit={handleSendContact} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tu Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tu Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Mensaje</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded"
            rows={4}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Enviar Email de Contacto'}
        </button>
      </form>

      <hr className="my-6" />

      <button
        onClick={handleSendNotification}
        disabled={loading || !email}
        className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? 'Enviando...' : 'Enviar Notificación de Bienvenida'}
      </button>
    </div>
  )
}
