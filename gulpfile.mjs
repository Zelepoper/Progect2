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
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import webp from 'gulp-webp';
import svgstore from 'gulp-svgstore';
import { deleteAsync as del } from 'del';
import { create as browserSync } from 'browser-sync';
import through2 from 'through2';

const sync = browserSync();

// Clean
const clean = () => del(["build"]);
export { clean };

// Styles
const styles = () => {
  const unminifiedStream = gulp.src("source/less/style.less")
    .pipe(plumber())
    .pipe(sourcemap.init())
    .pipe(less())
    .pipe(postcss([autoprefixer()]))
    .pipe(gulp.dest("source/css"))
    .pipe(sourcemap.write("."))
    .pipe(rename("style.css"))
    .pipe(gulp.dest("build/css"))
    .pipe(sync.stream());

  const minifiedStream = gulp.src("source/less/style.less")
    .pipe(plumber())
    .pipe(sourcemap.init())
    .pipe(less())
    .pipe(postcss([autoprefixer(), csso()]))
    .pipe(rename("style.min.css"))
    .pipe(sourcemap.write("."))
    .pipe(gulp.dest("build/css"))
    .pipe(sync.stream());

  return gulp.merge ? gulp.merge(unminifiedStream, minifiedStream) : minifiedStream;
};
export { styles };

// HTML
const html = () => {
  return gulp.src("source/*.html")
    .pipe(plumber())
    .pipe(htmlmin({
      collapseWhitespace: true,
      removeComments: true,
      minifyJS: true,
      minifyCSS: true,
    }))
    .pipe(gulp.dest("build"));
};
export { html };

// Scripts
const scripts = () => {
  const unminifiedStream = gulp.src("source/js/*.js")
    .pipe(plumber())
    .pipe(gulp.dest("build/js"));

  const minifiedStream = gulp.src("source/js/*.js")
    .pipe(plumber())
    .pipe(terser())
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulp.dest("build/js"))
    .pipe(sync.stream());

  return gulp.merge ? gulp.merge(unminifiedStream, minifiedStream) : minifiedStream;
};
export { scripts };

// Copy SVG Images
const copyImages = () => {
  return gulp.src("source/img/**/*.svg")
    .pipe(plumber())
    .pipe(gulp.dest("build/img"));
};
export { copyImages };

// Optimize Images with Sharp
const optimizeImages = async () => {
  const files = await glob('source/img/**/*.{jpg,jpeg,png}');

  await Promise.all(files.map(async (file) => {
    try {
      const relativePath = path.relative('source/img', file);
      const destPath = path.join('build/img', relativePath);

      // Создаем директорию, если она не существует
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Обработка изображений
      if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
        await sharp(file)
          .jpeg({ quality: 80, progressive: true })
          .toFile(destPath);
      } else if (file.endsWith('.png')) {
        await sharp(file)
          .png({ quality: 80 })
          .toFile(destPath);
      }
    } catch (error) {
      console.error(`Error processing file ${file}:`, error.message);
    }
  }));
};
export { optimizeImages as images };

// Resize and Convert to WebP
const createWebp = () => {
  return gulp.src("source/img/**/*.{jpg,png}")
    .pipe(plumber())
    .pipe(through2.obj(async (file, enc, cb) => {
      try {
        const resizedImage = await sharp(file.path)
          .resize(1280) // Максимальная ширина
          .toBuffer();
        file.contents = resizedImage;
        cb(null, file);
      } catch (error) {
        cb(error);
      }
    }))
    .pipe(webp({
      quality: 60,
      method: 6,
      alphaQuality: 50,
      lossless: false,
      nearLossless: 60,
      sharpness: 2,
      effort: 6
    }))
    .pipe(gulp.dest("build/img"));
};
export { createWebp };

// Sprite
const sprite = () => {
  return gulp.src("source/img/icons/*.svg")
    .pipe(plumber())
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
      "source/*.ico"
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
  gulp.watch("source/img/**/*", gulp.series(copyImages, optimizeImages, createWebp, sync.reload));
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
  copyImages,
  gulp.parallel(optimizeImages, createWebp),
  gulp.parallel(styles, html, scripts, sprite)
);
export { build };

// Default
export default gulp.series(
  clean,
  copy,
  copyImages,
  gulp.parallel(optimizeImages, createWebp),
  gulp.parallel(styles, html, scripts, sprite),
  gulp.series(server, watcher)
);

// Команда для запуска сервера и watcher из папки source: gulp devSource
export const devSource = gulp.series(serverSource, watcherSource);
