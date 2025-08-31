//app/api/process-profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateUserProfile } from "../../utils/groqClient";

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Invalid transcript format" },
        { status: 400 }
      );
    }

    const profile = await generateUserProfile(transcript);

    if (!profile) {
      return NextResponse.json(
        { error: "Failed to generate profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile generation API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
