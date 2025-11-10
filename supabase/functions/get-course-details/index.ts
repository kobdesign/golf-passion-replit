import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

const GOLF_COURSE_API_KEY = Deno.env.get("GOLF_COURSE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const { courseId, golfCourseApiId } = await req.json();

    if (!courseId && !golfCourseApiId) {
      throw new Error("Either courseId or golfCourseApiId is required");
    }

    if (!GOLF_COURSE_API_KEY) {
      throw new Error("GOLF_COURSE_API_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // If we have internal courseId, get the golf_course_api_id
    let apiId = golfCourseApiId;
    if (courseId && !apiId) {
      const { data: course } = await supabase
        .from("courses")
        .select("golf_course_api_id")
        .eq("id", courseId)
        .single();

      apiId = course?.golf_course_api_id;
    }

    if (!apiId) {
      throw new Error("Course not found or not linked to Golf Course API");
    }

    console.log(`Fetching details for course API ID: ${apiId}`);

    // Fetch detailed course data from Golf Course API
    const apiResponse = await fetch(
      `https://api.golfcourseapi.com/v1/courses/${apiId}`,
      {
        headers: {
          Authorization: `Key ${GOLF_COURSE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("Golf Course API error:", errorText);
      throw new Error(`Golf Course API error: ${apiResponse.status}`);
    }

    const raw = await apiResponse.json();
    const details: any = raw?.course ?? raw?.data ?? raw ?? {};
    const courseName = details.club_name || details.course_name || "Unknown";
    console.log(`Fetched details for: ${courseName}`);

    // Update course in database with latest data
    if (courseId) {
      const locationData = details.location || {};
      const address = locationData.address || "";
      const addressParts = address.split(",");
      const location = addressParts.length > 1 
        ? `${addressParts[addressParts.length - 2]?.trim()}, ${addressParts[addressParts.length - 1]?.trim()}`
        : address;

      // Calculate total par from tee boxes
      let totalPar = 72;
      const teeBoxes = details.female || details.male || [];
      if (teeBoxes.length > 0 && teeBoxes[0].holes) {
        totalPar = teeBoxes[0].holes.reduce((sum: number, hole: any) => sum + (hole.par || 0), 0);
      }

      await supabase
        .from("courses")
        .update({
          name: courseName,
          location: location,
          address: address,
          latitude: (locationData as any).latitude,
          longitude: (locationData as any).longitude,
          total_holes: 18,
          total_par: totalPar,
          course_data: details,
        })
        .eq("id", courseId);

      // Update holes data from tee boxes
      if (teeBoxes.length > 0 && teeBoxes[0].holes) {
        const holes = teeBoxes[0].holes;
        for (let i = 0; i < holes.length; i++) {
          const hole = holes[i];
          await supabase.from("holes").upsert(
            {
              course_id: courseId,
              hole_number: i + 1,
              par: hole.par,
              distance_yards: hole.yardage,
              handicap_index: hole.handicap,
              tee_latitude: null,
              tee_longitude: null,
              pin_latitude: null,
              pin_longitude: null,
            },
            { onConflict: "course_id,hole_number" }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        course: details,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in get-course-details function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
