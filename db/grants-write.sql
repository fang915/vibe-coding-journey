GRANT INSERT ON public.dishes TO service_role;

GRANT INSERT ON public.dish_aliases TO service_role;

GRANT UPDATE ON public.dishes TO service_role;

GRANT DELETE ON public.dishes TO service_role;

GRANT DELETE ON public.dish_aliases TO service_role;

SELECT c.relname AS tablename,
       r.rolname AS grantee,
       a.privilege_type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
JOIN pg_roles r ON r.oid = a.grantee
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND r.rolname = 'service_role'
ORDER BY c.relname, a.privilege_type;
