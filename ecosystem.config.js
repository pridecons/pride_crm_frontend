module.exports = {
  apps: [
    {
      name: "pride_crm_frontend",
      cwd: "/root/pride_crm_frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3010",
      env: {
        NODE_ENV: "production",
        NEXT_PUBLIC_API_BASE: "https://crm.24x7techelp.com/api/v1"
      }
    }
  ]
}
