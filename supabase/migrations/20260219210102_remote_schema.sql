


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE OR REPLACE FUNCTION "public"."get_affiliate_source_stats"() RETURNS TABLE("source_page" "text", "click_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ac.source_page,
        COUNT(*) as click_count
    FROM public.affiliate_clicks ac
    GROUP BY ac.source_page
    ORDER BY click_count DESC;
END;
$$;


ALTER FUNCTION "public"."get_affiliate_source_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_indexed_text_ids"() RETURNS TABLE("text_id" "uuid")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT DISTINCT tc.text_id FROM text_chunks tc;
$$;


ALTER FUNCTION "public"."get_indexed_text_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_library_indexing_summary"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total', count(t.id),
    'with_content', count(t.id) FILTER (WHERE t.content IS NOT NULL AND t.content != ''),
    'without_content', count(t.id) FILTER (WHERE t.content IS NULL OR t.content = ''),
    'with_embeddings', (SELECT count(DISTINCT tc.text_id) FROM text_chunks tc),
    'without_embeddings', count(t.id) - (SELECT count(DISTINCT tc.text_id) FROM text_chunks tc)
  ) INTO result
  FROM texts t;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_library_indexing_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_text_chunk_counts"("text_ids" "uuid"[]) RETURNS TABLE("text_id" "uuid", "chunk_count" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT tc.text_id, count(*)
  FROM text_chunks tc
  WHERE tc.text_id = ANY(text_ids)
  GROUP BY tc.text_id;
$$;


ALTER FUNCTION "public"."get_text_chunk_counts"("text_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_affiliate_items"("limit_count" integer DEFAULT 5) RETURNS TABLE("item_title" "text", "click_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ac.item_title,
        COUNT(*) as click_count
    FROM public.affiliate_clicks ac
    GROUP BY ac.item_title
    ORDER BY click_count DESC
    LIMIT limit_count;
END;
$$;


ALTER FUNCTION "public"."get_top_affiliate_items"("limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_users_by_activity"("days" integer DEFAULT 30) RETURNS TABLE("user_id" "uuid", "email" "text", "name" "text", "total_uploads" integer, "total_views" integer, "total_searches" integer, "total_annotations" integer, "total_activity" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        u.name,
        COALESCE(SUM(uas.documents_uploaded), 0)::INT as total_uploads,
        COALESCE(SUM(uas.documents_viewed), 0)::INT as total_views,
        COALESCE(SUM(uas.searches_performed), 0)::INT as total_searches,
        COALESCE(SUM(uas.annotations_created), 0)::INT as total_annotations,
        COALESCE(
            SUM(uas.documents_uploaded) + 
            SUM(uas.documents_viewed) + 
            SUM(uas.searches_performed) + 
            SUM(uas.annotations_created) +
            SUM(uas.bookmarks_created)
        , 0)::INT as total_activity
    FROM users u
    LEFT JOIN user_activity_summary uas ON u.id = uas.user_id
        AND uas.date >= CURRENT_DATE - days
    GROUP BY u.id, u.email, u.name
    HAVING COALESCE(
        SUM(uas.documents_uploaded) + 
        SUM(uas.documents_viewed) + 
        SUM(uas.searches_performed) + 
        SUM(uas.annotations_created) +
        SUM(uas.bookmarks_created)
    , 0) > 0
    ORDER BY total_activity DESC;
END;
$$;


ALTER FUNCTION "public"."get_top_users_by_activity"("days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  existing_admin_role TEXT;
BEGIN
  -- Check if there's an existing admin profile with the same email
  SELECT role INTO existing_admin_role
  FROM public.users
  WHERE email = NEW.email AND role = 'admin'
  LIMIT 1;

  -- If an admin profile exists with this email, create new profile as admin
  -- Otherwise, create as regular user
  INSERT INTO public.users (id, email, name, email_verified, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email_confirmed_at,
    COALESCE(existing_admin_role, 'user'), -- Use 'admin' if found, otherwise 'user'
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = NEW.email,
    email_verified = NEW.email_confirmed_at,
    -- Preserve admin role if it exists, or set to admin if email has admin profile
    role = CASE 
      WHEN public.users.role = 'admin' THEN 'admin' -- Keep existing admin
      WHEN existing_admin_role = 'admin' THEN 'admin' -- Upgrade to admin if email has admin
      ELSE public.users.role -- Keep existing role
    END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_text_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "lens_filter" "text"[] DEFAULT NULL::"text"[], "type_filter" "text"[] DEFAULT NULL::"text"[]) RETURNS TABLE("chunk_id" "uuid", "text_id" "uuid", "content" "text", "chunk_index" integer, "similarity" double precision, "text_title" "text", "text_author" "text", "text_type" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id as chunk_id,
    tc.text_id,
    tc.content,
    tc.chunk_index,
    1 - (tc.embedding <=> query_embedding) AS similarity,
    t.title as text_title,
    t.author as text_author,
    t.document_type as text_type
  FROM text_chunks tc
  JOIN texts t ON tc.text_id = t.id
  WHERE (1 - (tc.embedding <=> query_embedding)) > match_threshold
    AND (lens_filter IS NULL OR t.domain = ANY(lens_filter) OR (t.tags IS NOT NULL AND string_to_array(t.tags, ',') && lens_filter))
    AND (type_filter IS NULL OR t.document_type = ANY(type_filter))
  ORDER BY tc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_text_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "lens_filter" "text"[], "type_filter" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_text_fts"("search_query" "text", "match_count" integer, "lens_filter" "text"[] DEFAULT NULL::"text"[], "type_filter" "text"[] DEFAULT NULL::"text"[]) RETURNS TABLE("chunk_id" "uuid", "text_id" "uuid", "content" "text", "chunk_index" integer, "relevance" double precision, "text_title" "text", "text_author" "text", "text_type" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id as chunk_id,
    tc.text_id,
    tc.content,
    tc.chunk_index,
    ts_rank_cd(to_tsvector('english', tc.content), plainto_tsquery('english', search_query)) AS relevance,
    t.title as text_title,
    t.author as text_author,
    t.document_type as text_type
  FROM text_chunks tc
  JOIN texts t ON tc.text_id = t.id
  WHERE to_tsvector('english', tc.content) @@ plainto_tsquery('english', search_query)
    AND (lens_filter IS NULL OR t.domain = ANY(lens_filter) OR (t.tags IS NOT NULL AND string_to_array(t.tags, ',') && lens_filter))
    AND (type_filter IS NULL OR t.document_type = ANY(type_filter))
  ORDER BY relevance DESC
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_text_fts"("search_query" "text", "match_count" integer, "lens_filter" "text"[], "type_filter" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_courses_click"("p_user_id" "uuid", "p_source" "text" DEFAULT 'unknown'::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update or insert user activity for today
  INSERT INTO user_activity_summary (
    user_id,
    date,
    courses_clicks
  )
  VALUES (
    p_user_id,
    CURRENT_DATE,
    1
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    courses_clicks = user_activity_summary.courses_clicks + 1,
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."track_courses_click"("p_user_id" "uuid", "p_source" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_courses_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_courses_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_daily_usage_summary"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO daily_usage_summary (
        date,
        service,
        total_requests,
        successful_requests,
        failed_requests,
        total_units,
        unit_type,
        total_cost,
        unique_users
    )
    VALUES (
        CURRENT_DATE,
        NEW.service,
        1,
        CASE WHEN NEW.success THEN 1 ELSE 0 END,
        CASE WHEN NEW.success THEN 0 ELSE 1 END,
        NEW.units_used,
        NEW.unit_type,
        NEW.estimated_cost,
        CASE WHEN NEW.user_id IS NOT NULL THEN 1 ELSE 0 END
    )
    ON CONFLICT (date, service) DO UPDATE SET
        total_requests = daily_usage_summary.total_requests + 1,
        successful_requests = daily_usage_summary.successful_requests + CASE WHEN NEW.success THEN 1 ELSE 0 END,
        failed_requests = daily_usage_summary.failed_requests + CASE WHEN NEW.success THEN 0 ELSE 1 END,
        total_units = daily_usage_summary.total_units + NEW.units_used,
        total_cost = daily_usage_summary.total_cost + NEW.estimated_cost,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_daily_usage_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_count" integer DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO user_activity_summary (
        user_id,
        date,
        documents_uploaded,
        documents_viewed,
        searches_performed,
        annotations_created,
        bookmarks_created
    )
    VALUES (
        p_user_id,
        CURRENT_DATE,
        CASE WHEN p_activity_type = 'upload' THEN p_count ELSE 0 END,
        CASE WHEN p_activity_type = 'view' THEN p_count ELSE 0 END,
        CASE WHEN p_activity_type = 'search' THEN p_count ELSE 0 END,
        CASE WHEN p_activity_type = 'annotation' THEN p_count ELSE 0 END,
        CASE WHEN p_activity_type = 'bookmark' THEN p_count ELSE 0 END
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        documents_uploaded = user_activity_summary.documents_uploaded + CASE WHEN p_activity_type = 'upload' THEN p_count ELSE 0 END,
        documents_viewed = user_activity_summary.documents_viewed + CASE WHEN p_activity_type = 'view' THEN p_count ELSE 0 END,
        searches_performed = user_activity_summary.searches_performed + CASE WHEN p_activity_type = 'search' THEN p_count ELSE 0 END,
        annotations_created = user_activity_summary.annotations_created + CASE WHEN p_activity_type = 'annotation' THEN p_count ELSE 0 END,
        bookmarks_created = user_activity_summary.bookmarks_created + CASE WHEN p_activity_type = 'bookmark' THEN p_count ELSE 0 END,
        updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."update_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_count" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."affiliate_clicks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_title" "text" NOT NULL,
    "item_author" "text",
    "source_page" "text",
    "user_id" "uuid",
    "tracking_id" "text" DEFAULT 'converg05f-20'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."affiliate_clicks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "agent_name" "text",
    "action" "text",
    "status" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "agent_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'failure'::"text", 'warning'::"text"])))
);


ALTER TABLE "public"."agent_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_usage" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "service" "text" NOT NULL,
    "endpoint" "text",
    "operation" "text",
    "units_used" numeric DEFAULT 0,
    "unit_type" "text",
    "estimated_cost" numeric(10,6) DEFAULT 0,
    "user_id" "uuid",
    "document_id" "uuid",
    "request_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "success" boolean DEFAULT true,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "api_usage_service_check" CHECK (("service" = ANY (ARRAY['azure_ocr'::"text", 'openai_metadata'::"text", 'r2_storage'::"text", 'r2_bandwidth'::"text", 'convergence_query'::"text", 'notion'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."api_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collection_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "collection_id" "uuid" NOT NULL,
    "text_id" "uuid" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text"
);


ALTER TABLE "public"."collection_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."convergence_concepts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "tradition" "text" NOT NULL,
    "tradition_id" "uuid",
    "era" "text",
    "short_definition" "text",
    "primary_sources" "text"[] DEFAULT '{}'::"text"[],
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."convergence_concepts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."convergence_queries" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "query_text" "text" NOT NULL,
    "lens_weights" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."convergence_queries" OWNER TO "postgres";


COMMENT ON TABLE "public"."convergence_queries" IS 'Tracks user queries for rate limiting (5 free/month, unlimited for premium). One row per user per month with query count.';



CREATE TABLE IF NOT EXISTS "public"."convergence_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_id" "uuid" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "similarity" numeric DEFAULT 0.5 NOT NULL,
    "source_citation" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "convergence_relationships_similarity_check" CHECK ((("similarity" >= (0)::numeric) AND ("similarity" <= (1)::numeric)))
);


ALTER TABLE "public"."convergence_relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."convergence_responses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "query_id" "uuid",
    "query_text" "text" NOT NULL,
    "lens_weights" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "response_text" "text" NOT NULL,
    "sources" "jsonb" DEFAULT '[]'::"jsonb",
    "lenses_used" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."convergence_responses" OWNER TO "postgres";


COMMENT ON TABLE "public"."convergence_responses" IS 'Stores complete conversation history including responses, sources, and lens contributions. Enables conversation continuation.';



CREATE TABLE IF NOT EXISTS "public"."convergence_traditions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "label" "text" NOT NULL,
    "color" "text",
    "icon" "text",
    "description" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."convergence_traditions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."correspondence_entity_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "label" "text" NOT NULL,
    "color" "text",
    "icon" "text",
    "description" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."correspondence_entity_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."correspondence_relationship_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "label" "text" NOT NULL,
    "color" "text",
    "icon" "text",
    "description" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."correspondence_relationship_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."correspondence_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_id" "uuid" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "weight" numeric DEFAULT 0.5 NOT NULL,
    "confidence" "text" DEFAULT 'tradition'::"text" NOT NULL,
    "source_citation" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "relationship_type_id" "uuid",
    CONSTRAINT "correspondence_relationships_confidence_check" CHECK (("confidence" = ANY (ARRAY['established'::"text", 'interpretive'::"text", 'speculative'::"text", 'tradition'::"text"]))),
    CONSTRAINT "correspondence_relationships_weight_check" CHECK ((("weight" >= (0)::numeric) AND ("weight" <= (1)::numeric)))
);


ALTER TABLE "public"."correspondence_relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."correspondences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "aliases" "text"[] DEFAULT '{}'::"text"[],
    "description" "text",
    "lenses" "text"[] DEFAULT '{}'::"text"[],
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "type_id" "uuid"
);


ALTER TABLE "public"."correspondences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cost_alerts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "alert_type" "text" NOT NULL,
    "threshold_amount" numeric(10,2) NOT NULL,
    "current_amount" numeric(10,2) DEFAULT 0,
    "threshold_exceeded" boolean DEFAULT false,
    "last_alert_sent" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cost_alerts_alert_type_check" CHECK (("alert_type" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text"])))
);


