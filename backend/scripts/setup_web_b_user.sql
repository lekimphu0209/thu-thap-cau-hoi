DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'web_b_readonly') THEN
        CREATE USER web_b_readonly WITH PASSWORD 'ChangeMe123!';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE guideline_management TO web_b_readonly;
GRANT USAGE ON SCHEMA public TO web_b_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO web_b_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO web_b_readonly;
