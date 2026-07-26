// pm2 config for the unified artificialatheist.com Next app (publication +
// quiz + debate), matching the lab980 convention.
//   cd /var/www/artificial-atheist
//   pm2 start deploy/ecosystem.config.js && pm2 save
module.exports = {
  apps: [
    {
      name: "artificial-atheist",
      cwd: "/var/www/artificial-atheist",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 8060,
        // Fallback visitor region when no trusted geo header (x-country-code)
        // is present, so header-less requests resolve to an allowed region
        // instead of being fail-closed to /unavailable. This is an interim
        // default — for launch, wire real geolocation via deploy/nginx-geoip2.conf
        // (which sets x-country-code from the client IP) so true countries are
        // detected and the GDPR region gate actually applies.
        // NOTE: pm2 caches env — apply a change with
        //   pm2 restart artificial-atheist --update-env   (or re-run this file).
        GEO_DEFAULT_COUNTRY: "US",
      },
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