ALTER TABLE "public"."cost_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid",
    "theme_id" "uuid",
    "current_week" integer DEFAULT 1,
    "current_cycle" integer DEFAULT 1,
    "progress" "jsonb" DEFAULT '{}'::"jsonb",
    "enrolled_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "enrollment_check" CHECK (((("course_id" IS NOT NULL) AND ("theme_id" IS NULL)) OR (("course_id" IS NULL) AND ("theme_id" IS NOT NULL))))
);


ALTER TABLE "public"."course_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_texts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "text_id" "uuid" NOT NULL,
    "week_number" integer,
    "selection_notes" "text",
    "is_required" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "details" "text"
);


ALTER TABLE "public"."course_texts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."course_texts"."details" IS 'Rich text field for reactions, reading guidance, and contextual notes including: Why this section, What not to do, Guiding question while reading, Notice especially, Contextual framing, etc.';



CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "premise" "text",
    "learning_outcomes" "jsonb" DEFAULT '[]'::"jsonb",
    "course_type" "text",
    "level" "text",
    "duration_weeks" integer DEFAULT 8,
    "content" "jsonb" DEFAULT '{}'::"jsonb",
    "is_published" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "courses_course_type_check" CHECK (("course_type" = ANY (ARRAY['foundational'::"text", 'theme'::"text", 'rotation'::"text"]))),
    CONSTRAINT "courses_level_check" CHECK (("level" = ANY (ARRAY['foundational'::"text", 'intermediate'::"text", 'advanced'::"text"])))
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cover_generation_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "text_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "source" "text",
    "result_url" "text",
    "error" "text",
    "credits_used" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cover_generation_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."cover_generation_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."cover_generation_jobs" IS 'Tracks async book cover generation/scraping jobs';



CREATE TABLE IF NOT EXISTS "public"."daily_usage_summary" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "date" "date" NOT NULL,
    "service" "text" NOT NULL,
    "total_requests" integer DEFAULT 0,
    "successful_requests" integer DEFAULT 0,
    "failed_requests" integer DEFAULT 0,
    "total_units" numeric DEFAULT 0,
    "unit_type" "text",
    "total_cost" numeric(10,2) DEFAULT 0,
    "unique_users" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_usage_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."import_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "import_type" "text",
    "file_name" "text",
    "records_imported" integer DEFAULT 0,
    "records_skipped" integer DEFAULT 0,
    "errors" "jsonb" DEFAULT '[]'::"jsonb",
    "imported_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "import_history_import_type_check" CHECK (("import_type" = ANY (ARRAY['airtable_csv'::"text", 'obsidian_markdown'::"text"])))
);


ALTER TABLE "public"."import_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."journal_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "jsonb" DEFAULT '{"type": "doc", "content": []}'::"jsonb" NOT NULL,
    "parent_id" "uuid",
    "icon" "text" DEFAULT '📝'::"text",
    "is_archived" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."journal_pages" OWNER TO "postgres";


