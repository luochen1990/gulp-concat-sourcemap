gulp = require('gulp')
sourcemaps = require('gulp-sourcemaps')
concat = require('../..')

gulp.task 'concat', ->
	return gulp.src(['./path1/file1.js', './path2/file2.js'])
		.pipe sourcemaps.init()
			.pipe concat 'file.js'
		.pipe sourcemaps.write('.', includeContent: true)
		.pipe gulp.dest('./build')

gulp.task 'default', ['concat']

