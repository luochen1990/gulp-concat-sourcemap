'use strict';

var fs = require('fs');
var path = require('path');
var through = require('through');

var PluginError = require('gulp-util').PluginError;
var File = require('gulp-util').File;

var SourceMapConsumer = require('source-map').SourceMapConsumer;
var SourceMapGenerator = require('source-map').SourceMapGenerator;
var SourceNode = require('source-map').SourceNode;

module.exports = function(fileName, opts) {
    if (!fileName) {
        throw new PluginError('gulp-concat-sourcemap', 'Missing fileName option for gulp-concat-sourcemap');
    }

    opts = opts || {};

    var firstFile = null;

    var sourceNode = new SourceNode();

    function bufferContents(file) {
        if (file.isNull()) return; // ignore
        if (file.isStream()) return this.emit('error', new PluginError('gulp-concat-sourcemap', 'Streaming not supported'));

        if (!firstFile) firstFile = file;

        var rel = path.relative(file.cwd, file.path).replace(/\\/g, '/');

        if(opts.prefix) {
            var p = opts.prefix;
            while(p-- > 0) {
                rel = rel.substring(rel.indexOf('/') + 1);
            }
        }

        // remove utf-8 byte order mark
        if (file.contents[0] === 0xEF && file.contents[1] === 0xBB && file.contents[2] === 0xBF) {
            file.contents = file.contents.slice(3);
        }
        
        if(file.sourceMap && file.sourceMap.mappings != '') {
          sourceNode.add(SourceNode.fromStringWithSourceMap(file.contents.toString('utf8') + '\n\n', new SourceMapConsumer(file.sourceMap)));
        } else {
            file.contents.toString('utf8').split('\n').forEach(function(line, j){
                sourceNode.add(new SourceNode(j + 1, 0, rel, line + '\n'));
            });
            sourceNode.add('\n');
        }
          
          
        if (opts.sourcesContent) {
            sourceNode.setSourceContent(rel, file.contents.toString('utf8'));
        }
    }

    function endStream(){
        if (!firstFile) return this.emit('end');

        var contentPath = path.join(process.cwd(), fileName),
            mapPath = contentPath + '.map';
        
        if(!firstFile.sourceMap) {
            if (/\.css$/.test(fileName)) {
                sourceNode.add('/*# sourceMappingURL=' + (opts.sourceMappingBaseURL || '') + fileName + '.map' + ' */');
            } else {
                sourceNode.add('//# sourceMappingURL=' + (opts.sourceMappingBaseURL || '') + fileName + '.map');
            }
        }

        var codeMap = sourceNode.toStringWithSourceMap({
            file: fileName,
            sourceRoot: opts.sourceRoot || ''
        });

        var sourceMap = codeMap.map.toJSON();
                                
        sourceMap.file = path.basename(sourceMap.file);

        var contentFile = new File({
            path: contentPath,
            contents: new Buffer(codeMap.code)
        });
      
        if(firstFile.sourceMap){
            contentFile.sourceMap = sourceMap;
        } else {
            var mapFile = new File({
                path: mapPath,
                contents: new Buffer(JSON.stringify(sourceMap, null, '  '))
            });
        }

        this.emit('data', contentFile);
        if(!firstFile.sourceMap) this.emit('data', mapFile);
        this.emit('end');
    }

    return through(bufferContents, endStream);
};