COMMENT ON TABLE "public"."journal_pages" IS 'Stores user journal pages with rich text content stored as Tiptap JSON';



COMMENT ON COLUMN "public"."journal_pages"."content" IS 'Tiptap document JSON format';



COMMENT ON COLUMN "public"."journal_pages"."parent_id" IS 'For nested/hierarchical pages (future feature)';



COMMENT ON COLUMN "public"."journal_pages"."icon" IS 'Emoji icon for the page';



CREATE TABLE IF NOT EXISTS "public"."knowledge_claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "source_id" "uuid",
    "field_key" "text" NOT NULL,
    "field_value" "text",
    "field_value_json" "jsonb",
    "confidence" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "knowledge_claims_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['correspondence'::"text", 'convergence'::"text"])))
);


ALTER TABLE "public"."knowledge_claims" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "author" "text",
    "year" "text",
    "citation" "text",
    "url" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."knowledge_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_daily_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "provider" "text" NOT NULL,
    "model" "text" DEFAULT 'all'::"text",
    "input_tokens" bigint DEFAULT 0,
    "output_tokens" bigint DEFAULT 0,
    "requests" integer DEFAULT 0,
    "cost" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."provider_daily_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reading_progress" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "text_id" "uuid" NOT NULL,
    "current_page" integer DEFAULT 1,
    "total_pages" integer,
    "progress_percent" double precision DEFAULT 0.0,
    "last_position" "jsonb" DEFAULT '{}'::"jsonb",
    "time_spent_seconds" integer DEFAULT 0,
    "completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reading_progress_progress_percent_check" CHECK ((("progress_percent" >= (0.0)::double precision) AND ("progress_percent" <= (100.0)::double precision)))
);


ALTER TABLE "public"."reading_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ritual_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ritual_id" "uuid" NOT NULL,
    "step_order" integer NOT NULL,
    "step_type" "text" NOT NULL,
    "content" "text" NOT NULL,
    "duration_seconds" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ritual_steps_step_type_check" CHECK (("step_type" = ANY (ARRAY['instruction'::"text", 'action'::"text", 'meditation'::"text", 'chant'::"text", 'note'::"text"])))
);


ALTER TABLE "public"."ritual_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rituals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "intention" "text",
    "phase" "text",
    "estimated_duration_minutes" integer,
    "materials" "text"[] DEFAULT '{}'::"text"[],
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "is_favorite" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rituals_phase_check" CHECK (("phase" = ANY (ARRAY['New Moon'::"text", 'Waxing'::"text", 'Full Moon'::"text", 'Waning'::"text", 'Dark Moon'::"text", 'Any'::"text"])))
);


ALTER TABLE "public"."rituals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."search_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "query" "text" NOT NULL,
    "source" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."search_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."storage_usage" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "total_files" integer DEFAULT 0,
    "total_size_bytes" bigint DEFAULT 0,
    "pdf_count" integer DEFAULT 0,
    "pdf_size_bytes" bigint DEFAULT 0,
    "image_count" integer DEFAULT 0,
    "image_size_bytes" bigint DEFAULT 0,
    "document_count" integer DEFAULT 0,
    "document_size_bytes" bigint DEFAULT 0,
    "bandwidth_bytes" bigint DEFAULT 0,
    "snapshot_date" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."storage_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tarot_readings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "spread_type" "text" NOT NULL,
    "query" "text",
    "cards_drawn" "jsonb" NOT NULL,
    "reflection" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tarot_readings_spread_type_check" CHECK (("spread_type" = ANY (ARRAY['One Card'::"text", 'Three Card'::"text", 'Celtic Cross'::"text", 'Custom'::"text"])))
);


ALTER TABLE "public"."tarot_readings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."text_chunks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "text_id" "uuid" NOT NULL,
    "chunk_index" integer NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(1536),
    "token_count" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."text_chunks" OWNER TO "postgres";


COMMENT ON TABLE "public"."text_chunks" IS 'Chunked text content with embeddings for semantic search. Large texts are split into ~2000 token chunks with overlap for context continuity.';



CREATE TABLE IF NOT EXISTS "public"."text_relationships" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "source_id" "uuid",
    "target_id" "uuid",
    "relationship_type" "text",
    "lens" "text",
    "confidence" double precision,
    "discovered_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "text_relationships_confidence_check" CHECK ((("confidence" >= (0.0)::double precision) AND ("confidence" <= (1.0)::double precision)))
);


ALTER TABLE "public"."text_relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."texts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "summary" "text",
    "s3_key" "text",
    "mime_type" "text",
    "file_size" bigint,
    "type" "text",
    "author" "text",
    "year" integer,
    "publisher" "text",
    "license" "text",
    "domain" "text",
    "confidence" "text",
    "source_url" "text",
    "tags" "jsonb",
    "associated_names" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "embedding" "public"."vector"(1536),
    "uploaded_by" "uuid",
    "status" "text" DEFAULT 'processing'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "short_summary" "text",
    "long_summary" "text",
    "lenses" "text"[] DEFAULT '{}'::"text"[],
    "cover_source" "text",
    "source_format" "text",
    "cover_image_url" "text",
    "curator_note" "text",
    "cover_status" "text" DEFAULT 'unchecked'::"text",
    "cover_last_checked" timestamp with time zone,
    CONSTRAINT "texts_confidence_check" CHECK ((("confidence" IS NULL) OR ("confidence" = ANY (ARRAY['established'::"text", 'interpretive'::"text", 'speculative'::"text", 'tradition'::"text"])))),
    CONSTRAINT "texts_cover_source_check" CHECK (("cover_source" = ANY (ARRAY['scraped'::"text", 'ai-generated'::"text", 'manual'::"text", NULL::"text"]))),
    CONSTRAINT "texts_cover_status_check" CHECK (("cover_status" = ANY (ARRAY['valid'::"text", 'broken'::"text", 'unchecked'::"text"]))),
    CONSTRAINT "texts_license_check" CHECK (("license" = ANY (ARRAY['public-domain'::"text", 'cc-by'::"text", 'all-rights-reserved'::"text"]))),
    CONSTRAINT "texts_source_format_check" CHECK (("source_format" = ANY (ARRAY['pdf'::"text", 'html'::"text", 'markdown'::"text", 'plaintext'::"text", NULL::"text"]))),
    CONSTRAINT "texts_status_check" CHECK (("status" = ANY (ARRAY['processing'::"text", 'ready'::"text", 'error'::"text"]))),
    CONSTRAINT "texts_type_check" CHECK (("type" = ANY (ARRAY['book_esoteric'::"text", 'book_spiritual'::"text", 'book_psychology'::"text", 'book_science'::"text", 'article_scholarly'::"text", 'anthropology'::"text", 'reference_table'::"text", 'historical'::"text", 'mythology'::"text", 'medical_overview'::"text", 'commentary'::"text", 'webpage'::"text", 'dictionary'::"text", 'astrology'::"text", 'ritual_guide'::"text", 'diagram'::"text", 'transcript'::"text", 'summary'::"text", 'speculative'::"text", 'misc'::"text"]))),
    CONSTRAINT "valid_lenses" CHECK (("lenses" <@ ARRAY['scientific'::"text", 'psychological'::"text", 'philosophical'::"text", 'religious_spiritual'::"text", 'historical_anthropological'::"text", 'symbolic_occult'::"text", 'mathematical'::"text"]))
);


ALTER TABLE "public"."texts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."texts"."lenses" IS 'The 7 Convergence Machine lenses that apply to this document: scientific, psychological, philosophical, religious_spiritual, historical_anthropological, symbolic_occult, mathematical. Documents can have multiple lenses.';



COMMENT ON COLUMN "public"."texts"."cover_source" IS 'Source of the cover image: scraped from APIs, ai-generated by Nano Banana, manual upload, or NULL';



COMMENT ON COLUMN "public"."texts"."source_format" IS 'Original format of the source document: pdf (uploaded), html (web-imported), markdown (web-imported), plaintext (web-imported), or NULL';



COMMENT ON COLUMN "public"."texts"."cover_image_url" IS 'URL to the book cover image for display in the library. Can be stored in R2/Azure or external URL.';



COMMENT ON COLUMN "public"."texts"."curator_note" IS 'Explanation of why this document was chosen for the collection and its significance.';



