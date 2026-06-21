-- Migration 006 - Email OTP verification table
-- Required by frontend/app/api/auth/send-otp and verify-otp.

CREATE TABLE IF NOT EXISTS public.otp_verifications (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email      text        NOT NULL,
    otp_code   text        NOT NULL,
    expires_at timestamptz NOT NULL,
    used       bool        NOT NULL DEFAULT false,
    attempts   int         NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_email_active
    ON public.otp_verifications(email, used, expires_at);

ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
