var gulp = require('gulp'),
sass = require('gulp-ruby-sass'),
autoprefixer = require('gulp-autoprefixer'),
cssnano = require('gulp-cssnano'),
jshint = require('gulp-jshint'),
uglify = require('gulp-uglify'),
imagemin = require('gulp-imagemin'),
rename = require('gulp-rename'),
concat = require('gulp-concat'),
notify = require('gulp-notify'),
cache = require('gulp-cache'),
livereload = require('gulp-livereload'),
del = require('del');

/**
 * The gulp CLI is stream driven, therefore the output of one command can be piped/streamed into another (chained commands).
 * A gulp task to preprocess a sass stylesheet, create the auto-prefixes required for different browsers and generate a minified version.
 * 
 * @param function | mixed
 * @return bool | string
 */
gulp.task('styles', function() {
    return sass('src/styles/main.scss', { style: 'expanded' })
    .pipe(autoprefixer('last 2 version'))
    .pipe(gulp.dest('dist/assets/styles'))
    .pipe(rename({suffix: '.min'}))
    .pipe(cssnano())
    .pipe(gulp.dest('dist/assets/styles'))
    .pipe(notify({ message: 'Task - Styles' }));
});

/**
 * The gulp CLI is stream driven, therefore the output of one command can be piped/streamed into another (chained commands).
 * A gulp task to check all JS files for errors, concat and minify.
 * 
 * @param function | mixed
 * @return bool | string
 */
// gulp.task('scripts', function() {
//   return gulp.src('src/scripts/**/*.js')
//     .pipe(jshint('.jshintrc'))
//     .pipe(jshint.reporter('default'))
//     .pipe(concat('main.js'))
//     .pipe(gulp.dest('dist/assets/scripts'))
//     .pipe(rename({suffix: '.min'}))
//     .pipe(uglify())
//     .pipe(gulp.dest('dist/assets/scripts'))
//     .pipe(notify({ message: 'Task - Scripts' }));
// });

gulp.task('scripts', function() {
  return gulp.src(['src/scripts/**/*.js', '!src/scripts/libs{,/**}'])
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'))
    // .pipe(concat('main.js'))
    // .pipe(gulp.dest('dist/assets/scripts'))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(gulp.dest('dist/assets/scripts'))
    .pipe(notify({ message: 'Task - Scripts' }));
});

gulp.task('scripts_libs', function() {
  return gulp.src(['src/scripts/libs/**'])
    .pipe(gulp.dest('dist/assets/scripts/libs'))
    .pipe(notify({ message: 'Task - Scripts Libs' }));
});

// 
/**
 * The gulp CLI is stream driven, therefore the output of one command can be piped/streamed into another (chained commands).
 * A gulp task to watch for changes in the primary .scss file, and in turn trigger the styles task for execution.
 * 
 * @param function | mixed
 * @return bool | string
 */
gulp.task('watch', function() {
  gulp.watch('src/styles/main.scss', ['styles']);
  gulp.watch('src/scripts/**/*.js', ['scripts']);  
  gulp.watch('src/scripts/libs/**', ['scripts_libs']);    
});