CREATE TABLE IF NOT EXISTS "public"."theme_cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "theme_id" "uuid" NOT NULL,
    "cycle_number" integer NOT NULL,
    "core_sub_question" "text",
    "readings" "jsonb" DEFAULT '[]'::"jsonb",
    "exercises" "jsonb" DEFAULT '[]'::"jsonb",
    "synthesis_prompts" "jsonb" DEFAULT '[]'::"jsonb",
    "cross_lens_dialogue" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."theme_cycles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."themes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "core_question" "text",
    "description" "text",
    "lenses" "jsonb" DEFAULT '[]'::"jsonb",
    "is_published" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."themes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_activity_summary" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "date" "date" NOT NULL,
    "documents_uploaded" integer DEFAULT 0,
    "documents_viewed" integer DEFAULT 0,
    "searches_performed" integer DEFAULT 0,
    "annotations_created" integer DEFAULT 0,
    "bookmarks_created" integer DEFAULT 0,
    "ocr_pages_processed" integer DEFAULT 0,
    "ai_tokens_used" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "courses_clicks" integer DEFAULT 0
);


ALTER TABLE "public"."user_activity_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_annotations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "text_id" "uuid",
    "quote" "text",
    "note" "text",
    "position" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "category" "text" DEFAULT 'general'::"text",
    "highlight_color" "text" DEFAULT 'yellow'::"text",
    CONSTRAINT "user_annotations_category_check" CHECK (("category" = ANY (ARRAY['general'::"text", 'important'::"text", 'question'::"text", 'insight'::"text", 'to-research'::"text", 'quote'::"text", 'critique'::"text"]))),
    CONSTRAINT "user_annotations_highlight_color_check" CHECK (("highlight_color" = ANY (ARRAY['yellow'::"text", 'green'::"text", 'blue'::"text", 'pink'::"text", 'red'::"text", 'purple'::"text", 'orange'::"text"])))
);


ALTER TABLE "public"."user_annotations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_bookmarks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "text_id" "uuid",
    "notes" "text",
    "grimoire_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_bookmarks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deck_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "arcana" "text" NOT NULL,
    "suit" "text",
    "meaning_upright" "text",
    "image_url" "text",
    "image_prompt" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_cards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_collections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "color" "text" DEFAULT '#f59e0b'::"text",
    "is_public" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_collections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_decks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" DEFAULT 'My Custom Deck'::"text" NOT NULL,
    "theme" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_decks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_grimoires" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb",
    "parent_id" "uuid",
    "icon" "text",
    "cover_image" "text",
    "is_public" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_grimoires" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text",
    "email" "text" NOT NULL,
    "email_verified" timestamp without time zone,
    "image" "text",
    "role" "text" DEFAULT 'user'::"text",
    "tokens_earned" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "subscription_status" "text" DEFAULT 'free'::"text",
    "convergence_preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "subscription_start_date" timestamp with time zone,
    "subscription_end_date" timestamp with time zone,
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text", 'contributor'::"text"]))),
    CONSTRAINT "users_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['free'::"text", 'student'::"text", 'scholar'::"text", 'adept'::"text", 'premium'::"text", 'active'::"text", NULL::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."subscription_status" IS 'Subscription tier: free (5 queries, 25 pages), student ($5 - unlimited pages, 5 queries), scholar ($9.99 - 25-50 queries), adept ($15 - 50-100 queries). Legacy: premium/active treated as scholar.';



COMMENT ON COLUMN "public"."users"."convergence_preferences" IS 'User default preferences for Convergence Machine (lensWeights, responseLength)';



COMMENT ON COLUMN "public"."users"."stripe_customer_id" IS 'Stripe customer ID for payment processing';



COMMENT ON COLUMN "public"."users"."stripe_subscription_id" IS 'Stripe subscription ID for active subscriptions';



COMMENT ON COLUMN "public"."users"."subscription_start_date" IS 'When the current subscription period started';



COMMENT ON COLUMN "public"."users"."subscription_end_date" IS 'When the current subscription period ends';



ALTER TABLE ONLY "public"."affiliate_clicks"
    ADD CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_logs"
    ADD CONSTRAINT "agent_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_usage"
    ADD CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collection_items"
    ADD CONSTRAINT "collection_items_collection_id_text_id_key" UNIQUE ("collection_id", "text_id");



ALTER TABLE ONLY "public"."collection_items"
    ADD CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."convergence_concepts"
    ADD CONSTRAINT "convergence_concepts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."convergence_concepts"
    ADD CONSTRAINT "convergence_concepts_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."convergence_queries"
    ADD CONSTRAINT "convergence_queries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."convergence_relationships"
    ADD CONSTRAINT "convergence_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."convergence_responses"
    ADD CONSTRAINT "convergence_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."convergence_traditions"
    ADD CONSTRAINT "convergence_traditions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."convergence_traditions"
    ADD CONSTRAINT "convergence_traditions_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."correspondence_entity_types"
    ADD CONSTRAINT "correspondence_entity_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."correspondence_entity_types"
    ADD CONSTRAINT "correspondence_entity_types_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."correspondence_relationship_types"
    ADD CONSTRAINT "correspondence_relationship_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."correspondence_relationship_types"
    ADD CONSTRAINT "correspondence_relationship_types_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."correspondence_relationships"
    ADD CONSTRAINT "correspondence_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."correspondences"
    ADD CONSTRAINT "correspondences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."correspondences"
    ADD CONSTRAINT "correspondences_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."cost_alerts"
    ADD CONSTRAINT "cost_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_user_id_theme_id_key" UNIQUE ("user_id", "theme_id");



ALTER TABLE ONLY "public"."course_texts"
    ADD CONSTRAINT "course_texts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."cover_generation_jobs"
    ADD CONSTRAINT "cover_generation_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_usage_summary"
    ADD CONSTRAINT "daily_usage_summary_date_service_key" UNIQUE ("date", "service");



ALTER TABLE ONLY "public"."daily_usage_summary"
    ADD CONSTRAINT "daily_usage_summary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."import_history"
    ADD CONSTRAINT "import_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."journal_pages"
    ADD CONSTRAINT "journal_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_claims"
    ADD CONSTRAINT "knowledge_claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_sources"
    ADD CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_daily_usage"
    ADD CONSTRAINT "provider_daily_usage_date_provider_model_key" UNIQUE ("date", "provider", "model");



ALTER TABLE ONLY "public"."provider_daily_usage"
    ADD CONSTRAINT "provider_daily_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reading_progress"
    ADD CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reading_progress"
    ADD CONSTRAINT "reading_progress_user_id_text_id_key" UNIQUE ("user_id", "text_id");



ALTER TABLE ONLY "public"."ritual_steps"
    ADD CONSTRAINT "ritual_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rituals"
    ADD CONSTRAINT "rituals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."search_history"
    ADD CONSTRAINT "search_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storage_usage"
    ADD CONSTRAINT "storage_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tarot_readings"
    ADD CONSTRAINT "tarot_readings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."text_chunks"
    ADD CONSTRAINT "text_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."text_chunks"
    ADD CONSTRAINT "text_chunks_text_id_chunk_index_key" UNIQUE ("text_id", "chunk_index");



ALTER TABLE ONLY "public"."text_relationships"
    ADD CONSTRAINT "text_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."texts"
    ADD CONSTRAINT "texts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."theme_cycles"
    ADD CONSTRAINT "theme_cycles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."theme_cycles"
    ADD CONSTRAINT "theme_cycles_theme_id_cycle_number_key" UNIQUE ("theme_id", "cycle_number");



ALTER TABLE ONLY "public"."themes"
    ADD CONSTRAINT "themes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."themes"
    ADD CONSTRAINT "themes_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."user_activity_summary"
    ADD CONSTRAINT "user_activity_summary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_activity_summary"
    ADD CONSTRAINT "user_activity_summary_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."user_annotations"
    ADD CONSTRAINT "user_annotations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_bookmarks"
    ADD CONSTRAINT "user_bookmarks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_cards"
    ADD CONSTRAINT "user_cards_deck_id_name_key" UNIQUE ("deck_id", "name");



ALTER TABLE ONLY "public"."user_cards"
    ADD CONSTRAINT "user_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_collections"
    ADD CONSTRAINT "user_collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_decks"
    ADD CONSTRAINT "user_decks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_grimoires"
    ADD CONSTRAINT "user_grimoires_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_affiliate_clicks_created_at" ON "public"."affiliate_clicks" USING "btree" ("created_at");



