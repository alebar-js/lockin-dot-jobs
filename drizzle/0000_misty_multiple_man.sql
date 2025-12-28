CREATE TYPE "public"."job_posting_status" AS ENUM('IN_PROGRESS', 'READY', 'EXPORTED', 'APPLIED', 'OFFER', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."skill_gap_category" AS ENUM('hard_skills', 'soft_skills', 'domain_knowledge', 'seniority');--> statement-breakpoint
CREATE TYPE "public"."skill_gap_status" AS ENUM('matched', 'missing', 'partial');--> statement-breakpoint
CREATE TABLE "job_postings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"company_name" varchar(255),
	"title" varchar(255) NOT NULL,
	"job_description" text NOT NULL,
	"posting_url" text,
	"path" text,
	"status" "job_posting_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"is_master" boolean DEFAULT false NOT NULL,
	"data" jsonb,
	"target_job_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_gap_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_posting_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"total_skills" integer NOT NULL,
	"matched_count" integer NOT NULL,
	"missing_count" integer NOT NULL,
	"partial_count" integer NOT NULL,
	"match_percentage" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_gap_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"skill" varchar(255) NOT NULL,
	"category" "skill_gap_category" NOT NULL,
	"status" "skill_gap_status" NOT NULL,
	"evidence" text,
	"recommendation" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"picture" varchar(500),
	"google_id" varchar(255),
	"github_id" varchar(255),
	"linkedin_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id"),
	CONSTRAINT "users_linkedin_id_unique" UNIQUE("linkedin_id")
);
--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_target_job_id_job_postings_id_fk" FOREIGN KEY ("target_job_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_gap_analyses" ADD CONSTRAINT "skill_gap_analyses_job_posting_id_job_postings_id_fk" FOREIGN KEY ("job_posting_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_gap_analyses" ADD CONSTRAINT "skill_gap_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_gap_items" ADD CONSTRAINT "skill_gap_items_analysis_id_skill_gap_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."skill_gap_analyses"("id") ON DELETE cascade ON UPDATE no action;