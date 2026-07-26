/** Centralized application constants to reduce hardcoded values */

/** Supabase Storage bucket for all document uploads */
export const STORAGE_BUCKET = "project-documents";

/** Application metadata */
export const APP_NAME = "Airframe";
export const APP_DESCRIPTION = "Drone operations management platform";

/** File upload constraints */
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
export const BLOCKED_FILE_EXTENSIONS = [".exe", ".bat", ".cmd", ".sh", ".msi", ".dll", ".scr"];
export const PREVIEWABLE_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"];

/** Signed URL expiry durations (seconds) */
export const SIGNED_URL_SHORT = 300; // 5 minutes - for previews/downloads
export const SIGNED_URL_LONG = 3600; // 1 hour - for invoice files