CREATE INDEX "idx_affiliate_clicks_item_title" ON "public"."affiliate_clicks" USING "btree" ("item_title");



CREATE INDEX "idx_api_usage_created_at" ON "public"."api_usage" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_api_usage_service" ON "public"."api_usage" USING "btree" ("service");



CREATE INDEX "idx_api_usage_service_date" ON "public"."api_usage" USING "btree" ("service", "created_at");



CREATE INDEX "idx_api_usage_user_id" ON "public"."api_usage" USING "btree" ("user_id");



CREATE INDEX "idx_claims_entity" ON "public"."knowledge_claims" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_claims_source" ON "public"."knowledge_claims" USING "btree" ("source_id");



CREATE INDEX "idx_collection_items_collection_id" ON "public"."collection_items" USING "btree" ("collection_id");



CREATE INDEX "idx_collection_items_text_id" ON "public"."collection_items" USING "btree" ("text_id");



CREATE INDEX "idx_concepts_tags" ON "public"."convergence_concepts" USING "gin" ("tags");



CREATE INDEX "idx_concepts_tradition" ON "public"."convergence_concepts" USING "btree" ("tradition");



CREATE UNIQUE INDEX "idx_conv_unique_edge" ON "public"."convergence_relationships" USING "btree" ("source_id", "target_id");



CREATE INDEX "idx_convergence_queries_user_id" ON "public"."convergence_queries" USING "btree" ("user_id");



CREATE INDEX "idx_convergence_queries_user_month" ON "public"."convergence_queries" USING "btree" ("user_id", "created_at");



CREATE INDEX "idx_convergence_responses_created_at" ON "public"."convergence_responses" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_convergence_responses_query_id" ON "public"."convergence_responses" USING "btree" ("query_id");



CREATE INDEX "idx_convergence_responses_user_id" ON "public"."convergence_responses" USING "btree" ("user_id");



CREATE INDEX "idx_corr_type" ON "public"."correspondence_relationships" USING "btree" ("type");



CREATE UNIQUE INDEX "idx_corr_unique_edge" ON "public"."correspondence_relationships" USING "btree" ("source_id", "target_id", "type");



CREATE INDEX "idx_corr_weight" ON "public"."correspondence_relationships" USING "btree" ("weight");



CREATE INDEX "idx_correspondences_aliases" ON "public"."correspondences" USING "gin" ("aliases");



CREATE INDEX "idx_correspondences_category" ON "public"."correspondences" USING "btree" ("category");



CREATE UNIQUE INDEX "idx_correspondences_slug" ON "public"."correspondences" USING "btree" ("slug");



CREATE INDEX "idx_course_texts_course" ON "public"."course_texts" USING "btree" ("course_id");



CREATE INDEX "idx_course_texts_text" ON "public"."course_texts" USING "btree" ("text_id");



CREATE INDEX "idx_course_texts_week" ON "public"."course_texts" USING "btree" ("week_number");



CREATE INDEX "idx_courses_content" ON "public"."courses" USING "gin" ("content");



CREATE INDEX "idx_courses_published" ON "public"."courses" USING "btree" ("is_published");



CREATE INDEX "idx_courses_slug" ON "public"."courses" USING "btree" ("slug");



CREATE INDEX "idx_courses_type" ON "public"."courses" USING "btree" ("course_type");



CREATE INDEX "idx_cover_jobs_created_at" ON "public"."cover_generation_jobs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_cover_jobs_status" ON "public"."cover_generation_jobs" USING "btree" ("status");



CREATE INDEX "idx_cover_jobs_text_id" ON "public"."cover_generation_jobs" USING "btree" ("text_id");



CREATE INDEX "idx_daily_summary_date" ON "public"."daily_usage_summary" USING "btree" ("date" DESC);



CREATE INDEX "idx_daily_summary_service" ON "public"."daily_usage_summary" USING "btree" ("service");



CREATE INDEX "idx_enrollments_course" ON "public"."course_enrollments" USING "btree" ("course_id");



CREATE INDEX "idx_enrollments_progress" ON "public"."course_enrollments" USING "gin" ("progress");



CREATE INDEX "idx_enrollments_theme" ON "public"."course_enrollments" USING "btree" ("theme_id");



CREATE INDEX "idx_enrollments_user" ON "public"."course_enrollments" USING "btree" ("user_id");



CREATE INDEX "idx_journal_pages_created_at" ON "public"."journal_pages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_journal_pages_parent_id" ON "public"."journal_pages" USING "btree" ("parent_id");



CREATE INDEX "idx_journal_pages_updated_at" ON "public"."journal_pages" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_journal_pages_user_id" ON "public"."journal_pages" USING "btree" ("user_id");



CREATE INDEX "idx_reading_progress_completed" ON "public"."reading_progress" USING "btree" ("completed");



CREATE INDEX "idx_reading_progress_text_id" ON "public"."reading_progress" USING "btree" ("text_id");



CREATE INDEX "idx_reading_progress_user_id" ON "public"."reading_progress" USING "btree" ("user_id");



CREATE INDEX "idx_ritual_steps_ritual_id" ON "public"."ritual_steps" USING "btree" ("ritual_id");



CREATE INDEX "idx_rituals_user_id" ON "public"."rituals" USING "btree" ("user_id");



CREATE INDEX "idx_search_history_user_created" ON "public"."search_history" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_storage_usage_date" ON "public"."storage_usage" USING "btree" ("snapshot_date" DESC);



CREATE INDEX "idx_tarot_readings_user_id" ON "public"."tarot_readings" USING "btree" ("user_id");



CREATE INDEX "idx_text_chunks_content_fts" ON "public"."text_chunks" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "idx_text_chunks_embedding" ON "public"."text_chunks" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='100') WHERE ("embedding" IS NOT NULL);



CREATE INDEX "idx_text_chunks_index" ON "public"."text_chunks" USING "btree" ("text_id", "chunk_index");



CREATE INDEX "idx_text_chunks_text_id" ON "public"."text_chunks" USING "btree" ("text_id");



CREATE INDEX "idx_texts_author" ON "public"."texts" USING "btree" ("author");



COMMENT ON INDEX "public"."idx_texts_author" IS 'Speeds up author-based sorting and exact matches';



CREATE INDEX "idx_texts_author_trgm" ON "public"."texts" USING "gin" ("author" "public"."gin_trgm_ops");



COMMENT ON INDEX "public"."idx_texts_author_trgm" IS 'Enables fast case-insensitive partial matching on author';



CREATE INDEX "idx_texts_content" ON "public"."texts" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "idx_texts_cover_source" ON "public"."texts" USING "btree" ("cover_source");



CREATE INDEX "idx_texts_cover_status" ON "public"."texts" USING "btree" ("cover_status");



CREATE INDEX "idx_texts_created_at" ON "public"."texts" USING "btree" ("created_at" DESC);



COMMENT ON INDEX "public"."idx_texts_created_at" IS 'Speeds up default sort by creation date';



CREATE INDEX "idx_texts_domain" ON "public"."texts" USING "btree" ("domain");



COMMENT ON INDEX "public"."idx_texts_domain" IS 'Speeds up domain filtering';



CREATE INDEX "idx_texts_domain_created_at" ON "public"."texts" USING "btree" ("domain", "created_at" DESC);



COMMENT ON INDEX "public"."idx_texts_domain_created_at" IS 'Optimizes domain filtering with date sorting';



CREATE INDEX "idx_texts_embedding" ON "public"."texts" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_texts_lenses" ON "public"."texts" USING "gin" ("lenses");



CREATE INDEX "idx_texts_long_summary" ON "public"."texts" USING "gin" ("to_tsvector"('"english"'::"regconfig", "long_summary"));



CREATE INDEX "idx_texts_short_summary" ON "public"."texts" USING "gin" ("to_tsvector"('"english"'::"regconfig", "short_summary"));



CREATE INDEX "idx_texts_source_format" ON "public"."texts" USING "btree" ("source_format");



CREATE INDEX "idx_texts_tags" ON "public"."texts" USING "gin" ("tags");



CREATE INDEX "idx_texts_title" ON "public"."texts" USING "btree" ("title");



COMMENT ON INDEX "public"."idx_texts_title" IS 'Speeds up title-based sorting and exact matches';



CREATE INDEX "idx_texts_title_trgm" ON "public"."texts" USING "gin" ("title" "public"."gin_trgm_ops");



COMMENT ON INDEX "public"."idx_texts_title_trgm" IS 'Enables fast case-insensitive partial matching on title';



