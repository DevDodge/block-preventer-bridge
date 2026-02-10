-- Migration: Add message_content_display column to global_settings table
-- Date: 2026-02-10
-- Description: Adds the missing message_content_display column for UI preferences

ALTER TABLE global_settings 
ADD COLUMN IF NOT EXISTS message_content_display VARCHAR(10) DEFAULT 'hover';

-- Update existing rows if column was just added
UPDATE global_settings 
SET message_content_display = 'hover' 
WHERE message_content_display IS NULL;
