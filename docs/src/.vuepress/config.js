const { description } = require('../../package')

module.exports = {
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#title
   */
  title: 'Azerbaijan Python User Group',
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#description
   */
  description: description,

  /**
   * Extra tags to be injected to the page HTML `<head>`
   *
   * ref：https://v1.vuepress.vuejs.org/config/#head
   */
  head: [
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],

  /**
   * Theme configuration, here is the default theme configuration for VuePress.
   *
   * ref：https://v1.vuepress.vuejs.org/theme/default-theme-config.html
   */
  themeConfig: {
    logo: '/AzePUG.jpg',
    repo: '',
    editLinks: false,
    docsDir: '',
    editLinkText: '',
    lastUpdated: false,
    nav: [
      {
        text: 'Facebook Group',
        link: 'https://www.facebook.com/groups/python.az',
      },
      {
        text: 'Telegram Group',
        link: 'https://t.me/azepug'
      },
      {
        text: 'Github',
        link: 'https://github.com/ShahriyarR/azepug'
      },
      {
        text: 'Blog Posts',
        link: '/posts/'
      }
    ],
    sidebar: {
      '/posts/': [
        {
          title: 'Posts',
          collapsable: true,
          children: [
            '',
            ['cpython-internals/', 'CPython Internals']
          ],
        },
      ],
    }
  },

  /**
   * Apply plugins，ref：https://v1.vuepress.vuejs.org/zh/plugin/
   */
  plugins: [
    '@vuepress/plugin-back-to-top',
    '@vuepress/plugin-medium-zoom',
  ]
}
