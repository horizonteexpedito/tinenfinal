import { type NextRequest, NextResponse } from "next/server";

// JSON-default de retorno em caso de falha da API externa ou foto privada
const fallbackPayload = {
  success: true,
  result:
    "https://media.istockphoto.com/id/1337144146/vector/default-avatar-profile-icon-vector.jpg?s=612x612&w=0&k=20&c=BIbFwuv7FxTWvh5S3vB6bkT0Qv8Vn8N5Ffseq84ClGI=",
  is_photo_private: true,
};

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Número de telefone é obrigatório" },
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      );
    }

    // Pega a chave da API das variáveis de ambiente
    const apiKey = process.env.RAPIDAPI_KEY;

    if (!apiKey) {
      console.error("A chave da RapidAPI não foi configurada nas variáveis de ambiente.");
      // Retorna o fallback para não expor erros internos do servidor
      return NextResponse.json(fallbackPayload, {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    // --- Lógica mantida para limpar e formatar o número ---
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    let fullNumber = cleanPhone;
    if (!cleanPhone.startsWith("55") && cleanPhone.length >= 11) { // Lógica aprimorada
      fullNumber = "55" + cleanPhone;
    }
    // --------------------------------------------------------

    // --- NOVA CHAMADA PARA A API (RapidAPI) ---
    const url = `https://whatsapp-profile-picture-api.p.rapidapi.com/user-profile-picture?number=${fullNumber}`;
    const options = {
      method: "GET",
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "whatsapp-profile-picture-api.p.rapidapi.com",
      },
      // timeout de 10 s
      signal: AbortSignal.timeout?.(10_000),
    };

    const response = await fetch(url, options);
    // --------------------------------------------------

    if (!response.ok) {
      console.error("RapidAPI retornou status:", response.status);
      return NextResponse.json(fallbackPayload, {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const data = await response.json();

    // Verifica se a API encontrou uma foto válida
    // A resposta pode variar, ajuste data.exists e data.profile_picture_url se necessário
    const hasPhoto = data?.exists === true && data?.profile_picture_url;
    const isPhotoPrivate = !hasPhoto;

    return NextResponse.json(
      {
        success: true,
        result: isPhotoPrivate ? fallbackPayload.result : data.profile_picture_url,
        is_photo_private: isPhotoPrivate,
      },
      {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      },
    );
  } catch (err) {
    console.error("Erro no webhook WhatsApp (RapidAPI):", err);
    // Em qualquer erro, devolvemos o fallback para garantir a estabilidade do front-end
    return NextResponse.json(fallbackPayload, {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
