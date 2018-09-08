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

      if (options.mockImages)
        return done(false, options.dest, body)

      let imageName = "";
      if (urlEndsWithValidImageExtension) {
        imageName = path.basename(options.url);

      } else {
        var contentType = res.headers['content-type'];
        const extension = contentType.split("/")[1];


        imageName = `${sanitize(path.basename(options.url))}.${extension}`;
      }
      const fileProcessor = new FileProcessor({ fileName: imageName, path: options.dest });
      if (options.clone) {
        imageName = fileProcessor.getAvailableFileName();
      }

      const encoding = 'binary';
      const flag = options.flag || 'w';
      fs.writeFile(options.dest + imageName, body, { encoding: encoding, flag }, (err) => {

        if (err) {

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
      else if (res.statusCode == 404) {
        return onError({ response: { status: 404 } }, done);
      }
      return onError(new Error(`Image loading error - ${res.statusCode}. URL: ${options.url}`), done)
    }
  })
}

downloader.image = (options = {}) => new Promise((resolve, reject) => {//creates a new wrapper promise that takes options as an an argument.
  options.done = (err, dest, body) => {
    if (err) {
      return reject(err);
    } else {

      resolve({ filename: dest, image: body })
    }

  }

  downloader(options)
})

module.exports = downloader
