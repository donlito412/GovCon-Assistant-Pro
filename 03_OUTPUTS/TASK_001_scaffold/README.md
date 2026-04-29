# GovCon Assistant Pro

Pittsburgh-Area Government Business Intelligence Platform.

## Setup Instructions

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Variables:**
    *   Copy `.env.example` to `.env.local`.
    *   Fill in the required Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
    *   Fill in `ANTHROPIC_API_KEY` for AI features.
    *   Fill in `RESEND_API_KEY` for email features (optional for base setup).

3.  **Database Setup:**
    *   Create a new Supabase project.
    *   Run the SQL script located at `supabase_schema.sql` in the Supabase SQL editor to create the initial database schema.

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```

5.  **Deployment:**
    *   Connect the GitHub repository to Netlify.
    *   Set the Build Command to `npm run build` and the Publish directory to `.next`.
    *   Ensure all environment variables from `.env.local` are added to the Netlify environment variables settings.
