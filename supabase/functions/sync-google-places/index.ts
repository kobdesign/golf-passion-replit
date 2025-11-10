import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
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

    const { query } = await req.json();
    
    if (!query) {
      throw new Error("Search query is required");
    }

    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error("Google Places API key not configured");
    }

    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Searching for golf courses in Thailand: ${query}`);

    // Search for golf courses in Thailand using Text Search
    const searchUrl = `https://places.googleapis.com/v1/places:searchText`;
    const searchResponse = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.photos,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount"
      },
      body: JSON.stringify({
        textQuery: `${query} golf course Thailand`,
        languageCode: "th"
      })
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Google Places API error:", errorText);
      throw new Error(`Google Places API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    console.log(`Found ${searchData.places?.length || 0} courses`);

    let syncedCourses = 0;

    if (searchData.places && searchData.places.length > 0) {
      for (const place of searchData.places) {
        try {
          const photoUrl = place.photos?.[0]
            ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=1200&key=${GOOGLE_PLACES_API_KEY}`
            : null;

          // Check if course already exists
          const { data: existingCourse } = await supabase
            .from("courses")
            .select("id")
            .eq("google_place_id", place.id)
            .maybeSingle();

          const courseData = {
            name: place.displayName?.text || "Unknown Course",
            location: place.formattedAddress || null,
            address: place.formattedAddress || null,
            latitude: place.location?.latitude || null,
            longitude: place.location?.longitude || null,
            image_url: photoUrl,
            google_place_id: place.id,
            total_par: 72, // Default, admin can update
            total_holes: 18, // Default, admin can update
            course_data: {
              phone: place.internationalPhoneNumber,
              website: place.websiteUri,
              rating: place.rating,
              userRatingCount: place.userRatingCount,
            }
          };

          if (existingCourse) {
            // Update existing course
            const { error: updateError } = await supabase
              .from("courses")
              .update(courseData)
              .eq("id", existingCourse.id);

            if (updateError) {
              console.error(`Error updating course ${place.displayName?.text}:`, updateError);
            } else {
              console.log(`Updated course: ${place.displayName?.text}`);
              syncedCourses++;
            }
          } else {
            // Insert new course
            const { error: insertError } = await supabase
              .from("courses")
              .insert(courseData);

            if (insertError) {
              console.error(`Error inserting course ${place.displayName?.text}:`, insertError);
            } else {
              console.log(`Inserted course: ${place.displayName?.text}`);
              syncedCourses++;
            }
          }
        } catch (error) {
          console.error(`Error processing course ${place.displayName?.text}:`, error);
        }
      }
    }

    console.log(`Sync completed: ${syncedCourses} courses`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: {
          courses: syncedCourses,
        },
        message: `Successfully synced ${syncedCourses} golf courses from Thailand`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in sync-google-places function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
