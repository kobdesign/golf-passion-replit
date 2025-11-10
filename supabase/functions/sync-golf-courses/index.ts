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

interface GolfCourseApiCourse {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  website: string;
  latitude: number;
  longitude: number;
  numberOfHoles: number;
  holes?: Array<{
    holeNumber: number;
    par: number;
    yardage: number;
    handicap: number;
    tee?: { latitude: number; longitude: number };
    pin?: { latitude: number; longitude: number };
    coordinates?: any;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const authClient = createClient(SUPABASE_URL, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: isAdmin, error: roleError } = await authClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin"
    });

    if (roleError || !isAdmin) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting golf course sync...");

    if (!GOLF_COURSE_API_KEY) {
      throw new Error("GOLF_COURSE_API_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get request parameters
    const { searchQuery } = await req.json().catch(() => ({}));

    if (!searchQuery) {
      throw new Error("searchQuery is required");
    }

    // Search for courses using Golf Course API
    console.log(`Searching for courses: ${searchQuery}`);
    const searchResponse = await fetch(
      `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(searchQuery)}`,
      {
        headers: {
          Authorization: `Key ${GOLF_COURSE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Golf Course API search error:", errorText);
      throw new Error(`Golf Course API error: ${searchResponse.status} - ${errorText}`);
    }

    const searchData = await searchResponse.json();
    const searchResults = searchData.courses || [];
    console.log(`Found ${searchResults.length} courses`);

    if (searchResults.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          synced: { courses: 0, holes: 0 },
          message: "No courses found matching the search query",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const syncedCourses = [];
    const syncedHoles = [];

    // Fetch detailed information for each course
    for (const searchResult of searchResults) {
      console.log(`Fetching details for course ID: ${searchResult.id}`);
      
      const detailResponse = await fetch(
        `https://api.golfcourseapi.com/v1/courses/${searchResult.id}`,
        {
          headers: {
            Authorization: `Key ${GOLF_COURSE_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!detailResponse.ok) {
        console.error(`Failed to fetch details for course ${searchResult.id}`);
        continue;
      }

      const raw = await detailResponse.json();
      const courseObj: any = raw?.course ?? raw?.data ?? raw ?? {};
      const courseName = courseObj.club_name || courseObj.course_name || "Unknown Course";
      console.log(`Syncing course: ${courseName}`);

      // Extract location data
      const locationData = courseObj.location || {};
      const address = locationData.address || "";
      
      // Parse address to get city/state if available
      const addressParts = address.split(",");
      const location = addressParts.length > 1 
        ? `${addressParts[addressParts.length - 2]?.trim()}, ${addressParts[addressParts.length - 1]?.trim()}`
        : address;

      // Calculate total par from tee boxes
      let totalPar = 72; // default
      if (courseObj.female && courseObj.female[0]?.holes) {
        totalPar = courseObj.female[0].holes.reduce((sum: number, hole: any) => sum + (hole.par || 0), 0);
      } else if (courseObj.male && courseObj.male[0]?.holes) {
        totalPar = courseObj.male[0].holes.reduce((sum: number, hole: any) => sum + (hole.par || 0), 0);
      }

      // Insert or update course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .upsert(
          {
            golf_course_api_id: String(courseObj.id ?? searchResult.id),
            name: courseName,
            location: location,
            address: address,
            latitude: (locationData as any).latitude,
            longitude: (locationData as any).longitude,
            total_holes: 18, // Golf Course API typically has 18 holes
            total_par: totalPar,
            course_data: courseObj,
          },
          { onConflict: "golf_course_api_id" }
        )
        .select()
        .single();

      if (courseError) {
        console.error(`Error syncing course ${courseName}:`, courseError);
        continue;
      }

      syncedCourses.push(courseData);

      // Sync holes from tee box data (use first female or male tee box)
      const teeBoxes = courseObj.female || courseObj.male || [];
      if (teeBoxes.length > 0 && teeBoxes[0].holes) {
        const holes = teeBoxes[0].holes;
        console.log(`Syncing ${holes.length} holes for ${courseName}`);

        // Sync holes
        for (let i = 0; i < holes.length; i++) {
          const hole = holes[i];
          const { data: holeData, error: holeError } = await supabase
            .from("holes")
            .upsert(
              {
                course_id: courseData.id,
                hole_number: i + 1,
                par: hole.par,
                distance_yards: hole.yardage,
                handicap_index: hole.handicap,
                // Note: Golf Course API doesn't provide GPS coordinates per hole
                // These would need to be added manually or from another source
                tee_latitude: null,
                tee_longitude: null,
                pin_latitude: null,
                pin_longitude: null,
              },
              { onConflict: "course_id,hole_number" }
            )
            .select();

          if (holeError) {
            console.error(`Error syncing hole ${i + 1}:`, holeError);
          } else {
            syncedHoles.push(...(holeData || []));
          }
        }
      }
    }

    console.log(`Sync completed: ${syncedCourses.length} courses, ${syncedHoles.length} holes`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: {
          courses: syncedCourses.length,
          holes: syncedHoles.length,
        },
        data: {
          courses: syncedCourses,
          holes: syncedHoles,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in sync-golf-courses function:", error);
    return new Response(
      JSON.stringify({ error: error.message, details: error.toString() }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
