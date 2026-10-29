/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdfkit', 'fontkit', 'restructure'],
  },
};

module.exports = nextConfig;