CREATE INDEX "idx_texts_type" ON "public"."texts" USING "btree" ("type");



COMMENT ON INDEX "public"."idx_texts_type" IS 'Speeds up type filtering';



CREATE INDEX "idx_texts_type_created_at" ON "public"."texts" USING "btree" ("type", "created_at" DESC);



COMMENT ON INDEX "public"."idx_texts_type_created_at" IS 'Optimizes type filtering with date sorting';



CREATE INDEX "idx_texts_year" ON "public"."texts" USING "btree" ("year");



COMMENT ON INDEX "public"."idx_texts_year" IS 'Speeds up year-based filtering and sorting';



CREATE INDEX "idx_theme_cycles_active" ON "public"."theme_cycles" USING "btree" ("is_active");



CREATE INDEX "idx_theme_cycles_readings" ON "public"."theme_cycles" USING "gin" ("readings");



CREATE INDEX "idx_theme_cycles_theme" ON "public"."theme_cycles" USING "btree" ("theme_id");



CREATE INDEX "idx_themes_lenses" ON "public"."themes" USING "gin" ("lenses");



CREATE INDEX "idx_themes_published" ON "public"."themes" USING "btree" ("is_published");



CREATE INDEX "idx_themes_slug" ON "public"."themes" USING "btree" ("slug");



CREATE INDEX "idx_user_activity_courses_clicks" ON "public"."user_activity_summary" USING "btree" ("date" DESC, "courses_clicks" DESC) WHERE ("courses_clicks" > 0);



CREATE INDEX "idx_user_activity_date" ON "public"."user_activity_summary" USING "btree" ("date" DESC);



CREATE INDEX "idx_user_activity_user_date" ON "public"."user_activity_summary" USING "btree" ("user_id", "date" DESC);



CREATE INDEX "idx_user_annotations_category" ON "public"."user_annotations" USING "btree" ("category");



CREATE INDEX "idx_user_annotations_created_at" ON "public"."user_annotations" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_annotations_highlight_color" ON "public"."user_annotations" USING "btree" ("highlight_color");



CREATE INDEX "idx_user_annotations_text_id" ON "public"."user_annotations" USING "btree" ("text_id");



CREATE INDEX "idx_user_annotations_user_id" ON "public"."user_annotations" USING "btree" ("user_id");



CREATE INDEX "idx_user_bookmarks_user_id" ON "public"."user_bookmarks" USING "btree" ("user_id");



CREATE INDEX "idx_user_collections_user_id" ON "public"."user_collections" USING "btree" ("user_id");



CREATE INDEX "idx_user_grimoires_user_id" ON "public"."user_grimoires" USING "btree" ("user_id");



CREATE INDEX "idx_users_convergence_preferences" ON "public"."users" USING "gin" ("convergence_preferences");



CREATE INDEX "idx_users_stripe_customer_id" ON "public"."users" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_users_stripe_subscription_id" ON "public"."users" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_users_subscription_status" ON "public"."users" USING "btree" ("subscription_status");



CREATE OR REPLACE TRIGGER "set_courses_updated_at" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."update_courses_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_daily_usage_summary" AFTER INSERT ON "public"."api_usage" FOR EACH ROW EXECUTE FUNCTION "public"."update_daily_usage_summary"();



CREATE OR REPLACE TRIGGER "update_journal_pages_updated_at" BEFORE UPDATE ON "public"."journal_pages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reading_progress_updated_at" BEFORE UPDATE ON "public"."reading_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_texts_updated_at" BEFORE UPDATE ON "public"."texts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_annotations_updated_at" BEFORE UPDATE ON "public"."user_annotations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_collections_updated_at" BEFORE UPDATE ON "public"."user_collections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_grimoires_updated_at" BEFORE UPDATE ON "public"."user_grimoires" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."affiliate_clicks"
    ADD CONSTRAINT "affiliate_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."api_usage"
    ADD CONSTRAINT "api_usage_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."texts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."api_usage"
    ADD CONSTRAINT "api_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."collection_items"
    ADD CONSTRAINT "collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."user_collections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_items"
    ADD CONSTRAINT "collection_items_text_id_fkey" FOREIGN KEY ("text_id") REFERENCES "public"."texts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."convergence_queries"
    ADD CONSTRAINT "convergence_queries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."convergence_relationships"
    ADD CONSTRAINT "convergence_relationships_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."convergence_concepts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."convergence_relationships"
    ADD CONSTRAINT "convergence_relationships_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."convergence_concepts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."convergence_responses"
    ADD CONSTRAINT "convergence_responses_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "public"."convergence_queries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."convergence_responses"
    ADD CONSTRAINT "convergence_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."correspondence_relationships"
    ADD CONSTRAINT "correspondence_relationships_relationship_type_id_fkey" FOREIGN KEY ("relationship_type_id") REFERENCES "public"."correspondence_relationship_types"("id");



ALTER TABLE ONLY "public"."correspondence_relationships"
    ADD CONSTRAINT "correspondence_relationships_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."correspondences"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."correspondence_relationships"
    ADD CONSTRAINT "correspondence_relationships_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."correspondences"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."correspondences"
    ADD CONSTRAINT "correspondences_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."correspondence_entity_types"("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_texts"
    ADD CONSTRAINT "course_texts_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_texts"
    ADD CONSTRAINT "course_texts_text_id_fkey" FOREIGN KEY ("text_id") REFERENCES "public"."texts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cover_generation_jobs"
    ADD CONSTRAINT "cover_generation_jobs_text_id_fkey" FOREIGN KEY ("text_id") REFERENCES "public"."texts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."import_history"
    ADD CONSTRAINT "import_history_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."journal_pages"
    ADD CONSTRAINT "journal_pages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."journal_pages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."journal_pages"
    ADD CONSTRAINT "journal_pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_claims"
    ADD CONSTRAINT "knowledge_claims_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."knowledge_sources"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reading_progress"
    ADD CONSTRAINT "reading_progress_text_id_fkey" FOREIGN KEY ("text_id") REFERENCES "public"."texts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reading_progress"
    ADD CONSTRAINT "reading_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ritual_steps"
    ADD CONSTRAINT "ritual_steps_ritual_id_fkey" FOREIGN KEY ("ritual_id") REFERENCES "public"."rituals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rituals"
    ADD CONSTRAINT "rituals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."search_history"
    ADD CONSTRAINT "search_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tarot_readings"
    ADD CONSTRAINT "tarot_readings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."text_chunks"
    ADD CONSTRAINT "text_chunks_text_id_fkey" FOREIGN KEY ("text_id") REFERENCES "public"."texts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."text_relationships"
    ADD CONSTRAINT "text_relationships_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."texts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."text_relationships"
    ADD CONSTRAINT "text_relationships_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."texts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."texts"
    ADD CONSTRAINT "texts_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."theme_cycles"
    ADD CONSTRAINT "theme_cycles_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activity_summary"
    ADD CONSTRAINT "user_activity_summary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_annotations"
    ADD CONSTRAINT "user_annotations_text_id_fkey" FOREIGN KEY ("text_id") REFERENCES "public"."texts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_annotations"
    ADD CONSTRAINT "user_annotations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_bookmarks"
    ADD CONSTRAINT "user_bookmarks_grimoire_id_fkey" FOREIGN KEY ("grimoire_id") REFERENCES "public"."user_grimoires"("id");



ALTER TABLE ONLY "public"."user_bookmarks"
    ADD CONSTRAINT "user_bookmarks_text_id_fkey" FOREIGN KEY ("text_id") REFERENCES "public"."texts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_bookmarks"
    ADD CONSTRAINT "user_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_cards"
    ADD CONSTRAINT "user_cards_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "public"."user_decks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_collections"
    ADD CONSTRAINT "user_collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_decks"
    ADD CONSTRAINT "user_decks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_grimoires"
    ADD CONSTRAINT "user_grimoires_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."user_grimoires"("id");



ALTER TABLE ONLY "public"."user_grimoires"
    ADD CONSTRAINT "user_grimoires_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can create cover jobs" ON "public"."cover_generation_jobs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete agent logs" ON "public"."agent_logs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete any convergence responses" ON "public"."convergence_responses" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete convergence queries" ON "public"."convergence_queries" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete correspondence relationships" ON "public"."correspondence_relationships" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete correspondences" ON "public"."correspondences" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete import history" ON "public"."import_history" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete text chunks" ON "public"."text_chunks" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete text relationships" ON "public"."text_relationships" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete texts" ON "public"."texts" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert api_usage" ON "public"."api_usage" FOR INSERT WITH CHECK (true);



