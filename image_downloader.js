'use strict'

const request = require('request')
const path = require('path')
const fs = require('fs')
const sanitize = require('sanitize-filename');
const FileProcessor = require('./file_processor');

const onError = (err, done) => {
  if (done) {
    return done(err)
  }
  throw err
}

const downloader = (options = {}) => {
  if (!options.url) {
    throw new Error('The option url is required')
  }
 
  // console.log('new url',options.url)

  if (!options.dest) {
    throw new Error('The option dest is required')
  }

  options = Object.assign({}, options)

  const done = options.done

  delete options.done
  options.encoding = null

  const possiblePathNames = ['.jpg', '.jpeg', '.bmp', '.png', '.svg', '.gif'];
  const urlEndsWithValidImageExtension = possiblePathNames.includes(path.extname(options.url));

  request(options, (err, res, body) => {
    // console.log('res',res)
    // console.log('body',body)
    // console.log('options',options)
    // console.log('status',res.statusCode)
    if (err) {
      return onError(err, done)
    }

    if (body && (res.statusCode === 200 || res.statusCode === 201)) {
       let imageName="";
       if (urlEndsWithValidImageExtension) {
            imageName = path.basename(options.url);
            
        } else {
            var contentType = res.headers['content-type'];
            // console.log('contentType', contentType);
            const extension = contentType.split("/")[1];
            // console.log('extension', extension)
            // var filename = sanitize(UNSAFE_USER_INPUT);

            imageName = `${sanitize(path.basename(options.url))}.${extension}`;
            // console.log('image name', imageName);
        }
        const fileProcessor = new FileProcessor({fileName:imageName,path:options.dest});
        if(options.clone){
           imageName = fileProcessor.getAvailableFileName();
        }
        // console.log('image name from downloader',imageName)
      // if (!path.extname(options.dest)) {
      //   options.dest = path.join(options.dest, path.basename(options.url))
      // }
      // console.log('body',body)
      const encoding = 'binary';
      const flag = options.flag || 'w';
      // console.log('flag',flag)
      fs.writeFile(options.dest+imageName, body, {encoding:encoding,flag}, (err) => {
        
        if (err) {
          // console.error('err',err.name)
          // for(let i in err){
          //   console.log(i,err[i])
          // }
          return onError(err, done)
        }

        if (typeof done === 'function') {
          done(false, options.dest, body)
        }
      })
    } else {
      if (!body) {
        return onError(new Error(`Image loading error - empty body. URL: ${options.url}`), done)
      }
      else if(res.statusCode == 404 ){
        return onError({response:{status:404}},done);
      }
      return onError(new Error(`Image loading error - ${res.statusCode}. URL: ${options.url}`), done)
    }
  })
}

downloader.image = (options = {}) => new Promise((resolve, reject) => {//creates a new wrapper promise that takes options as an an argument.
  options.done = (err, dest, body) => {
    if (err) {
      // console.log('promise rejected from options.done')
      return reject(err);
    }else{
      // console.log('promise resolved from options.done')

      resolve({ filename: dest, image: body })
    }
    
  }

  downloader(options)
})

module.exports = downloader
