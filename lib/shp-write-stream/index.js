/* eslint-disable */
const {Writable} = require('stream');
const pump = require('pump');
const shpWritter = require('./shp');
const DbfWritter = require('./dbf');
class Input extends Writable {
  constructor(schema, createStream, opts, cb) {
    super({
      objectMode: true
    });
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }
    if (typeof opts.preferPoint === 'undefined') {
      this.preferPoint = true;
    } else {
      this.preferPoint = !!opts.preferPoint;
    }
    if (Array.isArray(schema)) {
      this.schema = {
        point: schema,
        multipoint: schema,
        line: schema,
        polygon: schema
      }
    } else {
      this.schema = schema
    }
    this.schema = schema;
    this.createStream = createStream;
    this.cb = cb;
    this.cbCalled = false;
    this.toClose = [];
    this.typeStreams = new Map();
    this.inProgress = 0;
    this.out = {};
    this.on('finish', ()=>{
      for (let stream of this.toClose) {
        stream.end();
      }
    });
  }
  _write(chunk, _, next) {
    const geom = chunk.geometry;
    const properties = chunk.properties;
    const {dbf,shp} = this.getStream(geom.type);
    if (!dbf || !shp) {
      return next();
    }
    let otherDone = false;
    function done(err) {
      if (err) {
        return next(err);
      }
      if (otherDone) {
        next();
      } else {
        otherDone = true;
      }
    }
    shp.write(geom, done);
    dbf.write(properties, done);
  }
  getStream(type) {
    let shpType;
    switch (type) {
      case 'Point':
        if (this.preferPoint) {
          shpType = 'point';
        } else {
          shpType = 'multipoint';
        }
        break;
      case 'MultiPoint':
        shpType = 'multipoint';
        break;
      case 'LineString':
      case 'MultiLineString':
        shpType = 'line';
        break;
      case 'Polygon':
      case 'MultiPolygon':
        shpType = 'polygon';
        break;
      default:
        return {};
    }
    if (this.typeStreams.has(shpType)) {
      return this.typeStreams.get(shpType);
    }
    if (!this.schema[shpType]) {
      throw new Error('no schema for type')
    }
    const dbf = new DbfWritter(this.schema[shpType]);
    const {shp, shx} = shpWritter(shpType);
    const dbfOut = this.createStream(shpType, 'dbf');
    const shpOut = this.createStream(shpType, 'shp');
    const shxOut = this.createStream(shpType, 'shx');
    this.handlePiping(dbf, dbfOut, shpType, 'dbf');
    this.handlePiping(shp, shpOut, shpType, 'shp');
    this.handlePiping(shx, shxOut);
    const out = {dbf, shp, shx};
    this.typeStreams.set(shpType, out);
    return out;
  }
  callCB(err, data) {
    if (this.cbCalled) {
      return;
    }
    this.cbCalled = true;
    let cb = this.cb;
    cb(err, data);
  }
  maybeFinish() {
    if (this.inProgress) {
      return;
    }
    this.callCB(null, this.out);
  }
  handlePiping(from, to, type, file) {
    this.toClose.push(from);
    this.inProgress++;
    pump(from, to, err=>{
      this.inProgress--;
      if (err) {
        return this.callCB(err);
      }
      if (type) {
        if (!this.out[type]) {
          this.out[type] = {};
        }
        if (file === 'shp') {
          let {shp, shx} = from.generateHeader();
          this.out[type].shp = shp;
          this.out[type].shx = shx;
        } else if (file === 'dbf') {
          this.out[type].dbf = from.generateHeader();
        }
      }
      this.maybeFinish();
    })
  }
}

module.exports = function (schema, createStream, cb) {
  return new Input(schema, createStream ,cb);
}
