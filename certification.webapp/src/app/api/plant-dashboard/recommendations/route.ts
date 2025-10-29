import { NextRequest, NextResponse } from "next/server";
import { RecommendationService } from "@/services/plant-dashboard/recommendations/recommendationService";

export async function GET(req: NextRequest) {
  try {
    const recommendations = await RecommendationService.getRecommendationsByPlant(req);
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
