/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdfkit', 'fontkit', 'restructure'],
    outputFileTracingIncludes: {
      '/api/**/*': ['./node_modules/pdfkit/js/data/**'],
    },
  },
};

module.exports = nextConfig;
