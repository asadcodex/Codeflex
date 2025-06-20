import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(_request: Request) {
  const apiKey = process.env.SPEECHMATICS_API_KEY;

  if (!apiKey) {
    console.error("SPEECHMATICS_API_KEY is not set in .env.local. Please check your environment file and restart the server.");
    return NextResponse.json(
      { error: 'API key not configured on the server.' },
      { status: 500 }
    );
  }

  const payload = {
    iss: apiKey,
    exp: Math.floor(Date.now() / 1000) + 300,
    claims: {
      sub: "flow-client-demo",
      tier: "on_demand",
      version: "2",
    },
  };

  const secret = apiKey;

  try {
    const token = jwt.sign(payload, secret);
    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error signing JWT:", error);
    return NextResponse.json(
      { error: 'Failed to generate authentication token.' },
      { status: 500 }
    );
  }
}