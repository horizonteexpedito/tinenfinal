// Local do arquivo: app/api/subscribe/route.ts

import { NextResponse } from "next/server"

export async function POST(request: Request) {
  // Pega os dados enviados pelo seu formulário (front-end)
  const { userEmail, phoneNumber } = await request.json()

  // Validação simples dos dados recebidos
  if (!userEmail || !phoneNumber) {
    return NextResponse.json({ error: "Email and phone are required" }, { status: 400 })
  }

  // Pega a URL e a Chave da API de variáveis de ambiente (mais seguro!)
  const API_URL = process.env.ACTIVE_CAMPAIGN_API_URL
  const API_TOKEN = process.env.ACTIVE_CAMPAIGN_API_TOKEN
  const TAG_ID = process.env.ACTIVE_CAMPAIGN_TAG_ID

  if (!API_URL || !API_TOKEN || !TAG_ID) {
    console.error("Missing ActiveCampaign environment variables")
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 })
  }

  try {
    // 1. Criar o contato
    const contactResponse = await fetch(`${API_URL}/api/3/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Token": API_TOKEN,
      },
      body: JSON.stringify({
        contact: {
          email: userEmail,
          phone: phoneNumber,
          status: 1,
        },
      }),
    })

    if (!contactResponse.ok) {
      const errorData = await contactResponse.json()
      console.error("ActiveCampaign (Create Contact) Error:", errorData)
      throw new Error("Failed to create contact")
    }

    const contactData = await contactResponse.json()
    const contactId = contactData.contact.id

    // 2. Adicionar a tag ao contato criado
    const tagResponse = await fetch(`${API_URL}/api/3/contactTags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Token": API_TOKEN,
      },
      body: JSON.stringify({
        contactTag: {
          contact: contactId,
          tag: TAG_ID, // Usando o ID da tag da variável de ambiente
        },
      }),
    })

    if (!tagResponse.ok) {
      const errorData = await tagResponse.json()
      console.error("ActiveCampaign (Add Tag) Error:", errorData)
      throw new Error("Failed to add tag")
    }

    // Se tudo deu certo, retorna sucesso
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error in subscribe API route:", error)
    return NextResponse.json({ error: "Could not subscribe user." }, { status: 500 })
  }
}
