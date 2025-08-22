-- CreateTable
CREATE TABLE "public"."surveys" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_profiles" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "education_level" TEXT NOT NULL,
    "grade_level" INTEGER,
    "interests" TEXT[],
    "career_goals" TEXT,
    "timeline" TEXT NOT NULL,
    "college_plans" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'Hawaii',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."careers" (
    "id" TEXT NOT NULL,
    "career_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "salary_median" INTEGER,
    "job_outlook" TEXT,
    "growth_rate" DOUBLE PRECISION,
    "required_education" TEXT NOT NULL,
    "experience_level" TEXT,
    "skills" TEXT[],
    "industries" TEXT[],
    "work_environment" TEXT,
    "typical_tasks" TEXT[],
    "hawaii_specific_notes" TEXT,
    "data_source" TEXT NOT NULL DEFAULT 'hawaii_career_explorer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "careers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."education_programs" (
    "id" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "campus" TEXT,
    "program_name" TEXT NOT NULL,
    "degree_type" TEXT NOT NULL,
    "duration_years" INTEGER,
    "duration_months" INTEGER,
    "cip_code" TEXT,
    "admission_requirements" TEXT[],
    "prerequisite_courses" TEXT[],
    "core_courses" TEXT[],
    "tuition_resident" INTEGER,
    "tuition_nonresident" INTEGER,
    "financial_aid_available" BOOLEAN NOT NULL DEFAULT true,
    "accreditation" TEXT[],
    "graduation_rate" DOUBLE PRECISION,
    "employment_rate" DOUBLE PRECISION,
    "median_starting_salary" INTEGER,
    "program_website" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "application_deadline" TIMESTAMP(3),
    "program_status" TEXT NOT NULL DEFAULT 'active',
    "data_source" TEXT NOT NULL DEFAULT 'uh_system',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."career_education_pathways" (
    "id" TEXT NOT NULL,
    "career_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "pathway_type" TEXT,
    "preparation_level" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_education_pathways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."skills_certifications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "demand_level" TEXT,
    "growth_trend" TEXT,
    "avg_salary_boost" INTEGER,
    "time_to_acquire_months" INTEGER,
    "cost_estimate" INTEGER,
    "issuing_organization" TEXT,
    "renewal_required" BOOLEAN NOT NULL DEFAULT false,
    "renewal_period_years" INTEGER,
    "hawaii_specific" BOOLEAN NOT NULL DEFAULT false,
    "online_available" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "prerequisites" TEXT[],
    "data_source" TEXT NOT NULL DEFAULT 'lightcast_lmi',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."career_skills" (
    "id" TEXT NOT NULL,
    "career_id" TEXT NOT NULL,
    "skill_cert_id" TEXT NOT NULL,
    "importance_level" TEXT,
    "proficiency_level" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."job_market" (
    "id" TEXT NOT NULL,
    "career_id" TEXT NOT NULL,
    "occupation_code" TEXT,
    "location" TEXT NOT NULL DEFAULT 'Hawaii',
    "region" TEXT,
    "job_postings_count" INTEGER NOT NULL DEFAULT 0,
    "job_postings_growth" DOUBLE PRECISION,
    "unique_companies_hiring" INTEGER,
    "avg_time_to_fill_days" INTEGER,
    "competition_level" TEXT,
    "seasonal_demand" BOOLEAN NOT NULL DEFAULT false,
    "peak_hiring_months" TEXT[],
    "remote_work_percentage" DOUBLE PRECISION,
    "hybrid_work_percentage" DOUBLE PRECISION,
    "data_source" TEXT NOT NULL DEFAULT 'ui_data',
    "data_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "size_category" TEXT,
    "employee_count_range" TEXT,
    "headquarters_location" TEXT,
    "hawaii_locations" TEXT[],
    "company_type" TEXT,
    "website" TEXT,
    "description" TEXT,
    "benefits" TEXT[],
    "culture_keywords" TEXT[],
    "diversity_programs" BOOLEAN NOT NULL DEFAULT false,
    "internship_programs" BOOLEAN NOT NULL DEFAULT false,
    "entry_level_friendly" BOOLEAN NOT NULL DEFAULT false,
    "remote_work_policy" TEXT,
    "data_source" TEXT NOT NULL DEFAULT 'lightcast_lmi',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."company_careers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "career_id" TEXT NOT NULL,
    "current_openings" INTEGER NOT NULL DEFAULT 0,
    "avg_salary_offered" INTEGER,
    "hiring_frequency" TEXT,
    "entry_level_available" BOOLEAN NOT NULL DEFAULT false,
    "internships_available" BOOLEAN NOT NULL DEFAULT false,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_careers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."doe_courses" (
    "id" TEXT NOT NULL,
    "course_code" TEXT,
    "course_name" TEXT NOT NULL,
    "subject_area" TEXT,
    "grade_levels" INTEGER[],
    "course_type" TEXT,
    "prerequisites" TEXT[],
    "description" TEXT,
    "skills_developed" TEXT[],
    "college_credit_available" BOOLEAN NOT NULL DEFAULT false,
    "career_relevance" TEXT[],
    "data_source" TEXT NOT NULL DEFAULT 'doe_data',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doe_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."non_credit_courses" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "course_name" TEXT NOT NULL,
    "course_type" TEXT,
    "duration_hours" INTEGER,
    "duration_weeks" INTEGER,
    "cost" INTEGER,
    "format" TEXT,
    "schedule_type" TEXT,
    "prerequisites" TEXT[],
    "learning_outcomes" TEXT[],
    "industry_certifications" TEXT[],
    "job_placement_rate" DOUBLE PRECISION,
    "contact_info" JSONB,
    "registration_url" TEXT,
    "next_start_date" TIMESTAMP(3),
    "data_source" TEXT NOT NULL DEFAULT 'uhcc_non_credit',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "non_credit_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_interactions" (
    "id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    "session_id" TEXT,
    "interaction_type" TEXT NOT NULL,
    "query_text" TEXT,
    "recommended_careers" TEXT[],
    "viewed_programs" TEXT[],
    "clicked_companies" TEXT[],
    "user_feedback" INTEGER,
    "feedback_text" TEXT,
    "response_time_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversations" (
    "id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "current_context" JSONB,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversation_status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_session_id_key" ON "public"."user_profiles"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "careers_career_code_key" ON "public"."careers"("career_code");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_session_id_key" ON "public"."conversations"("session_id");

-- AddForeignKey
ALTER TABLE "public"."career_education_pathways" ADD CONSTRAINT "career_education_pathways_career_id_fkey" FOREIGN KEY ("career_id") REFERENCES "public"."careers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."career_education_pathways" ADD CONSTRAINT "career_education_pathways_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."education_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."career_skills" ADD CONSTRAINT "career_skills_career_id_fkey" FOREIGN KEY ("career_id") REFERENCES "public"."careers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."career_skills" ADD CONSTRAINT "career_skills_skill_cert_id_fkey" FOREIGN KEY ("skill_cert_id") REFERENCES "public"."skills_certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_market" ADD CONSTRAINT "job_market_career_id_fkey" FOREIGN KEY ("career_id") REFERENCES "public"."careers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."company_careers" ADD CONSTRAINT "company_careers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."company_careers" ADD CONSTRAINT "company_careers_career_id_fkey" FOREIGN KEY ("career_id") REFERENCES "public"."careers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_interactions" ADD CONSTRAINT "user_interactions_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversations" ADD CONSTRAINT "conversations_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