CREATE POLICY "Admins can manage provider usage" ON "public"."provider_daily_usage" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update agent logs" ON "public"."agent_logs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update any convergence responses" ON "public"."convergence_responses" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update any texts" ON "public"."texts" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update convergence queries" ON "public"."convergence_queries" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update correspondence relationships" ON "public"."correspondence_relationships" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update correspondences" ON "public"."correspondences" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update cover jobs" ON "public"."cover_generation_jobs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update import history" ON "public"."import_history" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update text chunks" ON "public"."text_chunks" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update text relationships" ON "public"."text_relationships" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view affiliate clicks" ON "public"."affiliate_clicks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view agent logs" ON "public"."agent_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view api_usage" ON "public"."api_usage" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view cost_alerts" ON "public"."cost_alerts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view cover jobs" ON "public"."cover_generation_jobs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view daily_usage_summary" ON "public"."daily_usage_summary" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view storage_usage" ON "public"."storage_usage" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view user_activity_summary" ON "public"."user_activity_summary" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Authenticated can insert agent logs" ON "public"."agent_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can create correspondence relationships" ON "public"."correspondence_relationships" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can create correspondences" ON "public"."correspondences" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can create text chunks" ON "public"."text_chunks" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can create text relationships" ON "public"."text_relationships" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Course texts are editable by admins" ON "public"."course_texts" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Course texts are viewable by everyone" ON "public"."course_texts" FOR SELECT USING (true);



CREATE POLICY "Courses are editable by admins" ON "public"."courses" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Courses are viewable by everyone" ON "public"."courses" FOR SELECT USING (true);



CREATE POLICY "Public read access for correspondence relationships" ON "public"."correspondence_relationships" FOR SELECT USING (true);



CREATE POLICY "Public read access for correspondences" ON "public"."correspondences" FOR SELECT USING (true);



CREATE POLICY "Public read access for text chunks" ON "public"."text_chunks" FOR SELECT USING (true);



CREATE POLICY "Public read access for text relationships" ON "public"."text_relationships" FOR SELECT USING (true);



CREATE POLICY "Public read access for texts" ON "public"."texts" FOR SELECT USING (true);



CREATE POLICY "Service role can insert agent logs" ON "public"."agent_logs" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can manage affiliate clicks" ON "public"."affiliate_clicks" USING (true) WITH CHECK (true);



CREATE POLICY "Theme cycles are editable by admins" ON "public"."theme_cycles" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Theme cycles are viewable by everyone" ON "public"."theme_cycles" FOR SELECT USING (true);



CREATE POLICY "Themes are editable by admins" ON "public"."themes" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Themes are viewable by everyone" ON "public"."themes" FOR SELECT USING (true);



