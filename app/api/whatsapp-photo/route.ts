import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const fallbackPayload = {
    success: true,
    result:
      "https://media.istockphoto.com/id/1337144146/vector/default-avatar-profile-icon-vector.jpg?s=612x612&w=0&k=20&c=BIbFwuv7FxTWvh5S3vB6bkT0Qv8Vn8N5Ffseq84ClGI=",
    is_photo_private: true,
  }

  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      )
    }

    // --- THIS IS THE CRITICAL FIX ---
    // Remove the old logic that incorrectly added "55".
    // We now trust the frontend to send the full, correct number.
    const fullNumber = String(phone).replace(/[^0-9]/g, "")

    if (fullNumber.length < 10) {
      return NextResponse.json(
        { success: false, error: "Invalid or too short phone number" },
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      )
    }
    // --- END OF FIX ---

    const response = await fetch(
      `https://primary-production-aac6.up.railway.app/webhook/request_photo?tel=${fullNumber}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Origin: "https://whatspy.chat",
        },
        signal: AbortSignal.timeout?.(10_000),
      },
    )

    if (!response.ok) {
      console.error("External API returned status:", response.status)
      return NextResponse.json(fallbackPayload, {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    }

    const data = await response.json()

    const isPhotoPrivate = !data?.link || data.link.includes("no-user-image-icon")

    return NextResponse.json(
      {
        success: true,
        result: isPhotoPrivate ? fallbackPayload.result : data.link,
        is_photo_private: isPhotoPrivate,
      },
      {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      },
    )
  } catch (err) {
    console.error("Error in WhatsApp webhook:", err)
    return NextResponse.json(fallbackPayload, {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    })
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
  })
}
