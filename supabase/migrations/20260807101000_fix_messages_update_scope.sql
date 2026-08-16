-- P0-B · messages — the recipient can rewrite what the sender wrote
--
-- Problem:
--   All four UPDATE policies on public.messages omit WITH CHECK. Verified live
--   on 2026-08-07 from pg_policies:
--
--     "Users can update received messages"  {authenticated}
--         qual = (auth.uid() = receiver_id)                    with_check = NULL
--     "messages_own_update"                 {public}
--         qual = (auth.uid() = sender_id OR auth.uid() = receiver_id)
--                                                              with_check = NULL
--     "participants can update messages"    {public}
--         qual = (auth.uid() = sender_id OR auth.uid() = receiver_id)
--                                                              with_check = NULL
--     "receiver can update message"         {public}
--         qual = (auth.uid() = receiver_id)                    with_check = NULL
--
--   An omitted WITH CHECK defaults to the USING expression, so the check is
--   satisfied by the row's ownership rather than by what changed. There is no
--   trigger on messages. `content` is a plain text column with no edited_at,
--   no history, and no booking_events coverage.
--
--   Net effect: either participant may rewrite ANY column of ANY message they
--   can see, including one they did not send.
--
--   Attack: A books from B, they negotiate in the inbox, then A edits B's own
--   message to read "I promise a full refund if you cancel" and screenshots it
--   for a dispute. B's message now says something B never wrote, and nothing
--   anywhere records that it changed.
--
-- Fix:
--   Collapse the four policies into one recipient-scoped policy with an
--   explicit WITH CHECK, and add a BEFORE UPDATE trigger that rejects any
--   change to a field other than is_read.
--
-- Reason:
--   Policy and trigger answer different questions and both are needed. The
--   policy answers "may this user touch this row at all" — recipient only,
--   because marking-as-read is the only legitimate write. The trigger answers
--   "did they change something they shouldn't", which WITH CHECK cannot ask
--   because it has no access to OLD.
--
--   Verified safe against the application: `from('messages').update(...)`
--   appears exactly twice in src/, both in src/app/inbox/[userId]/page.tsx
--   (lines 102 and 142), and both set { is_read: true } on messages where the
--   current user is the receiver. No code path anywhere updates a message as
--   its sender, so removing the sender arm breaks nothing.
--
--   Collapsing four permissive policies into one also removes the hazard
--   documented in 20260702160000: permissive policies are OR-combined, so the
--   loosest sibling always wins and a correctly narrow policy is silently
--   neutralised by a broad one sitting beside it.
--
-- ── POLICY DIFF (before → after) ─────────────────────────────────────────────
--
--   BEFORE (4 policies, UPDATE):
--     Users can update received messages | authenticated | receiver          | check: (inherited)
--     messages_own_update                | public        | sender OR receiver | check: (inherited)
--     participants can update messages   | public        | sender OR receiver | check: (inherited)
--     receiver can update message        | public        | receiver          | check: (inherited)
--
--   AFTER (1 policy, UPDATE):
--     messages update: recipient only    | authenticated | receiver          | check: receiver
--     + trigger guard_messages_immutable_fields  (only is_read may change)
--
--   SELECT and INSERT policies are NOT touched by this migration. They carry
--   their own duplication (3 SELECT, 4 INSERT) but every one of them is
--   identical in effect, so they are a performance and readability problem
--   rather than a security one, and they are left for a separate change.
--
drop policy if exists "Users can update received messages" on public.messages;
drop policy if exists "messages_own_update"                on public.messages;
drop policy if exists "participants can update messages"   on public.messages;
drop policy if exists "receiver can update message"        on public.messages;

-- (select auth.uid()) rather than a bare auth.uid() so the planner evaluates it
-- once per statement instead of once per row — the auth_rls_initplan pattern
-- already used by the Sprint 0 storage policies.
create policy "messages update: recipient only" on public.messages
for update
to authenticated
using       ((select auth.uid()) = receiver_id)
with check  ((select auth.uid()) = receiver_id);

create or replace function public.guard_message_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- `id` is in this list because the policy's WITH CHECK only asserts
  -- `auth.uid() = receiver_id`, which stays true after the primary key is
  -- rewritten. Nothing references messages.id today, so the blast radius is
  -- small — but a migration that promises immutability has to mean it.
  if new.id          is distinct from old.id
     or new.content     is distinct from old.content
     or new.sender_id   is distinct from old.sender_id
     or new.receiver_id is distinct from old.receiver_id
     or new.room_id     is distinct from old.room_id
     or new.created_at  is distinct from old.created_at then
    raise exception 'a sent message is immutable; only is_read may be updated';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_messages_immutable_fields on public.messages;

create trigger guard_messages_immutable_fields
before update on public.messages
for each row
execute function public.guard_message_immutable_fields();

revoke all on function public.guard_message_immutable_fields() from public;
revoke all on function public.guard_message_immutable_fields() from anon;
revoke all on function public.guard_message_immutable_fields() from authenticated;

-- Verification:
--   As the RECIPIENT of a message:
--     PATCH /rest/v1/messages?id=eq.<msg> { "is_read": true }
--       -> 204   (the inbox keeps working — this is the only write in the app)
--     PATCH /rest/v1/messages?id=eq.<msg> { "content": "forged" }
--       -> ERROR: a sent message is immutable; only is_read may be updated
--
--   As the SENDER of a message:
--     PATCH /rest/v1/messages?id=eq.<own sent msg> { "content": "edited" }
--       -> 0 rows affected (no policy matches; senders have no UPDATE path)
--
--   As an unrelated user:
--     PATCH /rest/v1/messages?id=eq.<someone else's msg> { "is_read": true }
--       -> 0 rows affected
--
--   Reading is unaffected:
--     GET /rest/v1/messages?or=(sender_id.eq.<me>,receiver_id.eq.<me>)
--       -> unchanged
