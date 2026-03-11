const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { AeoWebpackPlugin } = require('aeo.js/webpack');

module.exports = {
  entry: {
    index: './src/index.js',
    about: './src/about.js',
    products: './src/products.js',
    docs: './src/docs.js',
    faq: './src/faq.js',
    pricing: './src/pricing.js',
    blog: './src/blog.js',
    contact: './src/contact.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './src/index.html', filename: 'index.html', chunks: ['index'] }),
    new HtmlWebpackPlugin({ template: './src/about.html', filename: 'about.html', chunks: ['about'] }),
    new HtmlWebpackPlugin({ template: './src/products.html', filename: 'products.html', chunks: ['products'] }),
    new HtmlWebpackPlugin({ template: './src/docs.html', filename: 'docs.html', chunks: ['docs'] }),
    new HtmlWebpackPlugin({ template: './src/faq.html', filename: 'faq.html', chunks: ['faq'] }),
    new HtmlWebpackPlugin({ template: './src/pricing.html', filename: 'pricing.html', chunks: ['pricing'] }),
    new HtmlWebpackPlugin({ template: './src/blog.html', filename: 'blog.html', chunks: ['blog'] }),
    new HtmlWebpackPlugin({ template: './src/contact.html', filename: 'contact.html', chunks: ['contact'] }),
    new AeoWebpackPlugin({
      title: 'AEO Demo Site',
      description: 'A demo site showcasing aeo.js integration with Webpack',
      url: 'https://demo.aeojs.org',
    }),
  ],
  devServer: {
    static: './dist',
    port: 3500,
  },
};
