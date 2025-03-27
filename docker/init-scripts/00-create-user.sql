-- Create database user
DO
$$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'pubgadmin') THEN

      CREATE ROLE pubgadmin WITH LOGIN PASSWORD 'your_secure_password' SUPERUSER;
   END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE pubg_tournaments TO pubgadmin;