CREATE POLICY "Users can add items to own collections" ON "public"."collection_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_collections"
  WHERE (("user_collections"."id" = "collection_items"."collection_id") AND ("user_collections"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create own annotations" ON "public"."user_annotations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own collections" ON "public"."user_collections" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own convergence queries" ON "public"."convergence_queries" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create own convergence responses" ON "public"."convergence_responses" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create own import history" ON "public"."import_history" FOR INSERT TO "authenticated" WITH CHECK (("imported_by" = "auth"."uid"()));



CREATE POLICY "Users can create their own journal pages" ON "public"."journal_pages" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete cards in their decks" ON "public"."user_cards" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_decks"
  WHERE (("user_decks"."id" = "user_cards"."deck_id") AND ("user_decks"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own annotations" ON "public"."user_annotations" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own collection items" ON "public"."collection_items" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_collections"
  WHERE (("user_collections"."id" = "collection_items"."collection_id") AND ("user_collections"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own collections" ON "public"."user_collections" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own convergence responses" ON "public"."convergence_responses" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own reading progress" ON "public"."reading_progress" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete steps of their rituals" ON "public"."ritual_steps" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."rituals"
  WHERE (("rituals"."id" = "ritual_steps"."ritual_id") AND ("rituals"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own decks" ON "public"."user_decks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own enrollments" ON "public"."course_enrollments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own journal pages" ON "public"."journal_pages" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own readings" ON "public"."tarot_readings" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own rituals" ON "public"."rituals" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own search history" ON "public"."search_history" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert cards into their decks" ON "public"."user_cards" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_decks"
  WHERE (("user_decks"."id" = "user_cards"."deck_id") AND ("user_decks"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert into their own search history" ON "public"."search_history" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own reading progress" ON "public"."reading_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert steps to their rituals" ON "public"."ritual_steps" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."rituals"
  WHERE (("rituals"."id" = "ritual_steps"."ritual_id") AND ("rituals"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert texts" ON "public"."texts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can insert their own decks" ON "public"."user_decks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own enrollments" ON "public"."course_enrollments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own readings" ON "public"."tarot_readings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own rituals" ON "public"."rituals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own annotations" ON "public"."user_annotations" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own bookmarks" ON "public"."user_bookmarks" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own grimoires" ON "public"."user_grimoires" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read all texts" ON "public"."texts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can update cards in their decks" ON "public"."user_cards" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_decks"
  WHERE (("user_decks"."id" = "user_cards"."deck_id") AND ("user_decks"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own annotations" ON "public"."user_annotations" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own collection items" ON "public"."collection_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_collections"
  WHERE (("user_collections"."id" = "collection_items"."collection_id") AND ("user_collections"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own collections" ON "public"."user_collections" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own convergence responses" ON "public"."convergence_responses" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own reading progress" ON "public"."reading_progress" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own texts" ON "public"."texts" FOR UPDATE TO "authenticated" USING (("uploaded_by" = "auth"."uid"())) WITH CHECK (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "Users can update steps of their rituals" ON "public"."ritual_steps" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."rituals"
  WHERE (("rituals"."id" = "ritual_steps"."ritual_id") AND ("rituals"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own decks" ON "public"."user_decks" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own enrollments" ON "public"."course_enrollments" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own journal pages" ON "public"."journal_pages" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own readings" ON "public"."tarot_readings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own rituals" ON "public"."rituals" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view cards in their decks" ON "public"."user_cards" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_decks"
  WHERE (("user_decks"."id" = "user_cards"."deck_id") AND ("user_decks"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own activity" ON "public"."user_activity_summary" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own annotations" ON "public"."user_annotations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own collection items" ON "public"."collection_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_collections"
  WHERE (("user_collections"."id" = "collection_items"."collection_id") AND (("user_collections"."user_id" = "auth"."uid"()) OR ("user_collections"."is_public" = true))))));



CREATE POLICY "Users can view own collections" ON "public"."user_collections" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("is_public" = true)));



CREATE POLICY "Users can view own convergence queries" ON "public"."convergence_queries" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can view own convergence responses" ON "public"."convergence_responses" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can view own import history" ON "public"."import_history" FOR SELECT USING ((("imported_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can view own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own reading progress" ON "public"."reading_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view steps of their rituals" ON "public"."ritual_steps" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."rituals"
  WHERE (("rituals"."id" = "ritual_steps"."ritual_id") AND ("rituals"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own decks" ON "public"."user_decks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own enrollments" ON "public"."course_enrollments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own journal pages" ON "public"."journal_pages" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own readings" ON "public"."tarot_readings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own rituals" ON "public"."rituals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own search history" ON "public"."search_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."affiliate_clicks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collection_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."convergence_queries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."convergence_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."correspondence_relationships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."correspondences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cost_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_texts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cover_generation_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_usage_summary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."import_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."journal_pages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_daily_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reading_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ritual_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rituals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."search_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storage_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tarot_readings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."text_chunks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."text_relationships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."texts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."theme_cycles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."themes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_activity_summary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_annotations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_bookmarks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_cards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_collections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_decks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_grimoires" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."rituals";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tarot_readings";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_affiliate_source_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_affiliate_source_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_affiliate_source_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_indexed_text_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_indexed_text_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_indexed_text_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_library_indexing_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_library_indexing_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_library_indexing_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_text_chunk_counts"("text_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_text_chunk_counts"("text_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_text_chunk_counts"("text_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_affiliate_items"("limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_affiliate_items"("limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_affiliate_items"("limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_users_by_activity"("days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_users_by_activity"("days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_users_by_activity"("days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_text_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "lens_filter" "text"[], "type_filter" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."match_text_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "lens_filter" "text"[], "type_filter" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_text_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "lens_filter" "text"[], "type_filter" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_text_fts"("search_query" "text", "match_count" integer, "lens_filter" "text"[], "type_filter" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."match_text_fts"("search_query" "text", "match_count" integer, "lens_filter" "text"[], "type_filter" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_text_fts"("search_query" "text", "match_count" integer, "lens_filter" "text"[], "type_filter" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."track_courses_click"("p_user_id" "uuid", "p_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."track_courses_click"("p_user_id" "uuid", "p_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_courses_click"("p_user_id" "uuid", "p_source" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_courses_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_courses_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_courses_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_daily_usage_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_daily_usage_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_daily_usage_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."affiliate_clicks" TO "anon";
GRANT ALL ON TABLE "public"."affiliate_clicks" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliate_clicks" TO "service_role";



GRANT ALL ON TABLE "public"."agent_logs" TO "anon";
GRANT ALL ON TABLE "public"."agent_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_logs" TO "service_role";



GRANT ALL ON TABLE "public"."api_usage" TO "anon";
GRANT ALL ON TABLE "public"."api_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."api_usage" TO "service_role";



GRANT ALL ON TABLE "public"."collection_items" TO "anon";
GRANT ALL ON TABLE "public"."collection_items" TO "authenticated";
GRANT ALL ON TABLE "public"."collection_items" TO "service_role";



GRANT ALL ON TABLE "public"."convergence_concepts" TO "anon";
GRANT ALL ON TABLE "public"."convergence_concepts" TO "authenticated";
GRANT ALL ON TABLE "public"."convergence_concepts" TO "service_role";



GRANT ALL ON TABLE "public"."convergence_queries" TO "anon";
GRANT ALL ON TABLE "public"."convergence_queries" TO "authenticated";
GRANT ALL ON TABLE "public"."convergence_queries" TO "service_role";



GRANT ALL ON TABLE "public"."convergence_relationships" TO "anon";
GRANT ALL ON TABLE "public"."convergence_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."convergence_relationships" TO "service_role";



GRANT ALL ON TABLE "public"."convergence_responses" TO "anon";
GRANT ALL ON TABLE "public"."convergence_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."convergence_responses" TO "service_role";



GRANT ALL ON TABLE "public"."convergence_traditions" TO "anon";
GRANT ALL ON TABLE "public"."convergence_traditions" TO "authenticated";
GRANT ALL ON TABLE "public"."convergence_traditions" TO "service_role";



GRANT ALL ON TABLE "public"."correspondence_entity_types" TO "anon";
GRANT ALL ON TABLE "public"."correspondence_entity_types" TO "authenticated";
GRANT ALL ON TABLE "public"."correspondence_entity_types" TO "service_role";



GRANT ALL ON TABLE "public"."correspondence_relationship_types" TO "anon";
GRANT ALL ON TABLE "public"."correspondence_relationship_types" TO "authenticated";
GRANT ALL ON TABLE "public"."correspondence_relationship_types" TO "service_role";



GRANT ALL ON TABLE "public"."correspondence_relationships" TO "anon";
GRANT ALL ON TABLE "public"."correspondence_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."correspondence_relationships" TO "service_role";



GRANT ALL ON TABLE "public"."correspondences" TO "anon";
GRANT ALL ON TABLE "public"."correspondences" TO "authenticated";
GRANT ALL ON TABLE "public"."correspondences" TO "service_role";



GRANT ALL ON TABLE "public"."cost_alerts" TO "anon";
GRANT ALL ON TABLE "public"."cost_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."cost_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."course_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."course_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."course_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."course_texts" TO "anon";
GRANT ALL ON TABLE "public"."course_texts" TO "authenticated";
GRANT ALL ON TABLE "public"."course_texts" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."cover_generation_jobs" TO "anon";
GRANT ALL ON TABLE "public"."cover_generation_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."cover_generation_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."daily_usage_summary" TO "anon";
GRANT ALL ON TABLE "public"."daily_usage_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_usage_summary" TO "service_role";



GRANT ALL ON TABLE "public"."import_history" TO "anon";
GRANT ALL ON TABLE "public"."import_history" TO "authenticated";
GRANT ALL ON TABLE "public"."import_history" TO "service_role";



GRANT ALL ON TABLE "public"."journal_pages" TO "anon";
GRANT ALL ON TABLE "public"."journal_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."journal_pages" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_claims" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_claims" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_claims" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_sources" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_sources" TO "service_role";



GRANT ALL ON TABLE "public"."provider_daily_usage" TO "anon";
GRANT ALL ON TABLE "public"."provider_daily_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_daily_usage" TO "service_role";



GRANT ALL ON TABLE "public"."reading_progress" TO "anon";
GRANT ALL ON TABLE "public"."reading_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."reading_progress" TO "service_role";



GRANT ALL ON TABLE "public"."ritual_steps" TO "anon";
GRANT ALL ON TABLE "public"."ritual_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."ritual_steps" TO "service_role";



GRANT ALL ON TABLE "public"."rituals" TO "anon";
GRANT ALL ON TABLE "public"."rituals" TO "authenticated";
GRANT ALL ON TABLE "public"."rituals" TO "service_role";



GRANT ALL ON TABLE "public"."search_history" TO "anon";
GRANT ALL ON TABLE "public"."search_history" TO "authenticated";
GRANT ALL ON TABLE "public"."search_history" TO "service_role";



GRANT ALL ON TABLE "public"."storage_usage" TO "anon";
GRANT ALL ON TABLE "public"."storage_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."storage_usage" TO "service_role";



GRANT ALL ON TABLE "public"."tarot_readings" TO "anon";
GRANT ALL ON TABLE "public"."tarot_readings" TO "authenticated";
GRANT ALL ON TABLE "public"."tarot_readings" TO "service_role";



GRANT ALL ON TABLE "public"."text_chunks" TO "anon";
GRANT ALL ON TABLE "public"."text_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."text_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."text_relationships" TO "anon";
GRANT ALL ON TABLE "public"."text_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."text_relationships" TO "service_role";



GRANT ALL ON TABLE "public"."texts" TO "anon";
GRANT ALL ON TABLE "public"."texts" TO "authenticated";
GRANT ALL ON TABLE "public"."texts" TO "service_role";



GRANT ALL ON TABLE "public"."theme_cycles" TO "anon";
GRANT ALL ON TABLE "public"."theme_cycles" TO "authenticated";
GRANT ALL ON TABLE "public"."theme_cycles" TO "service_role";



GRANT ALL ON TABLE "public"."themes" TO "anon";
GRANT ALL ON TABLE "public"."themes" TO "authenticated";
GRANT ALL ON TABLE "public"."themes" TO "service_role";



GRANT ALL ON TABLE "public"."user_activity_summary" TO "anon";
GRANT ALL ON TABLE "public"."user_activity_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activity_summary" TO "service_role";



GRANT ALL ON TABLE "public"."user_annotations" TO "anon";
GRANT ALL ON TABLE "public"."user_annotations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_annotations" TO "service_role";



GRANT ALL ON TABLE "public"."user_bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."user_bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_bookmarks" TO "service_role";



GRANT ALL ON TABLE "public"."user_cards" TO "anon";
GRANT ALL ON TABLE "public"."user_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."user_cards" TO "service_role";



GRANT ALL ON TABLE "public"."user_collections" TO "anon";
GRANT ALL ON TABLE "public"."user_collections" TO "authenticated";
GRANT ALL ON TABLE "public"."user_collections" TO "service_role";



GRANT ALL ON TABLE "public"."user_decks" TO "anon";
GRANT ALL ON TABLE "public"."user_decks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_decks" TO "service_role";



GRANT ALL ON TABLE "public"."user_grimoires" TO "anon";
GRANT ALL ON TABLE "public"."user_grimoires" TO "authenticated";
GRANT ALL ON TABLE "public"."user_grimoires" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Allow Authenticated Users to Upload 1oj01fe_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND (auth.uid() IS NOT NULL)));



  create policy "Allow Public Read Access 1oj01fe_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Allow Users to Delete Their Own Avatar 1oj01fe_0"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'avatars'::text) AND (owner = auth.uid())));



  create policy "Allow Users to Update Their Own Avatar 1oj01fe_0"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'avatars'::text));



