# Golf Tracker - Replit Migration

### Overview
The Golf Tracker project is a comprehensive golf tracking application migrated to Replit. It enables users to track golf rounds with GPS mapping, manage courses, engage in a social feed with posts and comments, rate and review courses, bookmark favorites, and view leaderboards and statistics. The application also includes a friend system and notifications, aiming to provide a robust platform for golfers to manage and share their game.

### User Preferences
- **Code Style**: TypeScript, functional components, hooks pattern
- **Optimization Focus**: Mobile performance first
- **Data Strategy**: Custom hooks > service layer for this project size

### System Architecture
The application is built with a **React 18 frontend** using **TypeScript** and **Vite**, styled with **Tailwind CSS** and **shadcn/ui** components. **React Query** manages state. The architecture prioritizes performance with **code splitting** using `React.lazy()` and `Suspense`, manual Rollup chunking for vendor libraries, and optimized `Query Client` settings for `staleTime`, `gcTime`, `refetchOnWindowFocus`, and `retry`.

**Data Fetching Strategy**
- **Custom Hooks**: Preferred over a full repository layer for type-safety, composability, and integration with React Query's caching.
- **Parallel Fetching**: Utilizes `Promise.all` for independent queries to reduce loading times.
- **Batch Operations**: Data is fetched in batches to minimize N+1 query patterns.
- **Optimistic Updates**: Provides immediate UI feedback for mutations.
- **Stale-While-Revalidate**: Displays cached data while fetching fresh information.
- **Centralized Query Keys**: Managed in `src/lib/queryKeys.ts` for type-safe cache invalidation.

**GPS & Location Features** (Nov 2025)
- **Play Page**: Auto-navigates to nearest course on GPS permission grant, 30-second timeout with retry options
- **Courses Page**: Sorts courses by distance from user location, displays distance in km/m on cards
- **Location Library**: `src/lib/geolocation.ts` provides cross-platform GPS with web/mobile fallback
- **Bookmark Filter**: Users can toggle "My Bookmarks" filter while maintaining distance-based sorting
- **GPS Target Line Mode**: Players can switch between Pin Mode (default) and GPS Mode for target line origin
  - Click GPS icon or Pin icon to toggle modes bidirectionally
  - GPS mode activates pulse animation on GPS marker
  - Real-time GPS tracking updates player position every 10 seconds
  - Distance calculations adjust based on active mode (Pin-to-Target vs GPS-to-Target)
  - GPS accuracy display with color-coded indicators (green ≤10m, yellow ≤20m, red >20m)
  - Smooth mode switching with proper event handler cleanup to prevent handler accumulation
  - Both markers recreated on mode change to ensure fresh click handlers with current state

**UI/UX Decisions**
- **Progressive Loading**: Implemented with **skeleton components** (`CourseCardSkeleton`, `PostCardSkeleton`, `ListSkeleton`) to improve perceived performance, especially on mobile.
- **Map Display Optimization**: Default map zoom and pitch are configured for optimal tee-to-pin layout visibility, enhancing the course preview experience. Map rendering issues are addressed with robust error handling and consistent environment variable usage for tokens.

**Technical Implementations**
- **Vite Configuration**: Server bound to `0.0.0.0:5000` with `allowedHosts: true` for Replit compatibility, resolving "Blocked Request" errors.
- **Component Migration**: Key pages leverage custom hooks (`useBookmarks`, `useIsAdmin`, `useSocialFeed`, etc.) to reduce code duplication, improve maintainability, and enhance performance through optimized data fetching.
- **Database Schema**: Managed through Supabase migrations and Management API. Schema changes (e.g., adding columns) are automated via Supabase Management API using `SUPABASE_ACCESS_TOKEN`, eliminating manual migration steps.
- **Recent Schema Updates**: Added `target_latitude` and `target_longitude` columns to `holes` table (Nov 2025) for admin-configured target markers in hole maps.

### External Dependencies
- **Database**: Supabase (PostgreSQL)
- **Maps**: Mapbox GL (requires `VITE_MAPBOX_PUBLIC_TOKEN`)
- **Package Manager**: Bun
- **Frontend Framework**: React 18
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: @tanstack/react-query
- **Environment**: Replit (port 5000)
- **APIs**: Google Places API (for Sync Course functionality, `GOOGLE_PLACES_API_KEY` set in Supabase Dashboard Edge Functions Secrets).