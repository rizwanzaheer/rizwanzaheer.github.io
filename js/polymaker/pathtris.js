/**
Copyright 2013 - Google, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var PathTris = function() {

  // externals
  // this.steps = 9;
  // this.spread = 50;
  // this.jitter = 40;
  // this.splitProbability = 10;
  // this.color1 = '#3481AD';
  // this.color2 = '#FF007F';
  // this.colorGroup = 'blog';
  // this.flow = 'swell';
  // this.firstRender_ = true;
  // this.transitionDelay = 10;
  // this.transitionTime = 800;

  this.steps = 10;
  this.spread = 100;
  this.jitter = 100;
  this.splitProbability = 50;
  this.color1 = '#07cb79';
  this.color2 = '#333333';
  this.colorGroup = 'tutorials';
  this.flow = 'random';
  this.firstRender_ = true;
  this.transitionDelay = 50;
  this.transitionTime = 2000;

  // internals
  this.canvas_ = document.getElementById('canvas');
  this.colorCanvas_ = document.createElement('canvas');
  //this.shadowCanvas_ = document.createElement('canvas');
  this.ctx_ = canvas.getContext('2d');
  this.colorCtx_ = this.colorCanvas_.getContext('2d');
  //this.shadowCtx_ = this.shadowCanvas_.getContext('2d');
  this.colorData_ = null;
  this.controlPoints_ = [];
  this.colors_ = [];
  this.contourPoints_ = [];
  this.points_ = [];
  this.triangles_ = [];
  this.width_ = 0;
  this.height_ = 0;

  //this.shadow_ = { size: 0 };

  this.txMin_ = Number.POSITIVE_INFINITY;
  this.tyMin_ = Number.POSITIVE_INFINITY;
  this.txMax_ = Number.NEGATIVE_INFINITY;
  this.tyMax_ = Number.NEGATIVE_INFINITY;

  this.render = this.render.bind(this);
  this.drawAllEntities = this.drawAllEntities.bind(this);

  //this.shadowCanvas_.setAttribute('id', 'shadow-canvas');
  this.colorCanvas_.setAttribute('id', 'color-canvas');
  //document.body.appendChild(this.shadowCanvas_);
};

PathTris.prototype = {

  setColorsFromGroup: function() {
    switch(this.colorGroup) {
      case 'home':
        this.color1 = '#FF8307';
        this.color2 = '#008C8C';
        break;

      case 'blog':
        this.color1 = '#3481AD';
        this.color2 = '#FF007F';
        break;

      case 'tutorials':
        this.color1 = '#50C0FB';
        this.color2 = '#663300';
        break;

      case 'lab':
        this.color1 = '#FFE63E';
        this.color2 = '#58B23D';
        break;
    }
  },

  calculate: function() {

    if (this.controlPoints_.length < 4)
      return;

    var HALF_JITTER = this.jitter * 0.5;
    var ctx = this.ctx_;
    var split = 1;
    var splitProbability = this.splitProbability / 100;
    var stepVal = 1 / this.steps;
    var point;

    var p1 = this.controlPoints_[0];
    var p2 = this.controlPoints_[1];
    var p3 = this.controlPoints_[2];
    var p4 = this.controlPoints_[3];

    var p12 = new Point();
    var p23 = new Point();
    var p34 = new Point();
    var p123 = new Point();
    var p234 = new Point();
    var p1234 = new Point();

    var lastPoint = new Point();
    var angle;

    var pVal = 0;
    this.points_.length = 0;
    this.contourPoints_.length = 0;

    for (var p = 0; p < this.steps; p++) {

      pVal = p * stepVal;

      if (this.flow === 'swell') {
        if (Math.random() > splitProbability) {
          if (pVal <= 0.5)
            split++;
          else
            split--;
        }
      } else {
        split = Math.round(2 + Math.random() * 5);
      }

      // guarantee at least 1 point
      split = Math.max(split, 2);

      p12.lerp(p1, p2, pVal);
      p23.lerp(p2, p3, pVal);
      p34.lerp(p3, p4, pVal);

      p123.lerp(p12, p23, pVal);
      p234.lerp(p23, p34, pVal);

      p1234.lerp(p123, p234, pVal);

      angle = lastPoint.angleTo(p1234);

      lastPoint.x = p1234.x;
      lastPoint.y = p1234.y;

      // for the first point just
      // set up the values.
      if (p === 0)
        continue;

      for (var n = 0; n < split; n++) {
        var distance = (split - 1) * this.spread;
        var nDistance = -distance * 0.5 + n * this.spread;

        var x = p1234.x - Math.sin(angle) * nDistance;
        var y = p1234.y + Math.cos(angle) * nDistance;

        x += Math.random() * this.jitter - HALF_JITTER;
        y += Math.random() * this.jitter - HALF_JITTER;

        point = new poly2tri.Point(Math.round(x), Math.round(y));

        // outer points
        if (n === 0)
          this.contourPoints_[p - 1] = point;
        else if (n === split - 1)
          this.contourPoints_[this.steps * 2 - p - 1] = point;
        else
          this.points_.push(point);

      }

    }

    // drop in the start and end points as contours
    var pStart = new poly2tri.Point(p1.x, p1.y);
    var pEnd = new poly2tri.Point(p4.x, p4.y);
    this.contourPoints_.unshift(pStart);
    this.contourPoints_[this.steps] = pEnd;

    sweepContext = new poly2tri.SweepContext(this.contourPoints_, {cloneArrays: true});
    sweepContext.addPoints(this.points_);
    sweepContext.triangulate();

    this.triangles_ = sweepContext.getTriangles() || [];

  },

  calculateColorsAndDimensionsAndWriteSVG: function() {

    var t, triangle, tp1, tp2, tp3;
    this.txMin_ = Number.POSITIVE_INFINITY;
    this.tyMin_ = Number.POSITIVE_INFINITY;
    this.txMax_ = Number.NEGATIVE_INFINITY;
    this.tyMax_ = Number.NEGATIVE_INFINITY;

    for (t = 0; t < this.triangles_.length; t++) {

      triangle = this.triangles_[t];

      tp1 = triangle.points_[0];
      tp2 = triangle.points_[1];
      tp3 = triangle.points_[2];

      this.txMin_ = Math.min(this.txMin_, tp1.x, tp2.x, tp3.x);
      this.tyMin_ = Math.min(this.tyMin_, tp1.y, tp2.y, tp3.y);

      this.txMax_ = Math.max(this.txMax_, tp1.x, tp2.x, tp3.x);
      this.tyMax_ = Math.max(this.tyMax_, tp1.y, tp2.y, tp3.y);

    }

    this.colorCanvas_.width = this.txMax_ - this.txMin_;
    this.colorCanvas_.height = this.tyMax_ - this.tyMin_;

    var colGradient = this.colorCtx_.createLinearGradient(0, 0, this.colorCanvas_.width, 0);
    colGradient.addColorStop(0, this.color1);
    colGradient.addColorStop(0.5, this.color2);
    colGradient.addColorStop(1, this.color1);

    var whiteBlackGradient = this.colorCtx_.createLinearGradient(0, 0, 0, this.colorCanvas_.height);
    whiteBlackGradient.addColorStop(0, '#FFF');
    whiteBlackGradient.addColorStop(0.4999, 'rgba(255,255,255,0)');
    whiteBlackGradient.addColorStop(0.5, 'rgba(0,0,0,0)');
    whiteBlackGradient.addColorStop(1, '#000');

    this.colorCtx_.fillStyle = colGradient;
    this.colorCtx_.fillRect(0, 0, this.txMax_ - this.txMin_, this.tyMax_ - this.tyMin_);
    this.colorCtx_.fillStyle = whiteBlackGradient;
    this.colorCtx_.fillRect(0, 0, this.txMax_ - this.txMin_, this.tyMax_ - this.tyMin_);

    if (this.txMax_ !== Number.NEGATIVE_INFINITY)
      this.colorData_ = this.colorCtx_.getImageData(0, 0, this.colorCanvas_.width, this.colorCanvas_.height);

    for (t = 0; t < this.triangles_.length; t++) {

      triangle = this.triangles_[t];

      tp1 = triangle.points_[0];
      tp2 = triangle.points_[1];
      tp3 = triangle.points_[2];

      triangle.color = this.lookUpColor_(tp1, tp2, tp3);
    }

    this.writeSVGCode(this.txMin_, this.tyMin_,
          this.txMax_ - this.txMin_, this.tyMax_ - this.tyMin_);

  },

  renderControlPoints_: function() {

    var TAU = Math.PI * 2;
    var ctx = this.ctx_;
    var point;

    ctx.clearRect(0, 0, this.width_, this.height_);

    for (var c = 0; c < this.controlPoints_.length; c++) {
      point = this.controlPoints_[c];
      ctx.fillStyle = "#888";
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, TAU, false);
      ctx.closePath();
      ctx.fill();
    }
  },

  applyTweensToTrianglesAndFlatten_: function() {

    TWEEN.removeAll();
    this.killRAF();

    for (t = 0; t < this.triangles_.length; t++) {

      triangle = this.triangles_[t];

      var tp1 = triangle.points_[0];
      var tp2 = triangle.points_[1];
      var tp3 = triangle.points_[2];
      var tColor = triangle.color;

      // cache the end values
      var tp1x = tp1.x;
      var tp1y = tp1.y;
      var tp2x = tp2.x;
      var tp2y = tp2.y;
      var tp3x = tp3.x;
      var tp3y = tp3.y;

      // calculate the mid values
      var cx = (tp1x + tp2x + tp3x) / 3;
      var cy = (tp1y + tp2y + tp3y) / 3;

      // create a new set of points
      triangle.points_[0] = {x: cx, y: cy};
      triangle.points_[1] = {x: cx, y: cy};
      triangle.points_[2] = {x: cx, y: cy};

      new TWEEN.Tween(triangle.points_[0])
        .to({ x: tp1x, y: tp1y }, this.transitionTime)
        .easing(TWEEN.Easing.Quintic.InOut)
        .delay(t * this.transitionDelay)
        .start();

      new TWEEN.Tween(triangle.points_[1])
        .to({ x: tp2x, y: tp2y }, this.transitionTime)
        .easing(TWEEN.Easing.Quintic.InOut)
        .delay(t * this.transitionDelay)
        .start();

      var triTween = new TWEEN.Tween(triangle.points_[2])
        .to({ x: tp3x, y: tp3y }, this.transitionTime)
        .easing(TWEEN.Easing.Quintic.InOut)
        .delay(t * this.transitionDelay);

      if (t == this.triangles_.length - 1)
        triTween.onComplete(this.killRAF);

      triTween.start();
    }

    //this.shadow_.size = 0;
    // new TWEEN.Tween(this.shadow_)
    //   .to({ size: 1 }, this.triangles_.length * this.transitionDelay + this.transitionTime)
    //   .easing(TWEEN.Easing.Quintic.InOut)
    //   .start();

  },

  killRAF: function() {
    this.animating_ = false;
  },

  render: function() {

    // bail if we have too few control points
    if (this.controlPoints_.length < 4) {
      this.renderControlPoints_();
      return;
    }

    // same for triangles
    if (!this.triangles_)
      return;

    // if this is the first time we've called render
    // calculate all the colors we need
    if (this.firstRender_) {
      this.firstRender_ = false;
      this.calculateColorsAndDimensionsAndWriteSVG();
      this.applyTweensToTrianglesAndFlatten_();
      //this.createShadow_();
      this.animating_ = true;
    }

    if (this.animating_)
      webkitRequestAnimationFrame(this.drawAllEntities);

    TWEEN.update();

  },

  createShadow_: function() {

    var padding = 25;
    var doublePadding = padding * 2;
    var height = 10;
    var width = this.txMax_ - this.txMin_;
    var TAU = Math.PI * 2;
    var blur = 3;
    var midX = padding + width / 2;
    var midY = padding + height / 2;
    var grad = this.shadowCtx_.createRadialGradient(midX, midY, 0, midX, midY, width / 2);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");

    this.shadowCanvas_.width = doublePadding + width;
    this.shadowCanvas_.height = doublePadding + height;

    this.shadowCtx_.save();
    this.shadowCtx_.translate(0, padding + height / 2);
    this.shadowCtx_.scale(1, height / width);
    this.shadowCtx_.translate(0, - padding - height / 2);
    this.shadowCtx_.beginPath();
    this.shadowCtx_.arc(padding + width / 2, padding + height / 2, width / 2, 0, TAU, false);
    this.shadowCtx_.closePath();
    this.shadowCtx_.fillStyle = grad;
    this.shadowCtx_.fill();
    this.shadowCtx_.restore();

    boxBlurCanvasRGBA('shadow-canvas', 0, 0, width + doublePadding, height + doublePadding, blur, 2);
  },

  drawAllEntities: function() {

    var ctx = this.ctx_;

    ctx.clearRect(0, 0, this.width_, this.height_);

    var triangleColor = null;

    for (t = 0; t < this.triangles_.length; t++) {

      var triangle = this.triangles_[t];

      var tp1 = triangle.points_[0];
      var tp2 = triangle.points_[1];
      var tp3 = triangle.points_[2];

      if (t === 0)
        ctx.moveTo(tp1.x, tp1.y);

      ctx.beginPath();
      ctx.moveTo(tp1.x, tp1.y);
      ctx.lineTo(tp2.x, tp2.y);
      ctx.lineTo(tp3.x, tp3.y);
      ctx.closePath();

      ctx.lineWidth = 0.6;
      ctx.fillStyle = triangle.color;
      ctx.strokeStyle = triangle.color;
      ctx.fill();
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(this.txMin_, this.tyMax_);
    // ctx.scale(0.8 + this.shadow_.size * 0.2, 1);
    // ctx.globalAlpha = this.shadow_.size;
    // ctx.translate(-this.txMin_, -this.tyMax_);
    // ctx.drawImage(this.shadowCanvas_, this.txMin_, this.tyMax_);
    ctx.restore();

    if (this.animating_)
      webkitRequestAnimationFrame(this.render);
  },

  lookUpColor_: function(tp1, tp2, tp3) {

    var data = this.colorData_.data;
    var x = Math.floor(((tp1.x + tp2.x + tp3.x) / 3) - this.txMin_);
    var y = Math.floor(((tp1.y + tp2.y + tp3.y) / 3) - this.tyMin_);

    var base = (y * this.colorData_.width + x) * 4;
    var color = (data[base    ] << 16) +
                (data[base + 1] << 8) +
                data[base + 2];

    var red = data[base].toString(16);
    var green = data[base + 1].toString(16);
    var blue = data[base + 2].toString(16);

    if (red.length < 2)
      red = '0' + red;

    if (green.length < 2)
      green = '0' + green;

    if (blue.length < 2)
      blue = '0' + blue;

    return '#' + red + green + blue;
  },

  initPoints: function() {
    var ratio = $(window).width()/1350;
    var pointArray = [
      {
        x:91*ratio,
        y:605*ratio
      },
      {
        x:348*ratio,
        y:212*ratio
      },
      {
        x:1115*ratio,
        y:501*ratio
      },
      {
        x:1300*ratio,
        y:229*ratio
      },
    ];
    for (var i = 0; i < pointArray.length; i++) {
      var point = new Point(pointArray[i].x,pointArray[i].y);
      this.controlPoints_.push(point);
    }
    this.calculate();
    this.render();
  },
  createID: function() {
    var id = '';
    for (var i = 0; i < 8; i++) {
      code = 65 + Math.round(Math.random() * 26);
      id += String.fromCharCode(code);
    }

    return id;
  },

  showSVGCode: function() {
    var codeOutput = document.getElementById('output');
    codeOutput.classList.add('visible');
  },

  writeSVGCode: function(x, y, width, height) {

    var codeOutputText = document.getElementById('output-text');
    var padding = 40;
    var doublePadding = padding * 2;

    var code = '<svg version="1.1" class="shape-reference" xmlns="http://www.w3.org/2000/svg" ' +
        'width="' + (width + doublePadding) + '" height="' + (height + doublePadding) + '">\n';

    code += '  <defs>\n' +
    '    <filter id="blur-8">\n' +
    '      <feGaussianBlur in="SourceGraphic" stdDeviation="8" />\n' +
    '    </filter>\n' +
    '    <filter id="blur-6">\n' +
    '      <feGaussianBlur in="SourceGraphic" stdDeviation="6" />\n' +
    '    </filter>\n' +
    '    <filter id="blur-4">\n' +
    '      <feGaussianBlur in="SourceGraphic" stdDeviation="4" />\n' +
    '    </filter>\n' +
    '  </defs>\n\n';
    code += "  <g id=\"color-block\">\n";

    x -= padding;
    y -= padding;

    for (t = 0; t < this.triangles_.length; t++) {
      triangle = this.triangles_[t];
      tp1 = triangle.points_[0];
      tp2 = triangle.points_[1];
      tp3 = triangle.points_[2];

      code += '    <polygon fill-rule="evenodd" clip-rule="evenodd"' +
        ' fill="' + triangle.color + '"' +
        ' stroke="' + triangle.color + '"' +
        ' stroke-width="0.6"' +
        ' points="' + (tp1.x - x) + ',' + (tp1.y - y) + ' ' +
                      (tp2.x - x) + ',' + (tp2.y - y) + ' ' +
                      (tp3.x - x) + ',' + (tp3.y - y) + '"/>\n';
    }

    code += '  </g>\n</svg>';

    codeOutputText.textContent = code;
  },

  init: function() {
    this.initPoints();
    this.reset();
    this.repeat();
  },

  reset: function() {

    var canvasStyles = window.getComputedStyle(this.canvas_);

    this.width_ = parseInt(canvasStyles['width'], 10);
    this.height_ = parseInt(canvasStyles['height'], 10);

    this.canvas_.width = this.width_;
    this.canvas_.height = this.height_;

    this.steps = 9;
    this.spread = 50;
    this.jitter = 40;
    this.splitProbability = 10;

    this.calculate();
    this.render();
    this.calculateColorsAndDimensionsAndWriteSVG();

  },

  resetFirstRender: function() {
    this.firstRender_ = true;
  },

  repeat: function() {
    this.calculate();
    this.resetFirstRender();
    this.render();
  }
};

var Point = function(x, y) {
  this.x = x;
  this.y = y;
};

Point.prototype = {
  lerp: function (p1, p2, t) {
    this.x = p1.x + (p2.x - p1.x) * t;
    this.y = p1.y + (p2.y - p1.y) * t;
  },

  angleTo: function(p1) {
    return Math.atan2(this.y - p1.y, this.x - p1.x);
  }
};

var Triangle = function(p1, p2, p3) {
  this.p1 = p1;
  this.p2 = p2;
  this.p3 = p3;
};
