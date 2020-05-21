require('dotenv').config();

module.exports = {
  plugins: ['@docusaurus/plugin-google-analytics'],
  title: 'Nodejs Web Scraper',
  tagline: 'A simplified web scraper for Nodejs',
  url: 'https://nodejs-web-scraper.ibrod83.com',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'ibrod83', // Usually your GitHub org/user name.
  projectName: 'nodejs-web-scraper', // Usually your repo name.
  themeConfig: {
    googleAnalytics: {
      trackingID: process.env.GOOGLE_ANALYTICS,
      // Optional fields.
      anonymizeIP: true, // Should IPs be anonymized?
    },
    navbar: {
      title: 'Nodejs Web Scraper',
      logo: {
        alt: 'Nodejs Web Scraper',
        src: 'img/favicon.ico',
      },
      links: [
        {
          to: 'docs/doc1',
          activeBasePath: 'docs',
          label: 'Docs',
          position: 'left',
        },
        { to: 'blog', label: 'Blog', position: 'left' },
        // {to: 'blog', label: 'Blog', position: 'left'},
        // {
        //   href: 'https://github.com/ibrod83/nodejs-web-scraper',
        //   label: 'GitHub',
        //   position: 'left',
        // },
        // {
        //   href: 'https://www.npmjs.com/package/nodejs-web-scraper',
        //   label: 'Npm',
        //   position: 'left',
        // },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Info',
          items: [
            // {
            //   label: 'Documentation',
            //   title:"Documentation",
            //   to: 'docs/doc1',
            // },
            {
              label: 'About',
              title: 'About',
              to: 'about'
            },
            {
              label: 'Disclaimer',
              title: 'Disclaimer',
              to: 'disclaimer'
            },
            {
              label: 'GitHub',
              title: 'GitHub',
              href: 'https://github.com/ibrod83/nodejs-web-scraper',
            },
            {
              label: 'Npm',
              title: 'Npm',
              href: 'https://www.npmjs.com/package/nodejs-web-scraper',
            },

            // {
            //   label: 'Second Doc',
            //   to: 'docs/doc2',
            // },
          ],
        },
        {
          title: 'Resources',
          items: [
            // {
            //   label: 'Documentation',
            //   title:"Documentation",
            //   to: 'docs/doc1',
            // },
            {
              label: 'More from the author',
              title: 'More from the author',
              to: 'more-from-the-author'
            },
            // {
            //   label: 'Disclaimer',
            //   title: 'Disclaimer',
            //   to: 'disclaimer'
            // },
            // {
            //   label: 'GitHub',
            //   title: 'GitHub',
            //   href: 'https://github.com/ibrod83/nodejs-web-scraper',
            // },
            // {
            //   label: 'Npm',
            //   title: 'Npm',
            //   href: 'https://www.npmjs.com/package/nodejs-web-scraper',
            // },

            // {
            //   label: 'Second Doc',
            //   to: 'docs/doc2',
            // },
          ],
        },
        // {
        //   title: 'Community',
        //   items: [
        //     {
        //       label: 'Stack Overflow',
        //       href: 'https://stackoverflow.com/questions/tagged/docusaurus',
        //     },
        //     {
        //       label: 'Discord',
        //       href: 'https://discordapp.com/invite/docusaurus',
        //     },
        //     {
        //       label: 'Twitter',
        //       href: 'https://twitter.com/docusaurus',
        //     },
        //   ],
        // },
        // {
        //   title: 'More',
        //   items: [
        //     {
        //       label: 'Blog',
        //       to: 'blog',
        //     },
        //     {
        //       label: 'GitHub',
        //       href: 'https://github.com/ibrod83/nodejs-web-scraper',
        //     },
        //   ],
        // },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ibrod83. Built with Docusaurus.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl:
            'https://github.com/facebook/docusaurus/edit/master/website/',
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          // editUrl: 'https://github.com/facebook/docusaurus/edit/master/website/blog/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
