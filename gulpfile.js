const dotenv = require('dotenv').config();
const dotenvExpand = require('dotenv-expand');
dotenvExpand(dotenv);

require('events').EventEmitter.prototype._maxListeners = 100;

const gulp = require('gulp'),
gutil = require('gulp-util'),
rename = require('gulp-rename'),
clean = require("gulp-clean");

const concat = require('gulp-concat'),
terser= require('gulp-terser');

const workbox = require("workbox-build");

const sass = require('gulp-sass'),
postcss = require('gulp-postcss'),
scss = require('postcss-scss'),
autoprefixer = require('autoprefixer'),
postcssProcessors = [
  autoprefixer({ browsers: ['last 2 versions', 'ie > 10'] })
];

// This is the only requirement for Jen. The other tasks in this file are optional.
require('./jen/index.js')(gulp, {
  dataUrl: process.env.DATA_URL
});

const browserSync = require('browser-sync').create();


/**********
SCRIPTS
***********/

gulp.task('scripts', function(){
  return gulp.src([
    'src/assets/js/**/*.js'
  ])
      .pipe(concat('bundle.min.js'))
      .pipe(terser())
      .pipe(gulp.dest('public/js'));
});


/**********
IMAGES
***********/

gulp.task('images', function() {
  return gulp.src(['src/assets/images/**/*.{gif,jpg,png,svg}'])
      .pipe(gulp.dest('public/images'));
});

gulp.task('webmanifest', function() {
  return gulp.src(['src/site.webmanifest'])
      .pipe(gulp.dest('public'));
});

/**********
SASS
***********/

gulp.task('sass-components', function () {
  return gulp
    .src(['src/templates/**/*.scss'])
    .pipe(concat('_components.scss'))
    .pipe(gulp.dest('src/bin/generated'))
});

gulp.task('sass', function () {
  return gulp
    .src(['src/assets/scss/index.scss'])
    .pipe(postcss(postcssProcessors, { syntax: scss }))
    .pipe(sass({ outputStyle: 'compressed' }).on('error', gutil.log))
    .pipe(rename('styles.min.css'))
    .pipe(gulp.dest('public/css/'))
});

/*************
SERVICE WORKER
**************/

// IMPORTANT: This will enable application caching and is not recommended during development.
// To enable for production build, use "build-sw".
// Enables offline capability for all pages except detail pages and admin dashboard.

gulp.task("service-worker", () => {
  return new Promise(function(resolve, reject){
    setTimeout(function(){
      workbox.generateSW({
          cacheId: "jenstarter",
          globDirectory: "./public",
          globPatterns: [
              "**/*.{css,js,eot,ttf,woff,woff2,otf}"
          ],
          swDest: "./public/sw.js",
          modifyUrlPrefix: {
              "**/": ""
          },
          templatedURLs: {
            '/': [
              'index.html'
            ],
            '/features': [
              'features/index.html'
            ],
            '/docs': [
              'docs/index.html'
            ]
          },
          clientsClaim: true,
          skipWaiting: true,
          ignoreUrlParametersMatching: [/./],
          offlineGoogleAnalytics: true,
          maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
          runtimeCaching: [
              {
                  urlPattern: /(?:\/)$/,
                  handler: "staleWhileRevalidate",
                  options: {
                      cacheName: "html",
                      expiration: {
                          maxAgeSeconds: 60 * 60 * 24 * 7,
                      },
                  },
              },
              {
                  urlPattern: /\.(?:png|jpg|jpeg|gif|bmp|webp|svg|ico)$/,
                  handler: "cacheFirst",
                  options: {
                      cacheName: "images",
                      expiration: {
                          maxEntries: 1000,
                          maxAgeSeconds: 60 * 60 * 24 * 365,
                      },
                  },
              },
              {
                  urlPattern: /\.(?:mp3|wav|m4a)$/,
                  handler: "cacheFirst",
                  options: {
                      cacheName: "audio",
                      expiration: {
                          maxEntries: 1000,
                          maxAgeSeconds: 60 * 60 * 24 * 365,
                      },
                  },
              },
              {
                  urlPattern: /\.(?:m4v|mpg|avi)$/,
                  handler: "cacheFirst",
                  options: {
                      cacheName: "videos",
                      expiration: {
                          maxEntries: 1000,
                          maxAgeSeconds: 60 * 60 * 24 * 365,
                      },
                  },
              }, 
              {
                urlPattern: /https:\/\/s3-ap-southeast-2.amazonaws.com\/com.appyay\/.*$/,
                handler: "networkFirst",
                options: {
                  cacheName: "appyayImages",
                  expiration: {
                      maxEntries: 1000,
                      maxAgeSeconds: 60 * 60 * 24 * 365,
                  }
                }
              },
              {
                urlPattern: /https:\/\/lighthouse-badge.appspot.com.*$/,
                handler: "networkFirst",
                options: {
                  cacheName: "lighthouseBadges",
                  expiration: {
                      maxEntries: 1000,
                      maxAgeSeconds: 60 * 60 * 24 * 365,
                  }
                }
              },
              {
                urlPattern: /https:\/\/cdnjs.cloudflare.com\/ajax\/libs\/.*$/,
                handler: "networkFirst",
                options: {
                  cacheName: "cdnScripts",
                  expiration: {
                      maxEntries: 1000,
                      maxAgeSeconds: 60 * 60 * 24 * 365,
                  }
                }
              }
          ],
      });
      resolve()
    }, 1000);//wait for files to fully build
  });

});


