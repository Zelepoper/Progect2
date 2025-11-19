import gulp from 'gulp';
import plumber from 'gulp-plumber';
import sourcemap from 'gulp-sourcemaps';
import less from 'gulp-less';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import csso from 'postcss-csso';
import rename from 'gulp-rename';
import htmlmin from 'gulp-htmlmin';
import terser from 'gulp-terser';
import imagemin from 'gulp-imagemin';
import imageminMozjpeg from 'imagemin-mozjpeg';
import imageminOptipng from 'imagemin-optipng';
import imageminSvgo from 'imagemin-svgo';
import webp from 'gulp-webp';
import svgstore from 'gulp-svgstore';
import { deleteAsync as del } from 'del';
import { create as browserSync } from 'browser-sync';

const sync = browserSync();

// Clean
const clean = () => del(["build"]);
export { clean };

// Styles
const styles = () => {
  // Основной поток: компиляция LESS → CSS
  return gulp.src("source/less/style.less")
    .pipe(plumber())
    .pipe(sourcemap.init())
    .pipe(less())
    .pipe(postcss([autoprefixer()]))

    // Первый поток: минифицированная версия для build
    .pipe(postcss([csso()]))
    .pipe(rename("style.min.css"))
    .pipe(sourcemap.write("."))
    .pipe(gulp.dest("build/css"))

    // Второй поток: обычная версия для source (без минификации)
    .pipe(sourcemap.write("."))
    .pipe(rename("style.css"))
    .pipe(gulp.dest("source/css"))
    .pipe(sync.stream());
};
export { styles };

// HTML
const html = () => {
  return gulp.src("source/*.html")
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(gulp.dest("build"));
};
export { html };

// Scripts
const scripts = () => {
  return gulp.src("source/js/*.js")
    .pipe(gulp.dest("build/js"))
    .pipe(terser())
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulp.dest("build/js"))
    .pipe(sync.stream());
};
export { scripts };

// Images
const optimizeImages = () => {
  return gulp.src("source/img/**/*.{png,jpg,svg}")
    .pipe(imagemin(
      [
        imageminMozjpeg({ progressive: true }),
        imageminOptipng({ optimizationLevel: 3 }),
        imageminSvgo()
      ],
      { verbose: true }
    ))
    .pipe(gulp.dest("build/img"));
};
export { optimizeImages as images };

// Copy Images
const copyImages = () => {
  return gulp.src("source/img/**/*.{png,jpg,svg}")
    .pipe(gulp.dest("build/img"));
};
export { copyImages };

// WebP
const createWebp = () => {
  return gulp.src("source/img/**/*.{jpg,png}")
    .pipe(webp({ quality: 90 }))
    .pipe(gulp.dest("build/img"));
};
export { createWebp };

// Sprite
const sprite = () => {
  return gulp.src("source/img/icons/*.svg")
    .pipe(svgstore({ inlineSvg: true }))
    .pipe(rename("sprite.svg"))
    .pipe(gulp.dest("build/img"));
};
export { sprite };

// Copy
const copy = (done) => {
  gulp.src(
    [
      "source/fonts/*.{woff2,woff}",
      "source/*.ico",
      "source/img/**/*.svg",
      "!source/img/icons/*.svg",
    ],
    { base: "source" }
  )
    .pipe(gulp.dest("build"));
  done();
};
export { copy };

// Server
const server = (done) => {
  sync.init({
    server: { baseDir: "build" },
    cors: true,
    notify: false,
    ui: false,
  });
  done();
};
export { server };

// Server для source
const serverSource = (done) => {
  sync.init({
    server: { baseDir: "source" },
    cors: true,
    notify: false,
    ui: false,
  });
  done();
};
export { serverSource };

// Reload
const reload = (done) => {
  sync.reload();
  done();
};
export { reload };

// Watcher
const watcher = () => {
  gulp.watch("source/less/**/*.less", gulp.series(styles));
  gulp.watch("source/js/*.js", gulp.series(scripts));
  gulp.watch("source/*.html").on("change", sync.reload);
};
export { watcher };

// Watcher для source
const watcherSource = () => {
  gulp.watch("source/less/**/*.less", gulp.series(styles));
  gulp.watch("source/js/*.js", gulp.series(scripts));
  gulp.watch("source/*.html").on("change", sync.reload);
};
export { watcherSource };

// Build
const build = gulp.series(
  clean,
  copy,
  optimizeImages,
  gulp.parallel(styles, html, scripts, sprite, createWebp)
);
export { build };

// Default
export default gulp.series(
  clean,
  copy,
  copyImages,
  gulp.parallel(styles, html, scripts, sprite, createWebp),
  gulp.series(server, watcher)
);

// Команда для запуска сервера и watcher из папки source: gulp devSource
export const devSource = gulp.series(serverSource, watcherSource);
