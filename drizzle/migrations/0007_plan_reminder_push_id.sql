ALTER TABLE public.calendar_events ADD COLUMN reminder_push_id TEXT;
COMMENT ON COLUMN public.calendar_events.reminder_push_id IS 'Id of the scheduled phone notification for this plan, so it can be cancelled when the plan is deleted.';
COMMENT ON COLUMN public.calendar_events.reminded_at IS 'DEPRECATED: unused; reminders are scheduled with the notification service instead.';