/**********
WATCH
***********/

//watch templates

gulp.task('watch-templates', function (done) {
  gulp.watch('src/templates/**/**/*.html', gulp.series('jen:build')).on('change', stackReload)
  var timer = null
  function stackReload (file) {
    if (timer) clearTimeout(timer)
    if (!gulp.isRunning) {
      timer = setTimeout(function () {
        browserSync.reload()
      }, 250)
    }
  }
  done();
  });

//watch scripts
  
  gulp.task('watch-scripts', function (done) {
  gulp.watch([
    'src/assets/js/**/*.js', 
    'src/templates/**/*.js'
  ], gulp.series('scripts', 'jen:build')).on('change', stackReload)
  var timer = null
  function stackReload (file) {
    if (timer) clearTimeout(timer)
    if (!gulp.isRunning) {
      timer = setTimeout(function () {
        browserSync.reload()
      }, 250)
    }
  }
  done();
  });

  //watch sass
  
  gulp.task('watch-sass', function (done) {
    gulp.watch([
      'src/assets/scss/*.scss',
      'src/templates/**/*.scss'
    ], gulp.series('sass-components', 'sass', 'jen:build')).on('change', stackReload)
    var timer = null
    function stackReload (file) {
      if (timer) clearTimeout(timer)
      if (!gulp.isRunning) {
        timer = setTimeout(function () {
          browserSync.reload()
        }, 250)
      }
    }
    done();
    });

  //watch data
  
  gulp.task('watch-data', function (done) {
    gulp.watch('src/data/*.json', gulp.series('jen:build')).on('change', stackReload)
    var timer = null
    function stackReload (file) {
      if (timer) clearTimeout(timer)
      if (!gulp.isRunning) {
        timer = setTimeout(function () {
          browserSync.reload()
        }, 250)
      }
    }
    done();
});


/**********
SERVE
***********/

gulp.task('browser-sync', function () {
  browserSync.init({
    server: {
      baseDir: './public',
    },
    notify: false
  })
});

/**********
CLEAN
***********/

gulp.task('clean', function () {
  return gulp.src("public", { read: false, allowEmpty: true })
  .pipe(clean());
});

/**********
BUILD
***********/

gulp.task('build-custom', gulp.series('scripts', 'images', 'webmanifest', 'sass', 'sass-components'));

gulp.task('build', gulp.series('clean', 'build-custom', 'jen:build'));

//Uncomment to use service worker (use with care - app will be heavily cached)
// gulp.task('build', gulp.series('clean', 'build-custom', 'jen:build', 'service-worker'));


/***********************************
DEFAULT (DEV BUILD)
***********************************/

gulp.task(
  'default',
  gulp.series('clean', gulp.parallel('watch-templates', 'watch-scripts', 'watch-sass', 'watch-data'), 'jen:dev', 'build-custom', 'browser-sync')
);