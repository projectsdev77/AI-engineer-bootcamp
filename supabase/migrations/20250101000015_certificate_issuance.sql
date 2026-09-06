-- Automatic certificate issuance (PD-011, A-006) when an enrollment
-- transitions to 'completed' (set by unlock_next_week_if_ready() in
-- 20250101000007). `rendered_snapshot` freezes fully-resolved plain text
-- at issue time so a later template edit never rewrites certificates
-- already awarded. Values are stored as plain text, not markup — the
-- public certificate page must render them as text content (e.g. React
-- JSX text, never dangerouslySetInnerHTML), since student_name flows
-- into body_text and is not admin-controlled input.

create or replace function render_template_text(
  p_template text,
  p_student_name text,
  p_track_title text,
  p_completion_date text,
  p_certificate_code text
)
returns text
language sql
immutable
as $$
  select replace(
    replace(
      replace(
        replace(p_template, '{{student_name}}', p_student_name),
        '{{track_title}}', p_track_title
      ),
      '{{completion_date}}', p_completion_date
    ),
    '{{certificate_code}}', p_certificate_code
  );
$$;

create or replace function issue_certificate_for_enrollment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template certificate_templates%rowtype;
  v_student_name text;
  v_track_title text;
  v_completion_date text;
  v_code text;
begin
  -- Only fire on the transition into 'completed', not every update.
  if new.status <> 'completed' or old.status = 'completed' then
    return new;
  end if;

  select * into v_template from certificate_templates where is_active limit 1;
  if v_template.id is null then
    return new; -- no active template configured yet; nothing to issue
  end if;

  select coalesce(full_name, 'Graduate') into v_student_name from profiles where id = new.user_id;
  select title into v_track_title from tracks where id = new.track_id;
  v_completion_date := to_char(coalesce(new.completed_at, now()), 'FMMonth DD, YYYY');
  v_code := generate_certificate_code();

  insert into certificates (user_id, enrollment_id, template_id, code, rendered_snapshot)
  values (
    new.user_id,
    new.id,
    v_template.id,
    v_code,
    jsonb_build_object(
      'title_text', v_template.title_text,
      'body_text', render_template_text(
        v_template.body_text, v_student_name, v_track_title, v_completion_date, v_code
      ),
      'signature_name', v_template.signature_name,
      'signature_title', v_template.signature_title,
      'logo_url', v_template.logo_url,
      'accent_color', v_template.accent_color,
      'student_name', v_student_name,
      'track_title', v_track_title,
      'completion_date', v_completion_date
    )
  )
  on conflict (enrollment_id) do nothing;

  return new;
end;
$$;

create trigger enrollments_issue_certificate
  after update of status on enrollments
  for each row
  execute function issue_certificate_for_enrollment();

-- Lets a student find their own certificate without knowing its code.
create or replace function get_my_certificate()
returns table (code text, rendered_snapshot jsonb, issued_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select c.code, c.rendered_snapshot, c.issued_at
  from certificates c
  where c.user_id = auth.uid()
  order by c.issued_at desc
  limit 1;
$$;

grant execute on function get_my_certificate() to authenticated;
