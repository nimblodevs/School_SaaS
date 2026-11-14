ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.schools FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS school_tenant_isolation ON public.schools;
--> statement-breakpoint
CREATE POLICY school_tenant_isolation ON public.schools
  USING (
    id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  )
  WITH CHECK (
    id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  );
--> statement-breakpoint

DO $$
DECLARE
  target record;
  has_branch_id boolean;
  policy_expression text;
BEGIN
  FOR target IN
    SELECT column_info.table_name
    FROM information_schema.columns AS column_info
    WHERE column_info.table_schema = 'public'
      AND column_info.column_name = 'school_id'
      AND EXISTS (
        SELECT 1
        FROM information_schema.tables AS table_info
        WHERE table_info.table_schema = 'public'
          AND table_info.table_name = column_info.table_name
          AND table_info.table_type = 'BASE TABLE'
      )
      AND column_info.table_name NOT IN (
        'users',
        'auth_sessions',
        'refresh_sessions',
        'school_user_memberships',
        'school_user_branch_curriculums'
      )
    GROUP BY column_info.table_name
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns AS column_info
      WHERE column_info.table_schema = 'public'
        AND column_info.table_name = target.table_name
        AND column_info.column_name = 'branch_id'
    ) INTO has_branch_id;

    policy_expression := $predicate$
      school_id = NULLIF(
        current_setting('app.current_school_id', true),
        ''
      )::uuid
    $predicate$;
    IF target.table_name = 'school_branches' THEN
      policy_expression := policy_expression || $predicate$
        AND (
          current_setting('app.current_role', true) = 'ADMIN'
          OR id = ANY(
            string_to_array(
              NULLIF(current_setting('app.current_branch_ids', true), ''),
              ','
            )::uuid[]
          )
        )
      $predicate$;
    ELSIF has_branch_id THEN
      policy_expression := policy_expression || $predicate$
        AND (
          branch_id IS NULL
          OR current_setting('app.current_role', true) = 'ADMIN'
          OR branch_id = ANY(
            string_to_array(
              NULLIF(current_setting('app.current_branch_ids', true), ''),
              ','
            )::uuid[]
          )
        )
      $predicate$;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      target.table_name
    );
    EXECUTE format(
      'ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',
      target.table_name
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS tenant_branch_isolation ON public.%I',
      target.table_name
    );
    EXECUTE format(
      'CREATE POLICY tenant_branch_isolation ON public.%I USING (%s) WITH CHECK (%s)',
      target.table_name,
      policy_expression,
      policy_expression
    );
  END LOOP;
END
$$;
--> statement-breakpoint

ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.student_parents FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS student_parent_tenant_isolation
  ON public.student_parents;
--> statement-breakpoint
CREATE POLICY student_parent_tenant_isolation ON public.student_parents
  USING (
    EXISTS (
      SELECT 1
      FROM public.students
      WHERE students.id = student_parents.student_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.parents
      WHERE parents.id = student_parents.parent_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.students
      WHERE students.id = student_parents.student_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.parents
      WHERE parents.id = student_parents.parent_id
    )
  );
