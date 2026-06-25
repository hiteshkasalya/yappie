import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const totalOnline = await User.countDocuments({ isOnline: true });
    
    const hubs = await User.aggregate([
      { $match: { isOnline: true } },
      { $group: { _id: "$college", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const formattedHubs = hubs.map(h => ({
      college: h._id,
      count: h.count
    }));

    const mitWpuOnline = await User.countDocuments({ isOnline: true, normalizedCollege: "mit-wpu" });
    
    if (!formattedHubs.some(h => h.college.toLowerCase() === "mit-wpu")) {
      formattedHubs.unshift({ college: "MIT-WPU", count: mitWpuOnline });
    } else {
      // If it exists in formatting, make sure we format the casing beautifully
      const index = formattedHubs.findIndex(h => h.college.toLowerCase() === "mit-wpu");
      if (index !== -1) {
        formattedHubs[index].college = "MIT-WPU";
      }
    }

    return Response.json({
      totalOnline,
      hubs: formattedHubs
    });
  } catch (error) {
    console.error("Failed to fetch public stats:", error);
    return Response.json({
      totalOnline: 0,
      hubs: [{ college: "MIT-WPU", count: 0 }]
    });
  }
}
