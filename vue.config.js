const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const WindiCSSWebpackPlugin = require("windicss-webpack-plugin");
const WebpackExtensionManifestPlugin = require("webpack-extension-manifest-plugin");
const webpack = require("webpack");
const { defineConfig } = require("@vue/cli-service");

const commitHash = require("child_process").execSync("git rev-parse HEAD").toString().trim();
const mainnet = !process.argv.includes("--testnet");
const mf3 = !process.argv.includes("--mf2");

function backgroundEntry() {
  // workaround to support `webpack.entry` objects on vue-cli wrapper
  process.env.VUE_CLI_ENTRY_FILES = undefined;

  return {
    import: "./src/background/background.ts",
    chunkLoading: "import-scripts"
  };
}

module.exports = defineConfig({
  publicPath: "/",
  productionSourceMap: false,
  devServer: {
    devMiddleware: {
      writeToDisk: true
    }
  },
  lintOnSave: false,
  configureWebpack: {
    devtool: "cheap-source-map",
    optimization: {
      splitChunks: {
        chunks: "all"
      }
    },
    entry: {
      background: backgroundEntry()
    },
    resolve: {
      fallback: {
        stream: require.resolve("stream-browserify")
      }
    },
    experiments: {
      asyncWebAssembly: true
    },
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"]
      }),
      new WebpackExtensionManifestPlugin({
        config: {
          base: mf3 ? "./src/manifest.v3.json" : "./src/manifest.v2.json",
          extend: {
            name: mainnet ? "Nautilus Wallet" : "Nautilus Testnet",
            description: mainnet
              ? "Privacy Wallet Designed for Ergo Network"
              : "Testnet version of Nautilus Wallet",
            icons: mainnet
              ? { 48: "icons/app/m-48.png", 128: "icons/app/m-128.png", 512: "icons/app/m-512.png" }
              : { 48: "icons/app/t-48.png", 128: "icons/app/t-128.png", 512: "icons/app/t-512.png" }
          }
        },
        pkgJsonProps: ["version"]
      })
    ]
  },
  pages: {
    index: { entry: "src/main.ts", template: "public/index.html", title: "Nautilus" }
  },
  chainWebpack: (config) => {
    config.output.filename("js/[name].js").chunkFilename("js/[name].js").end();

    config.plugin("copy").tap(([pathConfigs]) => {
      pathConfigs.patterns.push({
        from: "src/content-scripts",
        to: "js"
      });

      return [pathConfigs];
    });

    config.plugin("ignore").use(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/wordlists\/(?!english)/,
        contextRegExp: /bip39\/src$/
      })
    );

    config.plugin("define").tap((options) => {
      options[0]["process.env"].GIT_HASH = JSON.stringify(commitHash);
      options[0]["process.env"].MAINNET = JSON.stringify(!process.argv.includes("--testnet"));
      return options;
    });

    config
      .plugin("clean-output")
      .use(
        new CleanWebpackPlugin({
          cleanStaleWebpackAssets: false
        })
      )
      .end();

    const svgRule = config.module.rule("svg");
    svgRule.uses.clear();
    svgRule
      .delete("type")
      .delete("generator")
      .use("vue-loader")
      .loader("vue-loader")
      .end()
      .use("inline-svg-loader")
      .loader("./loaders/svgLoader.js")
      .end();

    config.plugin("windicss").use(new WindiCSSWebpackPlugin()).end();
  }
});
