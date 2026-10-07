SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role','authenticator') ORDER BY rolname;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;

SELECT c.relname AS tablename,
       r.rolname AS grantee,
       a.privilege_type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
JOIN pg_roles r ON r.oid = a.grantee
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname, r.rolname, a.privilege_type;
