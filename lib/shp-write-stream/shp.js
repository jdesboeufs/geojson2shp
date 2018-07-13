/* eslint-disable */
const {Transform} = require('stream');

module.exports = shpWritter;
let typeMap = new Map([
  ['point',1],
  ['multipoint', 8],
  ['line', 3],
  ['polygon', 5]
]);
class Shx extends Transform {
  constructor(){
    super({
      objectMode: true
    });
    this.offset = 50;
    this.records = 0;
  }
  _transform(num, _, next) {
    var out = Buffer.allocUnsafe(8);
    out.writeInt32BE(this.offset, 0);
    out.writeInt32BE(num, 4);
    this.offset += num;
    this.records++;
    this.push(out);
    next();
  }
  fixHeader(header) {
    header.writeInt32BE(50 + this.records * 4, 24);
  }
}
class Shp extends Transform {
  constructor(type, shx){
    super({
      objectMode: true
    });
    this.type = type;
    this.shx = shx;
    this.minx = Infinity;
    this.miny = Infinity;
    this.maxx = -Infinity;
    this.maxy = -Infinity;
    this.length = 50;
    this.recNum = 0;
    this.createRecord = this[type];
  }
  _transform(chunk, _, next) {
    var out = this.createRecord(chunk);
    this.push(out);
    var len = out.length/2;
    this.length += len;
    this.shx.write(len, err=>{
      next(err);
    });
  }
  // all points are actually multipoints here
  point(chunk) {
    const coordinates = chunk.coordinates;
    const out = Buffer.allocUnsafe(28);
    out.writeInt32BE(this.recNum++, 0);
    out.writeInt32BE(10, 4);
    out.writeInt32LE(1, 8);
    out.writeDoubleLE(coordinates[0], 12);
    out.writeDoubleLE(coordinates[1], 20);
    if (coordinates[0] < this.minx) {
      this.minx = coordinates[0];
    }
    if (coordinates[0] > this.maxx) {
      this.maxx = coordinates[0];
    }
    if (coordinates[1] < this.miny) {
      this.miny = coordinates[1];
    }
    if (coordinates[1] > this.maxy) {
      this.maxy = coordinates[1];
    }
    return out;
  }
  multipoint(chunk) {
    let coordinates;
    if (chunk.type === 'Point') {
      coordinates = [chunk.coordinates];
    } else if (chunk.type === 'MultiPoint') {
      coordinates = chunk.coordinates;
    }
    const points = coordinates.length;
    const length = 8 + 40 + points * 16;
    const out = Buffer.allocUnsafe(length);
    out.writeInt32BE(++this.recNum, 0);
    out.writeInt32BE((length - 8)/2, 4);
    out.writeInt32LE(8, 8);
    out.writeInt32LE(points, 44);
    let bbox = [Infinity, Infinity, -Infinity, -Infinity];
    let i = -1;
    let place = 48;
    while (++i < points) {
      let point = coordinates[i];
      this.updateBbox(bbox, point);
      out.writeDoubleLE(point[0], place);
      place += 8;
      out.writeDoubleLE(point[1], place);
      place += 8;
    }
    this.handleBbox(bbox, out, 12, true);
    return out;
  }
  handleBbox(bbox, buffer, offset, updateMainBbox) {
    let i = -1;
    let len = 4;
    while (++i < len) {
      buffer.writeDoubleLE(bbox[i], offset + (i * 8));
    }
    if (updateMainBbox) {
      if (bbox[0] < this.minx) {
        this.minx = bbox[0];
      }
      if (bbox[2] > this.maxx) {
        this.maxx = bbox[2];
      }
      if (bbox[1] < this.miny) {
        this.miny = bbox[1];
      }
      if (bbox[3] > this.maxy) {
        this.maxy = bbox[3];
      }
    }
  }
  updateBbox(bbox, point) {
    if (point[0] < bbox[0]) {
      bbox[0] = point[0];
    }
    if (point[0] > bbox[2]) {
      bbox[2] = point[0];
    }
    if (point[1] < bbox[1]) {
      bbox[1] = point[1];
    }
    if (point[1] > bbox[3]) {
      bbox[3] = point[1];
    }
  }
  line(chunk) {
    if (chunk.type === 'LineString') {
      return this.lineString(chunk.coordinates);
    } else if (chunk.type === 'MultiLineString') {
      return this.multiLineString(chunk.coordinates);
    }
  }
  lineString(coordinates) {
    const points = coordinates.length;
    const length = 8 + 48 + points * 16;
    const out = Buffer.allocUnsafe(length);
    out.writeInt32BE(++this.recNum, 0);
    out.writeInt32BE((length - 8)/2, 4);
    out.writeInt32LE(3, 8);
    out.writeInt32LE(1, 44);
    out.writeInt32LE(points, 48);
    out.writeInt32LE(0, 52);
    let bbox = [Infinity, Infinity, -Infinity, -Infinity];
    let i = -1;
    let place = 56;
    while (++i < points) {
      let point = coordinates[i];
      this.updateBbox(bbox, point);
      out.writeDoubleLE(point[0], place);
      place += 8;
      out.writeDoubleLE(point[1], place);
      place += 8;
    }
    this.handleBbox(bbox, out, 12, true);
    return out;
  }
  multiLineString(coordinates) {
    const segments = coordinates.length;
    let points = 0;
    for (let line of coordinates) {
      points += line.length;
    }
    const length = 8 + 44 + points * 16 + segments * 4;
    const out = Buffer.allocUnsafe(length);
    out.writeInt32BE(++this.recNum, 0);
    out.writeInt32BE((length - 8)/2, 4);
    out.writeInt32LE(3, 8);
    out.writeInt32LE(segments, 44);
    out.writeInt32LE(points, 48);
    let partOffset = 52;
    let place = 52 + segments * 4;
    let index = 0;
    let bbox = [Infinity, Infinity, -Infinity, -Infinity];
    let i = -1;
    while (++i < segments) {
      out.writeInt32LE(index, partOffset);
      partOffset += 4;
      let segment = coordinates[i];
      let j = -1;
      while (++j  < segment.length) {
        index++;
        let point = segment[j];
        this.updateBbox(bbox, point);
        out.writeDoubleLE(point[0], place);
        place += 8;
        out.writeDoubleLE(point[1], place);
        place += 8;
      }
    }
    this.handleBbox(bbox, out, 12, true);
    return out;
  }
  multiPolygon(coordinates) {
    const polys = coordinates.length;
    let rings = 0;
    let points = 0;
    for (let poly of coordinates) {
      rings += poly.length;
      for (let ring of poly) {
        points += ring.length;
      }
    }
    const length = 8 + 48 + points * 16 + rings * 4;
    const out = Buffer.allocUnsafe(length);
    out.writeInt32BE(++this.recNum, 0);
    out.writeInt32BE((length - 8)/2, 4);
    out.writeInt32LE(5, 8);
    out.writeInt32LE(rings, 44);
    out.writeInt32LE(points, 48);
    let partOffset = 52;
    let place = 52 + rings * 4;
    let index = 0;
    let bbox = [Infinity, Infinity, -Infinity, -Infinity];
    let i = -1;
    while (++i < polys) {
      let poly = coordinates[i];
      let j = -1;
      while (++j  < poly.length) {
        out.writeInt32LE(index, partOffset);
        partOffset += 4;
        let ring = poly[j];
        if (j) {
          this.ensureCounterClockwise(ring);
        } else {
          this.ensureClockwise(ring);
        }
        let k = -1;
        let rl = ring.length - 1;
        while (++k < rl) {
          index++;
          let point = ring[k];
          if (!j) {
            this.updateBbox(bbox, point);
          }
          out.writeDoubleLE(point[0], place);
          place += 8;
          out.writeDoubleLE(point[1], place);
          place += 8;
        }
        index++;
        out.writeDoubleLE(ring[0][0], place);
        place += 8;
        out.writeDoubleLE(ring[0][1], place);
        place += 8;
      }
    }
    this.handleBbox(bbox, out, 12, true);
    return out;
  }
  ensureClockwise(ring) {
    if (this.isClockwise(ring)) {
      return;
    }
    ring.reverse();
  }
  ensureCounterClockwise(ring) {
    if (this.isClockwise(ring)) {
      ring.reverse();
    }
  }
  isClockwise(ring) {
    let i = 0;
    let prev = ring[0];
    let total = 0;
    while (++i < ring.length) {
      let next = ring[i];
      total += (next[0] - prev[0]) * (next[1] + prev[1]);
      prev = next;
    }
    return total >= 0;
  }
  polygon(chunk) {
    if (chunk.type === 'Polygon') {
      return this.multiPolygon([chunk.coordinates]);
    } else if (chunk.type === 'MultiPolygon') {
      return this.multiPolygon(chunk.coordinates);
    }
  }
  generateHeader() {
    const shp = Buffer.alloc(100);
    shp.writeInt32BE(9994, 0);
    shp.writeInt32BE(this.length, 24);
    shp.writeInt32LE(1000, 28);
    shp.writeInt32LE(typeMap.get(this.type), 32);
    const bbox = [this.minx, this.miny, this.maxx, this.maxy];
    this.handleBbox(bbox, shp, 36, false);
    const shx = Buffer.from(shp);
    this.shx.fixHeader(shx);
    return {
      shp, shx
    };
  }
}
function shpWritter(type) {
  let shx = new Shx();
  let shp = new Shp(type, shx);
  return {shx, shp}
}
