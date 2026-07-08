import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, mimeType } = await req.json()

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

    const prompt = `Analizá esta factura y extraé los datos en formato JSON.

Instrucciones importantes:
1. Identificá si es un RESTAURANTE (aplica 13% IVA + 10% servicio) o ESTABLECIMIENTO COMERCIAL (solo 13% IVA). Buscá palabras clave como "servicio", "propina", "cover", o si el desglose muestra ambos impuestos.
2. Determiná si los precios listados en la factura son CON o SIN impuestos incluidos.
3. Extraé cada ítem con su descripción, cantidad y precio UNITARIO SIN IMPUESTOS.
4. Verificá que la suma de los ítems × impuestos coincida con el total de la factura. Si no cuadra, revisá si los precios son por unidad o por línea total.
5. Si hay descuentos, notas o ítems que no sean productos/servicios consumibles (como propina automática), indícalo en notes.

Devolvé ÚNICAMENTE este JSON sin ningún texto adicional ni markdown:
{
  "establishment_type": "restaurant" o "store",
  "iv_rate": 13,
  "service_rate": 10 o 0,
  "prices_include_tax": true o false,
  "items": [
    {
      "description": "nombre del ítem",
      "quantity": 2,
      "unit_price": 1500.00
    }
  ],
  "subtotal_detected": 0.00,
  "total_detected": 0.00,
  "notes": "observaciones sobre la factura o advertencias"
}

Reglas:
- unit_price siempre debe ser el precio UNITARIO SIN IMPUESTOS en la moneda de la factura
- Si los precios ya incluyen impuestos, dividí por el factor correspondiente para obtener el precio sin impuestos
- quantity debe ser un número (si dice "2x" o "x2", el quantity es 2)
- Ignorá líneas de impuestos, totales, subtotales — solo ítems consumidos`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType ?? 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic error: ${err}`)
    }

    const data = await response.json()
    const content = data.content?.[0]?.text ?? ''

    // Limpiar markdown por si acaso
    const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(clean)

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('parse-invoice error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
