// Local do arquivo: app/api/subscribe/route.ts (Versão Final e Robusta)

import { NextResponse } from "next/server"

// Função auxiliar para encontrar um contato existente pelo e-mail
async function findContactByEmail(email: string, apiUrl: string, apiToken: string) {
  const url = `${apiUrl}/api/3/contacts?email=${encodeURIComponent(email)}`
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Api-Token": apiToken,
    },
  })
  if (!response.ok) {
    return null
  }
  const data = await response.json()
  // Retorna o primeiro contato encontrado ou null se não houver nenhum
  return data.contacts && data.contacts.length > 0 ? data.contacts[0] : null
}

export async function POST(request: Request) {
  try {
    const { userEmail, phoneNumber } = await request.json()

    if (!userEmail || !phoneNumber) {
      return NextResponse.json({ error: "Email and phone are required" }, { status: 400 })
    }

    const API_URL = process.env.ACTIVE_CAMPAIGN_API_URL!
    const API_TOKEN = process.env.ACTIVE_CAMPAIGN_API_TOKEN!
    const TAG_ID = process.env.ACTIVE_CAMPAIGN_TAG_ID!

    if (!API_URL || !API_TOKEN || !TAG_ID) {
      console.error("Missing ActiveCampaign environment variables")
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 })
    }

    let contactId: string

    // 1. Tentar criar o contato
    const createContactResponse = await fetch(`${API_URL}/api/3/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Token": API_TOKEN,
      },
      body: JSON.stringify({
        contact: {
          email: userEmail,
          phone: phoneNumber,
          status: 1, // 1 = subscribed
        },
      }),
    })

    const responseData = await createContactResponse.json()

    // 2. Lidar com a resposta
    if (createContactResponse.ok) {
      // Contato criado com sucesso
      contactId = responseData.contact.id
      console.log(`✅ Contato novo criado com sucesso. ID: ${contactId}`)
    } else if (createContactResponse.status === 422) {
      // Contato já existe. Vamos encontrá-lo para pegar o ID.
      console.warn("⚠️ Contato com este e-mail já existe. Tentando encontrar o ID...")
      const existingContact = await findContactByEmail(userEmail, API_URL, API_TOKEN)
      if (existingContact) {
        contactId = existingContact.id
        console.log(`✅ Contato existente encontrado. ID: ${contactId}`)
      } else {
        // Isso é raro, mas pode acontecer se a API retornar 422 por outro motivo
        console.error("❌ Erro 422, mas não foi possível encontrar o contato existente.", responseData)
        throw new Error("Unprocessable entity, but could not find existing contact.")
      }
    } else {
      // Outro tipo de erro (ex: 401, 403, 500)
      console.error("❌ Erro ao criar contato no ActiveCampaign:", {
        status: createContactResponse.status,
        body: responseData,
      })
      throw new Error(`Failed to create or find contact. Status: ${createContactResponse.status}`)
    }

    // 3. Adicionar a tag ao contato (seja ele novo ou existente)
    console.log(`🚀 Adicionando TAG ID ${TAG_ID} ao CONTATO ID ${contactId}...`)
    const tagResponse = await fetch(`${API_URL}/api/3/contactTags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Token": API_TOKEN,
      },
      body: JSON.stringify({
        contactTag: {
          contact: contactId,
          tag: TAG_ID,
        },
      }),
    })

    if (!tagResponse.ok) {
      const tagErrorData = await tagResponse.json()
      console.error("❌ Erro ao adicionar tag no ActiveCampaign:", {
        status: tagResponse.status,
        body: tagErrorData,
      })
      // Não vamos lançar um erro aqui, pois o contato já foi criado/encontrado, o que é o mais importante.
      // Mas logamos o erro para depuração.
    } else {
      console.log("✅ Tag adicionada com sucesso!")
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("🔥 Erro inesperado na rota /api/subscribe:", error)
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 })
  }
}
