-- ============================================================
-- Notification RPC Functions
-- Provides get_user_notifications and mark_notification_read
-- as proper SQL functions, matching the signatures called by
-- app/api/notifications/route.ts
-- ============================================================

-- get_user_notifications(p_user_id uuid, p_unread_only boolean, p_limit int)
-- Returns notifications for the user, newest first.
-- Returns a JSON object with notifications array and unread_count.
CREATE OR REPLACE FUNCTION public.get_user_notifications(
  p_user_id    uuid,
  p_unread_only boolean DEFAULT false,
  p_limit      int DEFAULT 20
)
RETURNS json
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT json_build_object(
    'notifications', COALESCE(
      (
        SELECT json_agg(n ORDER BY n.created_at DESC)
        FROM (
          SELECT * FROM public.notifications
          WHERE user_id = p_user_id
            AND (NOT p_unread_only OR is_read = false)
          ORDER BY created_at DESC
          LIMIT p_limit
        ) n
      ),
      '[]'::json
    ),
    'unread_count', (
      SELECT COUNT(*)
      FROM public.notifications
      WHERE user_id = p_user_id
        AND is_read = false
    )
  );
$$;

-- mark_notification_read(p_user_id uuid, p_notification_id uuid, p_mark_all boolean)
-- Marks one or all notifications as read for the user.
CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_user_id         uuid,
  p_notification_id uuid DEFAULT NULL,
  p_mark_all        boolean DEFAULT false
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.notifications
  SET is_read = true
  WHERE user_id = p_user_id
    AND (
      p_mark_all = true
      OR (p_notification_id IS NOT NULL AND id = p_notification_id)
    )
    AND is_read = false;
$$;
