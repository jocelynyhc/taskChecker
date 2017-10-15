const gulp = require('gulp');
const karma = require('karma').Server;
const jsonReplace = require('gulp-json-replace');
const del = require('del');
const inject = require('gulp-inject');
const uglify = require('gulp-uglify');
const webpack = require('webpack');
const eslint = require('gulp-eslint');

const config = {
  testDirectory: ['test/**/*[sS]pec.js'],
  keyPath: 'config/key.pem',
  manifest: 'manifest.json',
  manifestConfig: 'config/config.json',
  staticFileDirectories: 'public/**/*',

};

gulp.task('clean', () => {
  return del(['dist/**'], {force: true});
});

gulp.task('lint', () => {
  return gulp.src(['src/**/*.js', 'test/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('karma-test', test);

gulp.task('test', ['lint'], test);

gulp.task('test-no-lint', ['karma-test']);

function test(done) {
  return karma.start({
    configFile: process.cwd() + '/karma.conf.js'
  }, done);
}

gulp.task('config', () => {
  return gulp.src(config.manifest)
    .pipe(jsonReplace({
      src: config.manifestConfig,
      identify: '__taskChecker__'
    }))
    .pipe(gulp.dest('dist'))
});

gulp.task('static', () => {
  return gulp.src(config.staticFileDirectories)
    .pipe(gulp.dest('dist/public'))
});

gulp.task('build', ['lint'], (done) => {
  return startWebpackBundle(false, done);
});

gulp.task('inject-html', ['config', 'static', 'build'], () => {
  return gulp.src('src/background.html')
    .pipe(inject(gulp.src('dist/src/js/inject-html.js', {read: false}), {ignorePath: 'dist/'}))
    .pipe(gulp.dest('dist/src'));
});

gulp.task('dist', ['inject-html'], () => {
  gulp.src(config.keyPath)
    .pipe(gulp.dest('dist'));
});

gulp.task('dev', ['inject-html'], () => {
  return startWebpackBundle(true);
});

function startWebpackBundle(enableWatch, done) {
  const webpackConfig = require('./webpack.config.js');
  if (enableWatch) {
    webpackConfig.watch = true;
  }
  return webpack(webpackConfig, (err, stats) => {
    if (err) {
      throw new gutil.PluginError("webpack", err);
    }
    console.log("[webpack]", stats.toString({}));

    gulp.src('dist/src/js/inject-html.js')
      .pipe(uglify())
      .pipe(gulp.dest('dist/src/js/'));

    if (!enableWatch) {
      done();
    }
  });
}