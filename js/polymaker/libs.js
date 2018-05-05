/*
 * Poly2Tri Copyright (c) 2009-2013, Poly2Tri Contributors
 * http://code.google.com/p/poly2tri/
 *
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 * * Neither the name of Poly2Tri nor the names of its contributors may be
 *   used to endorse or promote products derived from this software without specific
 *   prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* jshint browser:false, forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true,
   strict:true, undef:true, unused:true, curly:true, immed:true, latedef:true,
   newcap:true, trailing:true, maxcomplexity:11, indent:4
 */


/*
 * Note
 * ====
 * the structure of this JavaScript version of poly2tri intentionnaly follows
 * as closely as possible the structure of the reference C++ version, to make it
 * easier to keep the 2 versions in sync.
 */


/**
 * Module encapsulation
 * @param {Object} global a reference to the global object :
 *                      window in the browser, global on the server
 */
(function(global) {
    "use strict";

// --------------------------------------------------------------poly2tri module

    // Save the previous value of the poly2tri variable,
    // so that it can be restored later on, if noConflict is used.
    var previousPoly2tri = global.poly2tri;

    // The top-level namespace. All public poly2tri classes and functions will
    // be attached to it. Exported for both the browser and the server (Node.js).
    var poly2tri;
    /* global exports */
    if (typeof exports !== 'undefined') {
        poly2tri = exports;
    } else {
        poly2tri = global.poly2tri = {};
    }

    // Runs the library in noConflict mode, returning the poly2tri variable
    // to its previous owner. Returns a reference to this library object.
    poly2tri.noConflict = function() {
        global.poly2tri = previousPoly2tri;
        return this;
    };

// -------------------------------------------------------------------PointError

    /**
     * Custom exception class to indicate invalid Point values
     * @param {String} message          error message
     * @param {array<Point>} points     invalid points
     */
    // Class added in the JavaScript version (was not present in the c++ version)
    var PointError = function (message, points) {
        this.name    = "PointError";
        this.points  = points = points || [];
        this.message = message || "Invalid Points!";
        for (var i = 0; i < points.length; i++) {
            this.message += " " + Point.toString(points[i]);
        }
    };
    PointError.prototype = new Error();
    PointError.prototype.constructor = PointError;


// ------------------------------------------------------------------------Point
    /**
     * Construct a point
     * @param {Number} x    coordinate (0 if undefined)
     * @param {Number} y    coordinate (0 if undefined)
     */
    var Point = function(x, y) {
        this.x = +x || 0;
        this.y = +y || 0;

        // All extra fields added to Point are prefixed with _p2t_
        // to avoid collisions if custom Point class is used.

        // The edges this point constitutes an upper ending point
        this._p2t_edge_list = null;
    };

    /**
     * For pretty printing ex. <i>"(5;42)"</i>)
     */
    Point.prototype.toString = function() {
        return ("(" + this.x + ";" + this.y + ")");
    };

    /**
     * Creates a copy of this Point object.
     * @returns Point
     */
    Point.prototype.clone = function() {
        return new Point(this.x, this.y);
    };

    /**
     * Set this Point instance to the origo. <code>(0; 0)</code>
     */
    Point.prototype.set_zero = function() {
        this.x = 0.0;
        this.y = 0.0;
        return this; // for chaining
    };

    /**
     * Set the coordinates of this instance.
     * @param   x   number.
     * @param   y   number;
     */
    Point.prototype.set = function(x, y) {
        this.x = +x || 0;
        this.y = +y || 0;
        return this; // for chaining
    };

    /**
     * Negate this Point instance. (component-wise)
     */
    Point.prototype.negate = function() {
        this.x = -this.x;
        this.y = -this.y;
        return this; // for chaining
    };

    /**
     * Add another Point object to this instance. (component-wise)
     * @param   n   Point object.
     */
    Point.prototype.add = function(n) {
        this.x += n.x;
        this.y += n.y;
        return this; // for chaining
    };

    /**
     * Subtract this Point instance with another point given. (component-wise)
     * @param   n   Point object.
     */
    Point.prototype.sub = function(n) {
        this.x -= n.x;
        this.y -= n.y;
        return this; // for chaining
    };

    /**
     * Multiply this Point instance by a scalar. (component-wise)
     * @param   s   scalar.
     */
    Point.prototype.mul = function(s) {
        this.x *= s;
        this.y *= s;
        return this; // for chaining
    };

    /**
     * Return the distance of this Point instance from the origo.
     */
    Point.prototype.length = function() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    };

    /**
     * Normalize this Point instance (as a vector).
     * @return The original distance of this instance from the origo.
     */
    Point.prototype.normalize = function() {
        var len = this.length();
        this.x /= len;
        this.y /= len;
        return len;
    };

    /**
     * Test this Point object with another for equality.
     * @param   p   any "Point like" object with {x,y} (duck typing)
     * @return <code>True</code> if <code>this == p</code>, <code>false</code> otherwise.
     */
    Point.prototype.equals = function(p) {
        return this.x === p.x && this.y === p.y;
    };

// -----------------------------------------------------Point ("static" methods)

    /**
     * Negate a point component-wise and return the result as a new Point object.
     * @param   p   Point object.
     * @return the resulting Point object.
     */
    Point.negate = function(p) {
        return new Point(-p.x, -p.y);
    };

    /**
     * Add two points component-wise and return the result as a new Point object.
     * @param   a   Point object.
     * @param   b   Point object.
     * @return the resulting Point object.
     */
    Point.add = function(a, b) {
        return new Point(a.x + b.x, a.y + b.y);
    };

    /**
     * Subtract two points component-wise and return the result as a new Point object.
     * @param   a   Point object.
     * @param   b   Point object.
     * @return the resulting Point object.
     */
    Point.sub = function(a, b) {
        return new Point(a.x - b.x, a.y - b.y);
    };

    /**
     * Multiply a point by a scalar and return the result as a new Point object.
     * @param   s   the scalar (a number).
     * @param   p   Point object.
     * @return the resulting Point object.
     */
    Point.mul = function(s, p) {
        return new Point(s * p.x, s * p.y);
    };

    /**
     * Perform the cross product on either two points (this produces a scalar)
     * or a point and a scalar (this produces a point).
     * This function requires two parameters, either may be a Point object or a
     * number.
     * @param   a   Point object or scalar.
     * @param   b   Point object or scalar.
     * @return  a   Point object or a number, depending on the parameters.
     */
    Point.cross = function(a, b) {
        if (typeof(a) === 'number') {
            if (typeof(b) === 'number') {
                return a * b;
            } else {
                return new Point(-a * b.y, a * b.x);
            }
        } else {
            if (typeof(b) === 'number') {
                return new Point(b * a.y, -b * a.x);
            } else {
                return a.x * b.y - a.y * b.x;
            }
        }
    };


// -----------------------------------------------------------------"Point-Like"
    /*
     * The following functions operate on "Point" or any "Point like" object
     * with {x,y} (duck typing).
     */


    /**
     * Point pretty printing ex. <i>"(5;42)"</i>)
     * @param   p   any "Point like" object with {x,y}
     * @returns {String}
     */
    Point.toString = function(p) {
        // Try a custom toString first, and fallback to Point.prototype.toString if none
        var s = p.toString();
        return (s === '[object Object]' ? Point.prototype.toString.call(p) : s);
    };

    /**
     * Compare two points component-wise.
     * @param   a,b   any "Point like" objects with {x,y}
     * @return <code>&lt; 0</code> if <code>a &lt; b</code>,
     *         <code>&gt; 0</code> if <code>a &gt; b</code>,
     *         <code>0</code> otherwise.
     */
    Point.compare = function(a, b) {
        if (a.y === b.y) {
            return a.x - b.x;
        } else {
            return a.y - b.y;
        }
    };
    Point.cmp = Point.compare; // backward compatibility

    /**
     * Test two Point objects for equality.
     * @param   a,b   any "Point like" objects with {x,y}
     * @return <code>True</code> if <code>a == b</code>, <code>false</code> otherwise.
     */
    Point.equals = function(a, b) {
        return a.x === b.x && a.y === b.y;
    };

    /**
     * Peform the dot product on two vectors.
     * @param   a,b   any "Point like" objects with {x,y}
     * @return The dot product (as a number).
     */
    Point.dot = function(a, b) {
        return a.x * b.x + a.y * b.y;
    };


// -------------------------------------------------------------------------Edge
    /**
     * Represents a simple polygon's edge
     * @param {Point} p1
     * @param {Point} p2
     */
    var Edge = function(p1, p2) {
        this.p = p1;
        this.q = p2;

        if (p1.y > p2.y) {
            this.q = p1;
            this.p = p2;
        } else if (p1.y === p2.y) {
            if (p1.x > p2.x) {
                this.q = p1;
                this.p = p2;
            } else if (p1.x === p2.x) {
                throw new PointError('poly2tri Invalid Edge constructor: repeated points!', [p1]);
            }
        }

        if (! this.q._p2t_edge_list) {
            this.q._p2t_edge_list = [];
        }
        this.q._p2t_edge_list.push(this);
    };

// ---------------------------------------------------------------------Triangle
    /**
     * Triangle class.<br>
     * Triangle-based data structures are known to have better performance than
     * quad-edge structures.
     * See: J. Shewchuk, "Triangle: Engineering a 2D Quality Mesh Generator and
     * Delaunay Triangulator", "Triangulations in CGAL"
     *
     * @param   a,b,c   any "Point like" objects with {x,y} (duck typing)
     */
    var Triangle = function(a, b, c) {
        // Triangle points
        this.points_ = [a, b, c];
        // Neighbor list
        this.neighbors_ = [null, null, null];
        // Has this triangle been marked as an interior triangle?
        this.interior_ = false;
        // Flags to determine if an edge is a Constrained edge
        this.constrained_edge = [false, false, false];
        // Flags to determine if an edge is a Delauney edge
        this.delaunay_edge = [false, false, false];
    };

    /**
     * For pretty printing ex. <i>"[(5;42)(10;20)(21;30)]"</i>)
     */
    Triangle.prototype.toString = function() {
        var p2s = Point.toString;
        return ("[" + p2s(this.points_[0]) + p2s(this.points_[1]) + p2s(this.points_[2]) + "]");
    };

    Triangle.prototype.getPoint = function(index) {
        return this.points_[index];
    };
    // for backward compatibility
    Triangle.prototype.GetPoint = Triangle.prototype.getPoint;

    Triangle.prototype.getNeighbor = function(index) {
        return this.neighbors_[index];
    };

    /**
     * Test if this Triangle contains the Point object given as parameters as its
     * vertices. Only point references are compared, not values.
     * @return <code>True</code> if the Point object is of the Triangle's vertices,
     *         <code>false</code> otherwise.
     */
    Triangle.prototype.containsPoint = function(point) {
        var points = this.points_;
        // Here we are comparing point references, not values
        return (point === points[0] || point === points[1] || point === points[2]);
    };

    /**
     * Test if this Triangle contains the Edge object given as parameter as its
     * bounding edges. Only point references are compared, not values.
     * @return <code>True</code> if the Edge object is of the Triangle's bounding
     *         edges, <code>false</code> otherwise.
     */
    Triangle.prototype.containsEdge = function(edge) {
        return this.containsPoint(edge.p) && this.containsPoint(edge.q);
    };
    Triangle.prototype.containsPoints = function(p1, p2) {
        return this.containsPoint(p1) && this.containsPoint(p2);
    };


    Triangle.prototype.isInterior = function() {
        return this.interior_;
    };
    Triangle.prototype.setInterior = function(interior) {
        this.interior_ = interior;
        return this;
    };

    /**
     * Update neighbor pointers.
     * @param {Point} p1 Point object.
     * @param {Point} p2 Point object.
     * @param {Triangle} t Triangle object.
     */
    Triangle.prototype.markNeighborPointers = function(p1, p2, t) {
        var points = this.points_;
        // Here we are comparing point references, not values
        if ((p1 === points[2] && p2 === points[1]) || (p1 === points[1] && p2 === points[2])) {
            this.neighbors_[0] = t;
        } else if ((p1 === points[0] && p2 === points[2]) || (p1 === points[2] && p2 === points[0])) {
            this.neighbors_[1] = t;
        } else if ((p1 === points[0] && p2 === points[1]) || (p1 === points[1] && p2 === points[0])) {
            this.neighbors_[2] = t;
        } else {
            throw new Error('poly2tri Invalid Triangle.markNeighborPointers() call');
        }
    };

    /**
     * Exhaustive search to update neighbor pointers
     * @param {Triangle} t
     */
    Triangle.prototype.markNeighbor = function(t) {
        var points = this.points_;
        if (t.containsPoints(points[1], points[2])) {
            this.neighbors_[0] = t;
            t.markNeighborPointers(points[1], points[2], this);
        } else if (t.containsPoints(points[0], points[2])) {
            this.neighbors_[1] = t;
            t.markNeighborPointers(points[0], points[2], this);
        } else if (t.containsPoints(points[0], points[1])) {
            this.neighbors_[2] = t;
            t.markNeighborPointers(points[0], points[1], this);
        }
    };


    Triangle.prototype.clearNeigbors = function() {
        this.neighbors_[0] = null;
        this.neighbors_[1] = null;
        this.neighbors_[2] = null;
    };

    Triangle.prototype.clearDelunayEdges = function() {
        this.delaunay_edge[0] = false;
        this.delaunay_edge[1] = false;
        this.delaunay_edge[2] = false;
    };

    /**
     * Returns the point clockwise to the given point.
     */
    Triangle.prototype.pointCW = function(p) {
        var points = this.points_;
        // Here we are comparing point references, not values
        if (p === points[0]) {
            return points[2];
        } else if (p === points[1]) {
            return points[0];
        } else if (p === points[2]) {
            return points[1];
        } else {
            return null;
        }
    };

    /**
     * Returns the point counter-clockwise to the given point.
     */
    Triangle.prototype.pointCCW = function(p) {
        var points = this.points_;
        // Here we are comparing point references, not values
        if (p === points[0]) {
            return points[1];
        } else if (p === points[1]) {
            return points[2];
        } else if (p === points[2]) {
            return points[0];
        } else {
            return null;
        }
    };

    /**
     * Returns the neighbor clockwise to given point.
     */
    Triangle.prototype.neighborCW = function(p) {
        // Here we are comparing point references, not values
        if (p === this.points_[0]) {
            return this.neighbors_[1];
        } else if (p === this.points_[1]) {
            return this.neighbors_[2];
        } else {
            return this.neighbors_[0];
        }
    };

    /**
     * Returns the neighbor counter-clockwise to given point.
     */
    Triangle.prototype.neighborCCW = function(p) {
        // Here we are comparing point references, not values
        if (p === this.points_[0]) {
            return this.neighbors_[2];
        } else if (p === this.points_[1]) {
            return this.neighbors_[0];
        } else {
            return this.neighbors_[1];
        }
    };

    Triangle.prototype.getConstrainedEdgeCW = function(p) {
        // Here we are comparing point references, not values
        if (p === this.points_[0]) {
            return this.constrained_edge[1];
        } else if (p === this.points_[1]) {
            return this.constrained_edge[2];
        } else {
            return this.constrained_edge[0];
        }
    };

    Triangle.prototype.getConstrainedEdgeCCW = function(p) {
        // Here we are comparing point references, not values
        if (p === this.points_[0]) {
            return this.constrained_edge[2];
        } else if (p === this.points_[1]) {
            return this.constrained_edge[0];
        } else {
            return this.constrained_edge[1];
        }
    };

    Triangle.prototype.setConstrainedEdgeCW = function(p, ce) {
        // Here we are comparing point references, not values
        if (p === this.points_[0]) {
            this.constrained_edge[1] = ce;
        } else if (p === this.points_[1]) {
            this.constrained_edge[2] = ce;
        } else {
            this.constrained_edge[0] = ce;
        }
    };

    Triangle.prototype.setConstrainedEdgeCCW = function(p, ce) {
        // Here we are comparing point references, not values
        if (p === this.points_[0]) {
            this.constrained_edge[2] = ce;
        } else if (p === this.points_[1]) {
            this.constrained_edge[0] = ce;
        } else {
            this.constrained_edge[1] = ce;
        }
    };

    Triangle.prototype.getDelaunayEdgeCW = function(p) {
        // Here we are comparing point references, not values
        if (p === this.points_[0]) {
            return this.delaunay_edge[1];
        } else if (p === this.points_[1]) {
            return this.delaunay_edge[2];
        } else {
            return this.delaunay_edge[0];
        }
    };

    Triangle.prototype.getDelaunayEdgeCCW = function(p) {
        // Here we are comparing point references, not values
        if (p === this.points_[0]) {
            return this.delaunay_edge[2];
        } else if (p === this.points_[1]) {
            return this.delaunay_edge[0];
        } else {
            return this.delaunay_edge[1];
        }
    };

    Triangle.prototype.setDelaunayEdgeCW = function(p, e) {
        // Here we are comparing point references, not values
        if (p === this.points_[0]) {
            this.delaunay_edge[1] = e;
        } else if (p === this.points_[1]) {
            this.delaunay_edge[2] = e;
        } else {
            this.delaunay_edge[0] = e;
        }
    };

    Triangle.prototype.setDelaunayEdgeCCW = function(p, e) {
        // Here we are comparing point references, not values
        if (p === this.points_[0]) {
            this.delaunay_edge[2] = e;
        } else if (p === this.points_[1]) {
            this.delaunay_edge[0] = e;
        } else {
            this.delaunay_edge[1] = e;
        }
    };

    /**
     * The neighbor across to given point.
     */
    Triangle.prototype.neighborAcross = function(p) {
        // Here we are comparing point references, not values
        if (p === this.points_[0]) {
            return this.neighbors_[0];
        } else if (p === this.points_[1]) {
            return this.neighbors_[1];
        } else {
            return this.neighbors_[2];
        }
    };

    Triangle.prototype.oppositePoint = function(t, p) {
        var cw = t.pointCW(p);
        return this.pointCW(cw);
    };

    /**
     * Legalize triangle by rotating clockwise around oPoint
     * @param {Point} opoint
     * @param {Point} npoint
     */
    Triangle.prototype.legalize = function(opoint, npoint) {
        var points = this.points_;
        // Here we are comparing point references, not values
        if (opoint === points[0]) {
            points[1] = points[0];
            points[0] = points[2];
            points[2] = npoint;
        } else if (opoint === points[1]) {
            points[2] = points[1];
            points[1] = points[0];
            points[0] = npoint;
        } else if (opoint === points[2]) {
            points[0] = points[2];
            points[2] = points[1];
            points[1] = npoint;
        } else {
            throw new Error('poly2tri Invalid Triangle.legalize() call');
        }
    };

    /**
     * Returns the index of a point in the triangle.
     * The point *must* be a reference to one of the triangle's vertices.
     * @param {Point} p Point object
     * @returns {Number} index 0, 1 or 2
     */
    Triangle.prototype.index = function(p) {
        var points = this.points_;
        // Here we are comparing point references, not values
        if (p === points[0]) {
            return 0;
        } else if (p === points[1]) {
            return 1;
        } else if (p === points[2]) {
            return 2;
        } else {
            throw new Error('poly2tri Invalid Triangle.index() call');
        }
    };

    Triangle.prototype.edgeIndex = function(p1, p2) {
        var points = this.points_;
        // Here we are comparing point references, not values
        if (p1 === points[0]) {
            if (p2 === points[1]) {
                return 2;
            } else if (p2 === points[2]) {
                return 1;
            }
        } else if (p1 === points[1]) {
            if (p2 === points[2]) {
                return 0;
            } else if (p2 === points[0]) {
                return 2;
            }
        } else if (p1 === points[2]) {
            if (p2 === points[0]) {
                return 1;
            } else if (p2 === points[1]) {
                return 0;
            }
        }
        return -1;
    };

    /**
     * Mark an edge of this triangle as constrained.<br>
     * This method takes either 1 parameter (an edge index or an Edge instance) or
     * 2 parameters (two Point instances defining the edge of the triangle).
     */
    Triangle.prototype.markConstrainedEdgeByIndex = function(index) {
        this.constrained_edge[index] = true;
    };
    Triangle.prototype.markConstrainedEdgeByEdge = function(edge) {
        this.markConstrainedEdgeByPoints(edge.p, edge.q);
    };
    Triangle.prototype.markConstrainedEdgeByPoints = function(p, q) {
        var points = this.points_;
        // Here we are comparing point references, not values
        if ((q === points[0] && p === points[1]) || (q === points[1] && p === points[0])) {
            this.constrained_edge[2] = true;
        } else if ((q === points[0] && p === points[2]) || (q === points[2] && p === points[0])) {
            this.constrained_edge[1] = true;
        } else if ((q === points[1] && p === points[2]) || (q === points[2] && p === points[1])) {
            this.constrained_edge[0] = true;
        }
    };

// ------------------------------------------------------------------------utils
    var PI_3div4 = 3 * Math.PI / 4;
    var PI_2 = Math.PI / 2;
    var EPSILON = 1e-12;

    /*
     * Inital triangle factor, seed triangle will extend 30% of
     * PointSet width to both left and right.
     */
    var kAlpha = 0.3;

    var Orientation = {
        "CW": 1,
        "CCW": -1,
        "COLLINEAR": 0
    };

    /**
     * Forumla to calculate signed area<br>
     * Positive if CCW<br>
     * Negative if CW<br>
     * 0 if collinear<br>
     * <pre>
     * A[P1,P2,P3]  =  (x1*y2 - y1*x2) + (x2*y3 - y2*x3) + (x3*y1 - y3*x1)
     *              =  (x1-x3)*(y2-y3) - (y1-y3)*(x2-x3)
     * </pre>
     */
    function orient2d(pa, pb, pc) {
        var detleft = (pa.x - pc.x) * (pb.y - pc.y);
        var detright = (pa.y - pc.y) * (pb.x - pc.x);
        var val = detleft - detright;
        if (val > -(EPSILON) && val < (EPSILON)) {
            return Orientation.COLLINEAR;
        } else if (val > 0) {
            return Orientation.CCW;
        } else {
            return Orientation.CW;
        }
    }

    function inScanArea(pa, pb, pc, pd) {
        var pdx = pd.x;
        var pdy = pd.y;
        var adx = pa.x - pdx;
        var ady = pa.y - pdy;
        var bdx = pb.x - pdx;
        var bdy = pb.y - pdy;

        var adxbdy = adx * bdy;
        var bdxady = bdx * ady;
        var oabd = adxbdy - bdxady;

        if (oabd <= (EPSILON)) {
            return false;
        }

        var cdx = pc.x - pdx;
        var cdy = pc.y - pdy;

        var cdxady = cdx * ady;
        var adxcdy = adx * cdy;
        var ocad = cdxady - adxcdy;

        if (ocad <= (EPSILON)) {
            return false;
        }

        return true;
    }

// ---------------------------------------------------------------AdvancingFront
    /**
     * Advancing front node
     * @param {Point} p any "Point like" object with {x,y} (duck typing)
     * @param {Triangle} t triangle (optionnal)
     */
    var Node = function(p, t) {
        this.point = p;
        this.triangle = t || null;

        this.next = null; // Node
        this.prev = null; // Node

        this.value = p.x;
    };

    var AdvancingFront = function(head, tail) {
        this.head_ = head; // Node
        this.tail_ = tail; // Node
        this.search_node_ = head; // Node
    };

    AdvancingFront.prototype.head = function() {
        return this.head_;
    };

    AdvancingFront.prototype.setHead = function(node) {
        this.head_ = node;
    };

    AdvancingFront.prototype.tail = function() {
        return this.tail_;
    };

    AdvancingFront.prototype.setTail = function(node) {
        this.tail_ = node;
    };

    AdvancingFront.prototype.search = function() {
        return this.search_node_;
    };

    AdvancingFront.prototype.setSearch = function(node) {
        this.search_node_ = node;
    };

    AdvancingFront.prototype.findSearchNode = function(/*x*/) {
        // TODO: implement BST index
        return this.search_node_;
    };

    AdvancingFront.prototype.locateNode = function(x) {
        var node = this.search_node_;

        /* jshint boss:true */
        if (x < node.value) {
            while (node = node.prev) {
                if (x >= node.value) {
                    this.search_node_ = node;
                    return node;
                }
            }
        } else {
            while (node = node.next) {
                if (x < node.value) {
                    this.search_node_ = node.prev;
                    return node.prev;
                }
            }
        }
        return null;
    };

    AdvancingFront.prototype.locatePoint = function(point) {
        var px = point.x;
        var node = this.findSearchNode(px);
        var nx = node.point.x;

        if (px === nx) {
            // Here we are comparing point references, not values
            if (point !== node.point) {
                // We might have two nodes with same x value for a short time
                if (point === node.prev.point) {
                    node = node.prev;
                } else if (point === node.next.point) {
                    node = node.next;
                } else {
                    throw new Error('poly2tri Invalid AdvancingFront.locatePoint() call');
                }
            }
        } else if (px < nx) {
            /* jshint boss:true */
            while (node = node.prev) {
                if (point === node.point) {
                    break;
                }
            }
        } else {
            while (node = node.next) {
                if (point === node.point) {
                    break;
                }
            }
        }

        if (node) {
            this.search_node_ = node;
        }
        return node;
    };

// ------------------------------------------------------------------------Basin
    var Basin = function() {
        this.left_node = null; // Node
        this.bottom_node = null; // Node
        this.right_node = null; // Node
        this.width = 0.0; // number
        this.left_highest = false;
    };

    Basin.prototype.clear = function() {
        this.left_node = null;
        this.bottom_node = null;
        this.right_node = null;
        this.width = 0.0;
        this.left_highest = false;
    };

// --------------------------------------------------------------------EdgeEvent
    var EdgeEvent = function() {
        this.constrained_edge = null; // Edge
        this.right = false;
    };

// ----------------------------------------------------SweepContext (public API)
    /**
     * Constructor for the triangulation context.
     * It accepts a simple polyline, which defines the constrained edges.
     * Possible options are:
     *    cloneArrays:  if true, do a shallow copy of the Array parameters
     *                  (contour, holes). Points inside arrays are never copied.
     *                  Default is false : keep a reference to the array arguments,
     *                  who will be modified in place.
     * @param {Array} contour  array of "Point like" objects with {x,y} (duck typing)
     * @param {Object} options  constructor options
     */
    var SweepContext = function(contour, options) {
        options = options || {};
        this.triangles_ = [];
        this.map_ = [];
        this.points_ = (options.cloneArrays ? contour.slice(0) : contour);
        this.edge_list = [];

        // Bounding box of all points. Computed at the start of the triangulation,
        // it is stored in case it is needed by the caller.
        this.pmin_ = this.pmax_ = null;

        // Advancing front
        this.front_ = null; // AdvancingFront
        // head point used with advancing front
        this.head_ = null; // Point
        // tail point used with advancing front
        this.tail_ = null; // Point

        this.af_head_ = null; // Node
        this.af_middle_ = null; // Node
        this.af_tail_ = null; // Node

        this.basin = new Basin();
        this.edge_event = new EdgeEvent();

        this.initEdges(this.points_);
    };


    /**
     * Add a hole to the constraints
     * @param {Array} polyline  array of "Point like" objects with {x,y} (duck typing)
     */
    SweepContext.prototype.addHole = function(polyline) {
        this.initEdges(polyline);
        var i, len = polyline.length;
        for (i = 0; i < len; i++) {
            this.points_.push(polyline[i]);
        }
        return this; // for chaining
    };
    // Backward compatibility
    SweepContext.prototype.AddHole = SweepContext.prototype.addHole;


    /**
     * Add a Steiner point to the constraints
     * @param {Point} point     any "Point like" object with {x,y} (duck typing)
     */
    SweepContext.prototype.addPoint = function(point) {
        this.points_.push(point);
        return this; // for chaining
    };
    // Backward compatibility
    SweepContext.prototype.AddPoint = SweepContext.prototype.addPoint;


    /**
     * Add several Steiner points to the constraints
     * @param {array<Point>} points     array of "Point like" object with {x,y}
     */
    // Method added in the JavaScript version (was not present in the c++ version)
    SweepContext.prototype.addPoints = function(points) {
        this.points_ = this.points_.concat(points);
        return this; // for chaining
    };


    /**
     * Triangulate the polygon with holes and Steiner points.
     */
    // Shortcut method for Sweep.triangulate(SweepContext).
    // Method added in the JavaScript version (was not present in the c++ version)
    SweepContext.prototype.triangulate = function() {
        Sweep.triangulate(this);
        return this; // for chaining
    };


    /**
     * Get the bounding box of the provided constraints (contour, holes and
     * Steinter points). Warning : these values are not available if the triangulation
     * has not been done yet.
     * @returns {Object} object with 'min' and 'max' Point
     */
    // Method added in the JavaScript version (was not present in the c++ version)
    SweepContext.prototype.getBoundingBox = function() {
        return {min: this.pmin_, max: this.pmax_};
    };

    /**
     * Get result of triangulation
     * @returns {array<Triangle>}   array of triangles
     */
    SweepContext.prototype.getTriangles = function() {
        return this.triangles_;
    };
    // Backward compatibility
    SweepContext.prototype.GetTriangles = SweepContext.prototype.getTriangles;


// ---------------------------------------------------SweepContext (private API)

    SweepContext.prototype.front = function() {
        return this.front_;
    };

    SweepContext.prototype.pointCount = function() {
        return this.points_.length;
    };

    SweepContext.prototype.head = function() {
        return this.head_;
    };

    SweepContext.prototype.setHead = function(p1) {
        this.head_ = p1;
    };

    SweepContext.prototype.tail = function() {
        return this.tail_;
    };

    SweepContext.prototype.setTail = function(p1) {
        this.tail_ = p1;
    };

    SweepContext.prototype.getMap = function() {
        return this.map_;
    };

    SweepContext.prototype.initTriangulation = function() {
        var xmax = this.points_[0].x;
        var xmin = this.points_[0].x;
        var ymax = this.points_[0].y;
        var ymin = this.points_[0].y;

        // Calculate bounds
        var i, len = this.points_.length;
        for (i = 1; i < len; i++) {
            var p = this.points_[i];
            /* jshint expr:true */
            (p.x > xmax) && (xmax = p.x);
            (p.x < xmin) && (xmin = p.x);
            (p.y > ymax) && (ymax = p.y);
            (p.y < ymin) && (ymin = p.y);
        }
        this.pmin_ = new Point(xmin, ymin);
        this.pmax_ = new Point(xmax, ymax);

        var dx = kAlpha * (xmax - xmin);
        var dy = kAlpha * (ymax - ymin);
        this.head_ = new Point(xmax + dx, ymin - dy);
        this.tail_ = new Point(xmin - dx, ymin - dy);

        // Sort points along y-axis
        this.points_.sort(Point.compare);
    };

    SweepContext.prototype.initEdges = function(polyline) {
        var i, len = polyline.length;
        for (i = 0; i < len; ++i) {
            this.edge_list.push(new Edge(polyline[i], polyline[(i + 1) % len]));
        }
    };

    SweepContext.prototype.getPoint = function(index) {
        return this.points_[index];
    };

    SweepContext.prototype.addToMap = function(triangle) {
        this.map_.push(triangle);
    };

    SweepContext.prototype.locateNode = function(point) {
        return this.front_.locateNode(point.x);
    };

    SweepContext.prototype.createAdvancingFront = function() {
        var head;
        var middle;
        var tail;
        // Initial triangle
        var triangle = new Triangle(this.points_[0], this.tail_, this.head_);

        this.map_.push(triangle);

        head = new Node(triangle.getPoint(1), triangle);
        middle = new Node(triangle.getPoint(0), triangle);
        tail = new Node(triangle.getPoint(2));

        this.front_ = new AdvancingFront(head, tail);

        head.next = middle;
        middle.next = tail;
        middle.prev = head;
        tail.prev = middle;
    };

    SweepContext.prototype.removeNode = function(node) {
        // do nothing
        /* jshint unused:false */
    };

    SweepContext.prototype.mapTriangleToNodes = function(t) {
        for (var i = 0; i < 3; ++i) {
            if (! t.getNeighbor(i)) {
                var n = this.front_.locatePoint(t.pointCW(t.getPoint(i)));
                if (n) {
                    n.triangle = t;
                }
            }
        }
    };

    SweepContext.prototype.removeFromMap = function(triangle) {
        var i, map = this.map_, len = map.length;
        for (i = 0; i < len; i++) {
            if (map[i] === triangle) {
                map.splice(i, 1);
                break;
            }
        }
    };

    /**
     * Do a depth first traversal to collect triangles
     * @param {Triangle} triangle start
     */
    SweepContext.prototype.meshClean = function(triangle) {
        // New implementation avoids recursive calls and use a loop instead.
        // Cf. issues # 57, 65 and 69.
        var triangles = [triangle], t, i;
        /* jshint boss:true */
        while (t = triangles.pop()) {
            if (!t.isInterior()) {
                t.setInterior(true);
                this.triangles_.push(t);
                for (i = 0; i < 3; i++) {
                    if (!t.constrained_edge[i]) {
                        triangles.push(t.getNeighbor(i));
                    }
                }
            }
        }
    };

// ------------------------------------------------------------------------Sweep

    /**
     * The 'Sweep' object is present in order to keep this JavaScript version
     * as close as possible to the reference C++ version, even though almost
     * all Sweep methods could be declared as members of the SweepContext object.
     */
    var Sweep = {};


    /**
     * Triangulate the polygon with holes and Steiner points.
     * @param   tcx SweepContext object.
     */
    Sweep.triangulate = function(tcx) {
        tcx.initTriangulation();
        tcx.createAdvancingFront();
        // Sweep points; build mesh
        Sweep.sweepPoints(tcx);
        // Clean up
        Sweep.finalizationPolygon(tcx);
    };

    Sweep.sweepPoints = function(tcx) {
        var i, len = tcx.pointCount();
        for (i = 1; i < len; ++i) {
            var point = tcx.getPoint(i);
            var node = Sweep.pointEvent(tcx, point);
            var edges = point._p2t_edge_list;
            for (var j = 0; edges && j < edges.length; ++j) {
                Sweep.edgeEventByEdge(tcx, edges[j], node);
            }
        }
    };

    Sweep.finalizationPolygon = function(tcx) {
        // Get an Internal triangle to start with
        var t = tcx.front().head().next.triangle;
        var p = tcx.front().head().next.point;
        while (!t.getConstrainedEdgeCW(p)) {
            t = t.neighborCCW(p);
        }

        // Collect interior triangles constrained by edges
        tcx.meshClean(t);
    };

    /**
     * Find closes node to the left of the new point and
     * create a new triangle. If needed new holes and basins
     * will be filled to.
     */
    Sweep.pointEvent = function(tcx, point) {
        var node = tcx.locateNode(point);
        var new_node = Sweep.newFrontTriangle(tcx, point, node);

        // Only need to check +epsilon since point never have smaller
        // x value than node due to how we fetch nodes from the front
        if (point.x <= node.point.x + (EPSILON)) {
            Sweep.fill(tcx, node);
        }

        //tcx.AddNode(new_node);

        Sweep.fillAdvancingFront(tcx, new_node);
        return new_node;
    };

    Sweep.edgeEventByEdge = function(tcx, edge, node) {
        tcx.edge_event.constrained_edge = edge;
        tcx.edge_event.right = (edge.p.x > edge.q.x);

        if (Sweep.isEdgeSideOfTriangle(node.triangle, edge.p, edge.q)) {
            return;
        }

        // For now we will do all needed filling
        // TODO: integrate with flip process might give some better performance
        //       but for now this avoid the issue with cases that needs both flips and fills
        Sweep.fillEdgeEvent(tcx, edge, node);
        Sweep.edgeEventByPoints(tcx, edge.p, edge.q, node.triangle, edge.q);
    };

    Sweep.edgeEventByPoints = function(tcx, ep, eq, triangle, point) {
        if (Sweep.isEdgeSideOfTriangle(triangle, ep, eq)) {
            return;
        }

        var p1 = triangle.pointCCW(point);
        var o1 = orient2d(eq, p1, ep);
        if (o1 === Orientation.COLLINEAR) {
            // TODO integrate here changes from C++ version
            throw new PointError('poly2tri EdgeEvent: Collinear not supported!', [eq, p1, ep]);
        }

        var p2 = triangle.pointCW(point);
        var o2 = orient2d(eq, p2, ep);
        if (o2 === Orientation.COLLINEAR) {
            // TODO integrate here changes from C++ version
            throw new PointError('poly2tri EdgeEvent: Collinear not supported!', [eq, p2, ep]);
        }

        if (o1 === o2) {
            // Need to decide if we are rotating CW or CCW to get to a triangle
            // that will cross edge
            if (o1 === Orientation.CW) {
                triangle = triangle.neighborCCW(point);
            } else {
                triangle = triangle.neighborCW(point);
            }
            Sweep.edgeEventByPoints(tcx, ep, eq, triangle, point);
        } else {
            // This triangle crosses constraint so lets flippin start!
            Sweep.flipEdgeEvent(tcx, ep, eq, triangle, point);
        }
    };

    Sweep.isEdgeSideOfTriangle = function(triangle, ep, eq) {
        var index = triangle.edgeIndex(ep, eq);
        if (index !== -1) {
            triangle.markConstrainedEdgeByIndex(index);
            var t = triangle.getNeighbor(index);
            if (t) {
                t.markConstrainedEdgeByPoints(ep, eq);
            }
            return true;
        }
        return false;
    };

    Sweep.newFrontTriangle = function(tcx, point, node) {
        var triangle = new Triangle(point, node.point, node.next.point);

        triangle.markNeighbor(node.triangle);
        tcx.addToMap(triangle);

        var new_node = new Node(point);
        new_node.next = node.next;
        new_node.prev = node;
        node.next.prev = new_node;
        node.next = new_node;

        if (!Sweep.legalize(tcx, triangle)) {
            tcx.mapTriangleToNodes(triangle);
        }

        return new_node;
    };

    /**
     * Adds a triangle to the advancing front to fill a hole.
     * @param tcx
     * @param node - middle node, that is the bottom of the hole
     */
    Sweep.fill = function(tcx, node) {
        var triangle = new Triangle(node.prev.point, node.point, node.next.point);

        // TODO: should copy the constrained_edge value from neighbor triangles
        //       for now constrained_edge values are copied during the legalize
        triangle.markNeighbor(node.prev.triangle);
        triangle.markNeighbor(node.triangle);

        tcx.addToMap(triangle);

        // Update the advancing front
        node.prev.next = node.next;
        node.next.prev = node.prev;


        // If it was legalized the triangle has already been mapped
        if (!Sweep.legalize(tcx, triangle)) {
            tcx.mapTriangleToNodes(triangle);
        }

        //tcx.removeNode(node);
    };

    /**
     * Fills holes in the Advancing Front
     */
    Sweep.fillAdvancingFront = function(tcx, n) {
        // Fill right holes
        var node = n.next;
        var angle;
        while (node.next) {
            angle = Sweep.holeAngle(node);
            if (angle > PI_2 || angle < -(PI_2)) {
                break;
            }
            Sweep.fill(tcx, node);
            node = node.next;
        }

        // Fill left holes
        node = n.prev;
        while (node.prev) {
            angle = Sweep.holeAngle(node);
            if (angle > PI_2 || angle < -(PI_2)) {
                break;
            }
            Sweep.fill(tcx, node);
            node = node.prev;
        }

        // Fill right basins
        if (n.next && n.next.next) {
            angle = Sweep.basinAngle(n);
            if (angle < PI_3div4) {
                Sweep.fillBasin(tcx, n);
            }
        }
    };

    Sweep.basinAngle = function(node) {
        var ax = node.point.x - node.next.next.point.x;
        var ay = node.point.y - node.next.next.point.y;
        return Math.atan2(ay, ax);
    };

    /**
     *
     * @param node - middle node
     * @return the angle between 3 front nodes
     */
    Sweep.holeAngle = function(node) {
        /* Complex plane
         * ab = cosA +i*sinA
         * ab = (ax + ay*i)(bx + by*i) = (ax*bx + ay*by) + i(ax*by-ay*bx)
         * atan2(y,x) computes the principal value of the argument function
         * applied to the complex number x+iy
         * Where x = ax*bx + ay*by
         *       y = ax*by - ay*bx
         */
        var ax = node.next.point.x - node.point.x;
        var ay = node.next.point.y - node.point.y;
        var bx = node.prev.point.x - node.point.x;
        var by = node.prev.point.y - node.point.y;
        return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    };

    /**
     * Returns true if triangle was legalized
     */
    Sweep.legalize = function(tcx, t) {
        // To legalize a triangle we start by finding if any of the three edges
        // violate the Delaunay condition
        for (var i = 0; i < 3; ++i) {
            if (t.delaunay_edge[i]) {
                continue;
            }
            var ot = t.getNeighbor(i);
            if (ot) {
                var p = t.getPoint(i);
                var op = ot.oppositePoint(t, p);
                var oi = ot.index(op);

                // If this is a Constrained Edge or a Delaunay Edge(only during recursive legalization)
                // then we should not try to legalize
                if (ot.constrained_edge[oi] || ot.delaunay_edge[oi]) {
                    t.constrained_edge[i] = ot.constrained_edge[oi];
                    continue;
                }

                var inside = Sweep.inCircle(p, t.pointCCW(p), t.pointCW(p), op);
                if (inside) {
                    // Lets mark this shared edge as Delaunay
                    t.delaunay_edge[i] = true;
                    ot.delaunay_edge[oi] = true;

                    // Lets rotate shared edge one vertex CW to legalize it
                    Sweep.rotateTrianglePair(t, p, ot, op);

                    // We now got one valid Delaunay Edge shared by two triangles
                    // This gives us 4 new edges to check for Delaunay

                    // Make sure that triangle to node mapping is done only one time for a specific triangle
                    var not_legalized = !Sweep.legalize(tcx, t);
                    if (not_legalized) {
                        tcx.mapTriangleToNodes(t);
                    }

                    not_legalized = !Sweep.legalize(tcx, ot);
                    if (not_legalized) {
                        tcx.mapTriangleToNodes(ot);
                    }
                    // Reset the Delaunay edges, since they only are valid Delaunay edges
                    // until we add a new triangle or point.
                    // XXX: need to think about this. Can these edges be tried after we
                    //      return to previous recursive level?
                    t.delaunay_edge[i] = false;
                    ot.delaunay_edge[oi] = false;

                    // If triangle have been legalized no need to check the other edges since
                    // the recursive legalization will handles those so we can end here.
                    return true;
                }
            }
        }
        return false;
    };

    /**
     * <b>Requirement</b>:<br>
     * 1. a,b and c form a triangle.<br>
     * 2. a and d is know to be on opposite side of bc<br>
     * <pre>
     *                a
     *                +
     *               / \
     *              /   \
     *            b/     \c
     *            +-------+
     *           /    d    \
     *          /           \
     * </pre>
     * <b>Fact</b>: d has to be in area B to have a chance to be inside the circle formed by
     *  a,b and c<br>
     *  d is outside B if orient2d(a,b,d) or orient2d(c,a,d) is CW<br>
     *  This preknowledge gives us a way to optimize the incircle test
     * @param pa - triangle point, opposite d
     * @param pb - triangle point
     * @param pc - triangle point
     * @param pd - point opposite a
     * @return true if d is inside circle, false if on circle edge
     */
    Sweep.inCircle = function(pa, pb, pc, pd) {
        var adx = pa.x - pd.x;
        var ady = pa.y - pd.y;
        var bdx = pb.x - pd.x;
        var bdy = pb.y - pd.y;

        var adxbdy = adx * bdy;
        var bdxady = bdx * ady;
        var oabd = adxbdy - bdxady;
        if (oabd <= 0) {
            return false;
        }

        var cdx = pc.x - pd.x;
        var cdy = pc.y - pd.y;

        var cdxady = cdx * ady;
        var adxcdy = adx * cdy;
        var ocad = cdxady - adxcdy;
        if (ocad <= 0) {
            return false;
        }

        var bdxcdy = bdx * cdy;
        var cdxbdy = cdx * bdy;

        var alift = adx * adx + ady * ady;
        var blift = bdx * bdx + bdy * bdy;
        var clift = cdx * cdx + cdy * cdy;

        var det = alift * (bdxcdy - cdxbdy) + blift * ocad + clift * oabd;
        return det > 0;
    };

    /**
     * Rotates a triangle pair one vertex CW
     *<pre>
     *       n2                    n2
     *  P +-----+             P +-----+
     *    | t  /|               |\  t |
     *    |   / |               | \   |
     *  n1|  /  |n3           n1|  \  |n3
     *    | /   |    after CW   |   \ |
     *    |/ oT |               | oT \|
     *    +-----+ oP            +-----+
     *       n4                    n4
     * </pre>
     */
    Sweep.rotateTrianglePair = function(t, p, ot, op) {
        var n1, n2, n3, n4;
        n1 = t.neighborCCW(p);
        n2 = t.neighborCW(p);
        n3 = ot.neighborCCW(op);
        n4 = ot.neighborCW(op);

        var ce1, ce2, ce3, ce4;
        ce1 = t.getConstrainedEdgeCCW(p);
        ce2 = t.getConstrainedEdgeCW(p);
        ce3 = ot.getConstrainedEdgeCCW(op);
        ce4 = ot.getConstrainedEdgeCW(op);

        var de1, de2, de3, de4;
        de1 = t.getDelaunayEdgeCCW(p);
        de2 = t.getDelaunayEdgeCW(p);
        de3 = ot.getDelaunayEdgeCCW(op);
        de4 = ot.getDelaunayEdgeCW(op);

        t.legalize(p, op);
        ot.legalize(op, p);

        // Remap delaunay_edge
        ot.setDelaunayEdgeCCW(p, de1);
        t.setDelaunayEdgeCW(p, de2);
        t.setDelaunayEdgeCCW(op, de3);
        ot.setDelaunayEdgeCW(op, de4);

        // Remap constrained_edge
        ot.setConstrainedEdgeCCW(p, ce1);
        t.setConstrainedEdgeCW(p, ce2);
        t.setConstrainedEdgeCCW(op, ce3);
        ot.setConstrainedEdgeCW(op, ce4);

        // Remap neighbors
        // XXX: might optimize the markNeighbor by keeping track of
        //      what side should be assigned to what neighbor after the
        //      rotation. Now mark neighbor does lots of testing to find
        //      the right side.
        t.clearNeigbors();
        ot.clearNeigbors();
        if (n1) {
            ot.markNeighbor(n1);
        }
        if (n2) {
            t.markNeighbor(n2);
        }
        if (n3) {
            t.markNeighbor(n3);
        }
        if (n4) {
            ot.markNeighbor(n4);
        }
        t.markNeighbor(ot);
    };

    /**
     * Fills a basin that has formed on the Advancing Front to the right
     * of given node.<br>
     * First we decide a left,bottom and right node that forms the
     * boundaries of the basin. Then we do a reqursive fill.
     *
     * @param tcx
     * @param node - starting node, this or next node will be left node
     */
    Sweep.fillBasin = function(tcx, node) {
        if (orient2d(node.point, node.next.point, node.next.next.point) === Orientation.CCW) {
            tcx.basin.left_node = node.next.next;
        } else {
            tcx.basin.left_node = node.next;
        }

        // Find the bottom and right node
        tcx.basin.bottom_node = tcx.basin.left_node;
        while (tcx.basin.bottom_node.next && tcx.basin.bottom_node.point.y >= tcx.basin.bottom_node.next.point.y) {
            tcx.basin.bottom_node = tcx.basin.bottom_node.next;
        }
        if (tcx.basin.bottom_node === tcx.basin.left_node) {
            // No valid basin
            return;
        }

        tcx.basin.right_node = tcx.basin.bottom_node;
        while (tcx.basin.right_node.next && tcx.basin.right_node.point.y < tcx.basin.right_node.next.point.y) {
            tcx.basin.right_node = tcx.basin.right_node.next;
        }
        if (tcx.basin.right_node === tcx.basin.bottom_node) {
            // No valid basins
            return;
        }

        tcx.basin.width = tcx.basin.right_node.point.x - tcx.basin.left_node.point.x;
        tcx.basin.left_highest = tcx.basin.left_node.point.y > tcx.basin.right_node.point.y;

        Sweep.fillBasinReq(tcx, tcx.basin.bottom_node);
    };

    /**
     * Recursive algorithm to fill a Basin with triangles
     *
     * @param tcx
     * @param node - bottom_node
     */
    Sweep.fillBasinReq = function(tcx, node) {
        // if shallow stop filling
        if (Sweep.isShallow(tcx, node)) {
            return;
        }

        Sweep.fill(tcx, node);

        var o;
        if (node.prev === tcx.basin.left_node && node.next === tcx.basin.right_node) {
            return;
        } else if (node.prev === tcx.basin.left_node) {
            o = orient2d(node.point, node.next.point, node.next.next.point);
            if (o === Orientation.CW) {
                return;
            }
            node = node.next;
        } else if (node.next === tcx.basin.right_node) {
            o = orient2d(node.point, node.prev.point, node.prev.prev.point);
            if (o === Orientation.CCW) {
                return;
            }
            node = node.prev;
        } else {
            // Continue with the neighbor node with lowest Y value
            if (node.prev.point.y < node.next.point.y) {
                node = node.prev;
            } else {
                node = node.next;
            }
        }

        Sweep.fillBasinReq(tcx, node);
    };

    Sweep.isShallow = function(tcx, node) {
        var height;
        if (tcx.basin.left_highest) {
            height = tcx.basin.left_node.point.y - node.point.y;
        } else {
            height = tcx.basin.right_node.point.y - node.point.y;
        }

        // if shallow stop filling
        if (tcx.basin.width > height) {
            return true;
        }
        return false;
    };

    Sweep.fillEdgeEvent = function(tcx, edge, node) {
        if (tcx.edge_event.right) {
            Sweep.fillRightAboveEdgeEvent(tcx, edge, node);
        } else {
            Sweep.fillLeftAboveEdgeEvent(tcx, edge, node);
        }
    };

    Sweep.fillRightAboveEdgeEvent = function(tcx, edge, node) {
        while (node.next.point.x < edge.p.x) {
            // Check if next node is below the edge
            if (orient2d(edge.q, node.next.point, edge.p) === Orientation.CCW) {
                Sweep.fillRightBelowEdgeEvent(tcx, edge, node);
            } else {
                node = node.next;
            }
        }
    };

    Sweep.fillRightBelowEdgeEvent = function(tcx, edge, node) {
        if (node.point.x < edge.p.x) {
            if (orient2d(node.point, node.next.point, node.next.next.point) === Orientation.CCW) {
                // Concave
                Sweep.fillRightConcaveEdgeEvent(tcx, edge, node);
            } else {
                // Convex
                Sweep.fillRightConvexEdgeEvent(tcx, edge, node);
                // Retry this one
                Sweep.fillRightBelowEdgeEvent(tcx, edge, node);
            }
        }
    };

    Sweep.fillRightConcaveEdgeEvent = function(tcx, edge, node) {
        Sweep.fill(tcx, node.next);
        if (node.next.point !== edge.p) {
            // Next above or below edge?
            if (orient2d(edge.q, node.next.point, edge.p) === Orientation.CCW) {
                // Below
                if (orient2d(node.point, node.next.point, node.next.next.point) === Orientation.CCW) {
                    // Next is concave
                    Sweep.fillRightConcaveEdgeEvent(tcx, edge, node);
                } else {
                    // Next is convex
                    /* jshint noempty:false */
                }
            }
        }
    };

    Sweep.fillRightConvexEdgeEvent = function(tcx, edge, node) {
        // Next concave or convex?
        if (orient2d(node.next.point, node.next.next.point, node.next.next.next.point) === Orientation.CCW) {
            // Concave
            Sweep.fillRightConcaveEdgeEvent(tcx, edge, node.next);
        } else {
            // Convex
            // Next above or below edge?
            if (orient2d(edge.q, node.next.next.point, edge.p) === Orientation.CCW) {
                // Below
                Sweep.fillRightConvexEdgeEvent(tcx, edge, node.next);
            } else {
                // Above
                /* jshint noempty:false */
            }
        }
    };

    Sweep.fillLeftAboveEdgeEvent = function(tcx, edge, node) {
        while (node.prev.point.x > edge.p.x) {
            // Check if next node is below the edge
            if (orient2d(edge.q, node.prev.point, edge.p) === Orientation.CW) {
                Sweep.fillLeftBelowEdgeEvent(tcx, edge, node);
            } else {
                node = node.prev;
            }
        }
    };

    Sweep.fillLeftBelowEdgeEvent = function(tcx, edge, node) {
        if (node.point.x > edge.p.x) {
            if (orient2d(node.point, node.prev.point, node.prev.prev.point) === Orientation.CW) {
                // Concave
                Sweep.fillLeftConcaveEdgeEvent(tcx, edge, node);
            } else {
                // Convex
                Sweep.fillLeftConvexEdgeEvent(tcx, edge, node);
                // Retry this one
                Sweep.fillLeftBelowEdgeEvent(tcx, edge, node);
            }
        }
    };

    Sweep.fillLeftConvexEdgeEvent = function(tcx, edge, node) {
        // Next concave or convex?
        if (orient2d(node.prev.point, node.prev.prev.point, node.prev.prev.prev.point) === Orientation.CW) {
            // Concave
            Sweep.fillLeftConcaveEdgeEvent(tcx, edge, node.prev);
        } else {
            // Convex
            // Next above or below edge?
            if (orient2d(edge.q, node.prev.prev.point, edge.p) === Orientation.CW) {
                // Below
                Sweep.fillLeftConvexEdgeEvent(tcx, edge, node.prev);
            } else {
                // Above
                /* jshint noempty:false */
            }
        }
    };

    Sweep.fillLeftConcaveEdgeEvent = function(tcx, edge, node) {
        Sweep.fill(tcx, node.prev);
        if (node.prev.point !== edge.p) {
            // Next above or below edge?
            if (orient2d(edge.q, node.prev.point, edge.p) === Orientation.CW) {
                // Below
                if (orient2d(node.point, node.prev.point, node.prev.prev.point) === Orientation.CW) {
                    // Next is concave
                    Sweep.fillLeftConcaveEdgeEvent(tcx, edge, node);
                } else {
                    // Next is convex
                    /* jshint noempty:false */
                }
            }
        }
    };

    Sweep.flipEdgeEvent = function(tcx, ep, eq, t, p) {
        var ot = t.neighborAcross(p);
        if (!ot) {
            // If we want to integrate the fillEdgeEvent do it here
            // With current implementation we should never get here
            throw new Error('poly2tri [BUG:FIXME] FLIP failed due to missing triangle!');
        }
        var op = ot.oppositePoint(t, p);

        if (inScanArea(p, t.pointCCW(p), t.pointCW(p), op)) {
            // Lets rotate shared edge one vertex CW
            Sweep.rotateTrianglePair(t, p, ot, op);
            tcx.mapTriangleToNodes(t);
            tcx.mapTriangleToNodes(ot);

            // XXX: in the original C++ code for the next 2 lines, we are
            // comparing point values (and not pointers). In this JavaScript
            // code, we are comparing point references (pointers). This works
            // because we can't have 2 different points with the same values.
            // But to be really equivalent, we should use "Point.equals" here.
            if (p === eq && op === ep) {
                if (eq === tcx.edge_event.constrained_edge.q && ep === tcx.edge_event.constrained_edge.p) {
                    t.markConstrainedEdgeByPoints(ep, eq);
                    ot.markConstrainedEdgeByPoints(ep, eq);
                    Sweep.legalize(tcx, t);
                    Sweep.legalize(tcx, ot);
                } else {
                    // XXX: I think one of the triangles should be legalized here?
                    /* jshint noempty:false */
                }
            } else {
                var o = orient2d(eq, op, ep);
                t = Sweep.nextFlipTriangle(tcx, o, t, ot, p, op);
                Sweep.flipEdgeEvent(tcx, ep, eq, t, p);
            }
        } else {
            var newP = Sweep.nextFlipPoint(ep, eq, ot, op);
            Sweep.flipScanEdgeEvent(tcx, ep, eq, t, ot, newP);
            Sweep.edgeEventByPoints(tcx, ep, eq, t, p);
        }
    };

    Sweep.nextFlipTriangle = function(tcx, o, t, ot, p, op) {
        var edge_index;
        if (o === Orientation.CCW) {
            // ot is not crossing edge after flip
            edge_index = ot.edgeIndex(p, op);
            ot.delaunay_edge[edge_index] = true;
            Sweep.legalize(tcx, ot);
            ot.clearDelunayEdges();
            return t;
        }

        // t is not crossing edge after flip
        edge_index = t.edgeIndex(p, op);

        t.delaunay_edge[edge_index] = true;
        Sweep.legalize(tcx, t);
        t.clearDelunayEdges();
        return ot;
    };

    Sweep.nextFlipPoint = function(ep, eq, ot, op) {
        var o2d = orient2d(eq, op, ep);
        if (o2d === Orientation.CW) {
            // Right
            return ot.pointCCW(op);
        } else if (o2d === Orientation.CCW) {
            // Left
            return ot.pointCW(op);
        } else {
            throw new PointError("poly2tri [Unsupported] nextFlipPoint: opposing point on constrained edge!", [eq, op, ep]);
        }
    };

    Sweep.flipScanEdgeEvent = function(tcx, ep, eq, flip_triangle, t, p) {
        var ot = t.neighborAcross(p);
        if (!ot) {
            // If we want to integrate the fillEdgeEvent do it here
            // With current implementation we should never get here
            throw new Error('poly2tri [BUG:FIXME] FLIP failed due to missing triangle');
        }
        var op = ot.oppositePoint(t, p);

        if (inScanArea(eq, flip_triangle.pointCCW(eq), flip_triangle.pointCW(eq), op)) {
            // flip with new edge op.eq
            Sweep.flipEdgeEvent(tcx, eq, op, ot, op);
            // TODO: Actually I just figured out that it should be possible to
            //       improve this by getting the next ot and op before the the above
            //       flip and continue the flipScanEdgeEvent here
            // set new ot and op here and loop back to inScanArea test
            // also need to set a new flip_triangle first
            // Turns out at first glance that this is somewhat complicated
            // so it will have to wait.
        } else {
            var newP = Sweep.nextFlipPoint(ep, eq, ot, op);
            Sweep.flipScanEdgeEvent(tcx, ep, eq, flip_triangle, ot, newP);
        }
    };

// ---------------------------------------------------------Exports (public API)

    poly2tri.PointError     = PointError;
    poly2tri.Point          = Point;
    poly2tri.Triangle       = Triangle;
    poly2tri.SweepContext   = SweepContext;

    // Backward compatibility
    poly2tri.triangulate    = Sweep.triangulate;
    poly2tri.sweep = {Triangulate: Sweep.triangulate};

}(this));


// ----------------------------------------------------Namespace.js (deprecated)

(function() { // to scope jshint directives
    "use strict";
    /* jshint newcap:false */
    /* global Namespace, js, poly2tri */

    // Tests "Namespace.js" support, for backward compatilibilty
    if (typeof Namespace === 'function') {
        // Put in the "js.poly2tri" namespace
        Namespace('js.poly2tri');
        js.poly2tri = poly2tri;
        Namespace.provide('js.poly2tri');
    }
}());

/*

Superfast Blur - a fast Box Blur For Canvas

Version:  0.5
Author:   Mario Klingemann
Contact:  mario@quasimondo.com
Website:  http://www.quasimondo.com/BoxBlurForCanvas
Twitter:  @quasimondo

In case you find this class useful - especially in commercial projects -
I am not totally unhappy for a small donation to my PayPal account
mario@quasimondo.de

Or support me on flattr:
https://flattr.com/thing/140066/Superfast-Blur-a-pretty-fast-Box-Blur-Effect-for-CanvasJavascript

Copyright (c) 2011 Mario Klingemann

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/
var mul_table = [ 1,57,41,21,203,34,97,73,227,91,149,62,105,45,39,137,241,107,3,173,39,71,65,238,219,101,187,87,81,151,141,133,249,117,221,209,197,187,177,169,5,153,73,139,133,127,243,233,223,107,103,99,191,23,177,171,165,159,77,149,9,139,135,131,253,245,119,231,224,109,211,103,25,195,189,23,45,175,171,83,81,79,155,151,147,9,141,137,67,131,129,251,123,30,235,115,113,221,217,53,13,51,50,49,193,189,185,91,179,175,43,169,83,163,5,79,155,19,75,147,145,143,35,69,17,67,33,65,255,251,247,243,239,59,29,229,113,111,219,27,213,105,207,51,201,199,49,193,191,47,93,183,181,179,11,87,43,85,167,165,163,161,159,157,155,77,19,75,37,73,145,143,141,35,138,137,135,67,33,131,129,255,63,250,247,61,121,239,237,117,29,229,227,225,111,55,109,216,213,211,209,207,205,203,201,199,197,195,193,48,190,47,93,185,183,181,179,178,176,175,173,171,85,21,167,165,41,163,161,5,79,157,78,154,153,19,75,149,74,147,73,144,143,71,141,140,139,137,17,135,134,133,66,131,65,129,1];


var shg_table = [0,9,10,10,14,12,14,14,16,15,16,15,16,15,15,17,18,17,12,18,16,17,17,19,19,18,19,18,18,19,19,19,20,19,20,20,20,20,20,20,15,20,19,20,20,20,21,21,21,20,20,20,21,18,21,21,21,21,20,21,17,21,21,21,22,22,21,22,22,21,22,21,19,22,22,19,20,22,22,21,21,21,22,22,22,18,22,22,21,22,22,23,22,20,23,22,22,23,23,21,19,21,21,21,23,23,23,22,23,23,21,23,22,23,18,22,23,20,22,23,23,23,21,22,20,22,21,22,24,24,24,24,24,22,21,24,23,23,24,21,24,23,24,22,24,24,22,24,24,22,23,24,24,24,20,23,22,23,24,24,24,24,24,24,24,23,21,23,22,23,24,24,24,22,24,24,24,23,22,24,24,25,23,25,25,23,24,25,25,24,22,25,25,25,24,23,24,25,25,25,25,25,25,25,25,25,25,25,25,23,25,23,24,25,25,25,25,25,25,25,25,25,24,22,25,25,23,25,25,20,24,25,24,25,25,22,24,25,24,25,24,25,25,24,25,25,25,25,22,25,25,25,24,25,24,25,18];


function boxBlurImage( imageID, canvasID, radius, blurAlphaChannel, iterations ){

  var img = document.getElementById( imageID );
  var w = img.naturalWidth;
    var h = img.naturalHeight;

  var canvas = document.getElementById( canvasID );

    canvas.style.width  = w + "px";
    canvas.style.height = h + "px";
    canvas.width = w;
    canvas.height = h;

    var context = canvas.getContext("2d");
    context.clearRect( 0, 0, w, h );
    context.drawImage( img, 0, 0 );

  if ( isNaN(radius) || radius < 1 ) return;

  if ( blurAlphaChannel )
  {
    boxBlurCanvasRGBA( canvasID, 0, 0, w, h, radius, iterations );
  } else {
    boxBlurCanvasRGB( canvasID, 0, 0, w, h, radius, iterations );
  }

}


function boxBlurCanvasRGBA( id, top_x, top_y, width, height, radius, iterations ){
  if ( isNaN(radius) || radius < 1 ) return;

  radius |= 0;

  if ( isNaN(iterations) ) iterations = 1;
  iterations |= 0;
  if ( iterations > 3 ) iterations = 3;
  if ( iterations < 1 ) iterations = 1;

  var canvas  = document.getElementById( id );
  var context = canvas.getContext("2d");
  var imageData;

  try {
    try {
    imageData = context.getImageData( top_x, top_y, width, height );
    } catch(e) {

    // NOTE: this part is supposedly only needed if you want to work with local files
    // so it might be okay to remove the whole try/catch block and just use
    // imageData = context.getImageData( top_x, top_y, width, height );
    try {
      netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
      imageData = context.getImageData( top_x, top_y, width, height );
    } catch(e) {
      alert("Cannot access local image");
      throw new Error("unable to access local image data: " + e);
      return;
    }
    }
  } catch(e) {
    alert("Cannot access image");
    throw new Error("unable to access image data: " + e);
    return;
  }

  var pixels = imageData.data;

  var rsum,gsum,bsum,asum,x,y,i,p,p1,p2,yp,yi,yw,idx,pa;
  var wm = width - 1;
    var hm = height - 1;
    var wh = width * height;
  var rad1 = radius + 1;

  var mul_sum = mul_table[radius];
  var shg_sum = shg_table[radius];

  var r = [];
    var g = [];
    var b = [];
  var a = [];

  var vmin = [];
  var vmax = [];

  while ( iterations-- > 0 ){
    yw = yi = 0;

    for ( y=0; y < height; y++ ){
      rsum = pixels[yw]   * rad1;
      gsum = pixels[yw+1] * rad1;
      bsum = pixels[yw+2] * rad1;
      asum = pixels[yw+3] * rad1;


      for( i = 1; i <= radius; i++ ){
        p = yw + (((i > wm ? wm : i )) << 2 );
        rsum += pixels[p++];
        gsum += pixels[p++];
        bsum += pixels[p++];
        asum += pixels[p]
      }

      for ( x = 0; x < width; x++ ) {
        r[yi] = rsum;
        g[yi] = gsum;
        b[yi] = bsum;
        a[yi] = asum;

        if( y==0) {
          vmin[x] = ( ( p = x + rad1) < wm ? p : wm ) << 2;
          vmax[x] = ( ( p = x - radius) > 0 ? p << 2 : 0 );
        }

        p1 = yw + vmin[x];
        p2 = yw + vmax[x];

        rsum += pixels[p1++] - pixels[p2++];
        gsum += pixels[p1++] - pixels[p2++];
        bsum += pixels[p1++] - pixels[p2++];
        asum += pixels[p1]   - pixels[p2];

        yi++;
      }
      yw += ( width << 2 );
    }

    for ( x = 0; x < width; x++ ) {
      yp = x;
      rsum = r[yp] * rad1;
      gsum = g[yp] * rad1;
      bsum = b[yp] * rad1;
      asum = a[yp] * rad1;

      for( i = 1; i <= radius; i++ ) {
        yp += ( i > hm ? 0 : width );
        rsum += r[yp];
        gsum += g[yp];
        bsum += b[yp];
        asum += a[yp];
      }

      yi = x << 2;
      for ( y = 0; y < height; y++) {

        pixels[yi+3] = pa = (asum * mul_sum) >>> shg_sum;
        if ( pa > 0 )
        {
          pa = 255 / pa;
          pixels[yi]   = ((rsum * mul_sum) >>> shg_sum) * pa;
          pixels[yi+1] = ((gsum * mul_sum) >>> shg_sum) * pa;
          pixels[yi+2] = ((bsum * mul_sum) >>> shg_sum) * pa;
        } else {
          pixels[yi] = pixels[yi+1] = pixels[yi+2] = 0;
        }
        if( x == 0 ) {
          vmin[y] = ( ( p = y + rad1) < hm ? p : hm ) * width;
          vmax[y] = ( ( p = y - radius) > 0 ? p * width : 0 );
        }

        p1 = x + vmin[y];
        p2 = x + vmax[y];

        rsum += r[p1] - r[p2];
        gsum += g[p1] - g[p2];
        bsum += b[p1] - b[p2];
        asum += a[p1] - a[p2];

        yi += width << 2;
      }
    }
  }

  context.putImageData( imageData, top_x, top_y );

}

function boxBlurCanvasRGB( id, top_x, top_y, width, height, radius, iterations ){
  if ( isNaN(radius) || radius < 1 ) return;

  radius |= 0;

  if ( isNaN(iterations) ) iterations = 1;
  iterations |= 0;
  if ( iterations > 3 ) iterations = 3;
  if ( iterations < 1 ) iterations = 1;

  var canvas  = document.getElementById( id );
  var context = canvas.getContext("2d");
  var imageData;

  try {
    try {
    imageData = context.getImageData( top_x, top_y, width, height );
    } catch(e) {

    // NOTE: this part is supposedly only needed if you want to work with local files
    // so it might be okay to remove the whole try/catch block and just use
    // imageData = context.getImageData( top_x, top_y, width, height );
    try {
      netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
      imageData = context.getImageData( top_x, top_y, width, height );
    } catch(e) {
      alert("Cannot access local image");
      throw new Error("unable to access local image data: " + e);
      return;
    }
    }
  } catch(e) {
    alert("Cannot access image");
    throw new Error("unable to access image data: " + e);
    return;
  }

  var pixels = imageData.data;

  var rsum,gsum,bsum,asum,x,y,i,p,p1,p2,yp,yi,yw,idx;
  var wm = width - 1;
    var hm = height - 1;
    var wh = width * height;
  var rad1 = radius + 1;

  var r = [];
    var g = [];
    var b = [];

  var mul_sum = mul_table[radius];
  var shg_sum = shg_table[radius];

  var vmin = [];
  var vmax = [];

  while ( iterations-- > 0 ){
    yw = yi = 0;

    for ( y=0; y < height; y++ ){
      rsum = pixels[yw]   * rad1;
      gsum = pixels[yw+1] * rad1;
      bsum = pixels[yw+2] * rad1;

      for( i = 1; i <= radius; i++ ){
        p = yw + (((i > wm ? wm : i )) << 2 );
        rsum += pixels[p++];
        gsum += pixels[p++];
        bsum += pixels[p++];
      }

      for ( x = 0; x < width; x++ ){
        r[yi] = rsum;
        g[yi] = gsum;
        b[yi] = bsum;

        if( y==0) {
          vmin[x] = ( ( p = x + rad1) < wm ? p : wm ) << 2;
          vmax[x] = ( ( p = x - radius) > 0 ? p << 2 : 0 );
        }

        p1 = yw + vmin[x];
        p2 = yw + vmax[x];

        rsum += pixels[p1++] - pixels[p2++];
        gsum += pixels[p1++] - pixels[p2++];
        bsum += pixels[p1++] - pixels[p2++];

        yi++;
      }
      yw += ( width << 2 );
    }

    for ( x = 0; x < width; x++ ){
      yp = x;
      rsum = r[yp] * rad1;
      gsum = g[yp] * rad1;
      bsum = b[yp] * rad1;

      for( i = 1; i <= radius; i++ ){
        yp += ( i > hm ? 0 : width );
        rsum += r[yp];
        gsum += g[yp];
        bsum += b[yp];
      }

      yi = x << 2;
      for ( y = 0; y < height; y++){
        pixels[yi]   = (rsum * mul_sum) >>> shg_sum;
        pixels[yi+1] = (gsum * mul_sum) >>> shg_sum;
        pixels[yi+2] = (bsum * mul_sum) >>> shg_sum;

        if( x == 0 ) {
          vmin[y] = ( ( p = y + rad1) < hm ? p : hm ) * width;
          vmax[y] = ( ( p = y - radius) > 0 ? p * width : 0 );
        }

        p1 = x + vmin[y];
        p2 = x + vmax[y];

        rsum += r[p1] - r[p2];
        gsum += g[p1] - g[p2];
        bsum += b[p1] - b[p2];

        yi += width << 2;
      }
    }
  }

  context.putImageData( imageData, top_x, top_y );

}

// tween.js - http://github.com/sole/tween.js
'use strict';void 0===Date.now&&(Date.now=function(){return(new Date).valueOf()});
var TWEEN=TWEEN||function(){var a=[];return{REVISION:"12",getAll:function(){return a},removeAll:function(){a=[]},add:function(c){a.push(c)},remove:function(c){c=a.indexOf(c);-1!==c&&a.splice(c,1)},update:function(c){if(0===a.length)return!1;for(var b=0,c=void 0!==c?c:"undefined"!==typeof window&&void 0!==window.performance&&void 0!==window.performance.now?window.performance.now():Date.now();b<a.length;)a[b].update(c)?b++:a.splice(b,1);return!0}}}();
TWEEN.Tween=function(a){var c={},b={},d={},e=1E3,g=0,h=!1,j=!1,q=0,m=null,v=TWEEN.Easing.Linear.None,w=TWEEN.Interpolation.Linear,n=[],r=null,s=!1,t=null,u=null,k;for(k in a)c[k]=parseFloat(a[k],10);this.to=function(a,c){void 0!==c&&(e=c);b=a;return this};this.start=function(e){TWEEN.add(this);j=!0;s=!1;m=void 0!==e?e:"undefined"!==typeof window&&void 0!==window.performance&&void 0!==window.performance.now?window.performance.now():Date.now();m+=q;for(var f in b){if(b[f]instanceof Array){if(0===b[f].length)continue;
b[f]=[a[f]].concat(b[f])}c[f]=a[f];!1===c[f]instanceof Array&&(c[f]*=1);d[f]=c[f]||0}return this};this.stop=function(){if(!j)return this;TWEEN.remove(this);j=!1;this.stopChainedTweens();return this};this.stopChainedTweens=function(){for(var a=0,b=n.length;a<b;a++)n[a].stop()};this.delay=function(a){q=a;return this};this.repeat=function(a){g=a;return this};this.yoyo=function(a){h=a;return this};this.easing=function(a){v=a;return this};this.interpolation=function(a){w=a;return this};this.chain=function(){n=
arguments;return this};this.onStart=function(a){r=a;return this};this.onUpdate=function(a){t=a;return this};this.onComplete=function(a){u=a;return this};this.update=function(p){var f;if(p<m)return!0;!1===s&&(null!==r&&r.call(a),s=!0);var i=(p-m)/e,i=1<i?1:i,j=v(i);for(f in b){var k=c[f]||0,l=b[f];l instanceof Array?a[f]=w(l,j):("string"===typeof l&&(l=k+parseFloat(l,10)),"number"===typeof l&&(a[f]=k+(l-k)*j))}null!==t&&t.call(a,j);if(1==i)if(0<g){isFinite(g)&&g--;for(f in d)"string"===typeof b[f]&&
(d[f]+=parseFloat(b[f],10)),h&&(i=d[f],d[f]=b[f],b[f]=i),c[f]=d[f];m=p+q}else{null!==u&&u.call(a);f=0;for(i=n.length;f<i;f++)n[f].start(p);return!1}return!0}};
TWEEN.Easing={Linear:{None:function(a){return a}},Quadratic:{In:function(a){return a*a},Out:function(a){return a*(2-a)},InOut:function(a){return 1>(a*=2)?0.5*a*a:-0.5*(--a*(a-2)-1)}},Cubic:{In:function(a){return a*a*a},Out:function(a){return--a*a*a+1},InOut:function(a){return 1>(a*=2)?0.5*a*a*a:0.5*((a-=2)*a*a+2)}},Quartic:{In:function(a){return a*a*a*a},Out:function(a){return 1- --a*a*a*a},InOut:function(a){return 1>(a*=2)?0.5*a*a*a*a:-0.5*((a-=2)*a*a*a-2)}},Quintic:{In:function(a){return a*a*a*
a*a},Out:function(a){return--a*a*a*a*a+1},InOut:function(a){return 1>(a*=2)?0.5*a*a*a*a*a:0.5*((a-=2)*a*a*a*a+2)}},Sinusoidal:{In:function(a){return 1-Math.cos(a*Math.PI/2)},Out:function(a){return Math.sin(a*Math.PI/2)},InOut:function(a){return 0.5*(1-Math.cos(Math.PI*a))}},Exponential:{In:function(a){return 0===a?0:Math.pow(1024,a-1)},Out:function(a){return 1===a?1:1-Math.pow(2,-10*a)},InOut:function(a){return 0===a?0:1===a?1:1>(a*=2)?0.5*Math.pow(1024,a-1):0.5*(-Math.pow(2,-10*(a-1))+2)}},Circular:{In:function(a){return 1-
Math.sqrt(1-a*a)},Out:function(a){return Math.sqrt(1- --a*a)},InOut:function(a){return 1>(a*=2)?-0.5*(Math.sqrt(1-a*a)-1):0.5*(Math.sqrt(1-(a-=2)*a)+1)}},Elastic:{In:function(a){var c,b=0.1;if(0===a)return 0;if(1===a)return 1;!b||1>b?(b=1,c=0.1):c=0.4*Math.asin(1/b)/(2*Math.PI);return-(b*Math.pow(2,10*(a-=1))*Math.sin((a-c)*2*Math.PI/0.4))},Out:function(a){var c,b=0.1;if(0===a)return 0;if(1===a)return 1;!b||1>b?(b=1,c=0.1):c=0.4*Math.asin(1/b)/(2*Math.PI);return b*Math.pow(2,-10*a)*Math.sin((a-c)*
2*Math.PI/0.4)+1},InOut:function(a){var c,b=0.1;if(0===a)return 0;if(1===a)return 1;!b||1>b?(b=1,c=0.1):c=0.4*Math.asin(1/b)/(2*Math.PI);return 1>(a*=2)?-0.5*b*Math.pow(2,10*(a-=1))*Math.sin((a-c)*2*Math.PI/0.4):0.5*b*Math.pow(2,-10*(a-=1))*Math.sin((a-c)*2*Math.PI/0.4)+1}},Back:{In:function(a){return a*a*(2.70158*a-1.70158)},Out:function(a){return--a*a*(2.70158*a+1.70158)+1},InOut:function(a){return 1>(a*=2)?0.5*a*a*(3.5949095*a-2.5949095):0.5*((a-=2)*a*(3.5949095*a+2.5949095)+2)}},Bounce:{In:function(a){return 1-
TWEEN.Easing.Bounce.Out(1-a)},Out:function(a){return a<1/2.75?7.5625*a*a:a<2/2.75?7.5625*(a-=1.5/2.75)*a+0.75:a<2.5/2.75?7.5625*(a-=2.25/2.75)*a+0.9375:7.5625*(a-=2.625/2.75)*a+0.984375},InOut:function(a){return 0.5>a?0.5*TWEEN.Easing.Bounce.In(2*a):0.5*TWEEN.Easing.Bounce.Out(2*a-1)+0.5}}};
TWEEN.Interpolation={Linear:function(a,c){var b=a.length-1,d=b*c,e=Math.floor(d),g=TWEEN.Interpolation.Utils.Linear;return 0>c?g(a[0],a[1],d):1<c?g(a[b],a[b-1],b-d):g(a[e],a[e+1>b?b:e+1],d-e)},Bezier:function(a,c){var b=0,d=a.length-1,e=Math.pow,g=TWEEN.Interpolation.Utils.Bernstein,h;for(h=0;h<=d;h++)b+=e(1-c,d-h)*e(c,h)*a[h]*g(d,h);return b},CatmullRom:function(a,c){var b=a.length-1,d=b*c,e=Math.floor(d),g=TWEEN.Interpolation.Utils.CatmullRom;return a[0]===a[b]?(0>c&&(e=Math.floor(d=b*(1+c))),g(a[(e-
1+b)%b],a[e],a[(e+1)%b],a[(e+2)%b],d-e)):0>c?a[0]-(g(a[0],a[0],a[1],a[1],-d)-a[0]):1<c?a[b]-(g(a[b],a[b],a[b-1],a[b-1],d-b)-a[b]):g(a[e?e-1:0],a[e],a[b<e+1?b:e+1],a[b<e+2?b:e+2],d-e)},Utils:{Linear:function(a,c,b){return(c-a)*b+a},Bernstein:function(a,c){var b=TWEEN.Interpolation.Utils.Factorial;return b(a)/b(c)/b(a-c)},Factorial:function(){var a=[1];return function(c){var b=1,d;if(a[c])return a[c];for(d=c;1<d;d--)b*=d;return a[c]=b}}(),CatmullRom:function(a,c,b,d,e){var a=0.5*(b-a),d=0.5*(d-c),g=
e*e;return(2*c-2*b+a+d)*e*g+(-3*c+3*b-2*a-d)*g+a*e+c}}};

/**
 * dat-gui JavaScript Controller Library
 * http://code.google.com/p/dat-gui
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */
var dat=dat||{};dat.gui=dat.gui||{};dat.utils=dat.utils||{};dat.controllers=dat.controllers||{};dat.dom=dat.dom||{};dat.color=dat.color||{};dat.utils.css=function(){return{load:function(e,a){var a=a||document,c=a.createElement("link");c.type="text/css";c.rel="stylesheet";c.href=e;a.getElementsByTagName("head")[0].appendChild(c)},inject:function(e,a){var a=a||document,c=document.createElement("style");c.type="text/css";c.innerHTML=e;a.getElementsByTagName("head")[0].appendChild(c)}}}();
dat.utils.common=function(){var e=Array.prototype.forEach,a=Array.prototype.slice;return{BREAK:{},extend:function(c){this.each(a.call(arguments,1),function(a){for(var f in a)this.isUndefined(a[f])||(c[f]=a[f])},this);return c},defaults:function(c){this.each(a.call(arguments,1),function(a){for(var f in a)this.isUndefined(c[f])&&(c[f]=a[f])},this);return c},compose:function(){var c=a.call(arguments);return function(){for(var d=a.call(arguments),f=c.length-1;f>=0;f--)d=[c[f].apply(this,d)];return d[0]}},
each:function(a,d,f){if(e&&a.forEach===e)a.forEach(d,f);else if(a.length===a.length+0)for(var b=0,n=a.length;b<n;b++){if(b in a&&d.call(f,a[b],b)===this.BREAK)break}else for(b in a)if(d.call(f,a[b],b)===this.BREAK)break},defer:function(a){setTimeout(a,0)},toArray:function(c){return c.toArray?c.toArray():a.call(c)},isUndefined:function(a){return a===void 0},isNull:function(a){return a===null},isNaN:function(a){return a!==a},isArray:Array.isArray||function(a){return a.constructor===Array},isObject:function(a){return a===
Object(a)},isNumber:function(a){return a===a+0},isString:function(a){return a===a+""},isBoolean:function(a){return a===false||a===true},isFunction:function(a){return Object.prototype.toString.call(a)==="[object Function]"}}}();
dat.controllers.Controller=function(e){var a=function(a,d){this.initialValue=a[d];this.domElement=document.createElement("div");this.object=a;this.property=d;this.__onFinishChange=this.__onChange=void 0};e.extend(a.prototype,{onChange:function(a){this.__onChange=a;return this},onFinishChange:function(a){this.__onFinishChange=a;return this},setValue:function(a){this.object[this.property]=a;this.__onChange&&this.__onChange.call(this,a);this.updateDisplay();return this},getValue:function(){return this.object[this.property]},
updateDisplay:function(){return this},isModified:function(){return this.initialValue!==this.getValue()}});return a}(dat.utils.common);
dat.dom.dom=function(e){function a(b){if(b==="0"||e.isUndefined(b))return 0;b=b.match(d);return!e.isNull(b)?parseFloat(b[1]):0}var c={};e.each({HTMLEvents:["change"],MouseEvents:["click","mousemove","mousedown","mouseup","mouseover"],KeyboardEvents:["keydown"]},function(b,a){e.each(b,function(b){c[b]=a})});var d=/(\d+(\.\d+)?)px/,f={makeSelectable:function(b,a){if(!(b===void 0||b.style===void 0))b.onselectstart=a?function(){return false}:function(){},b.style.MozUserSelect=a?"auto":"none",b.style.KhtmlUserSelect=
a?"auto":"none",b.unselectable=a?"on":"off"},makeFullscreen:function(b,a,d){e.isUndefined(a)&&(a=true);e.isUndefined(d)&&(d=true);b.style.position="absolute";if(a)b.style.left=0,b.style.right=0;if(d)b.style.top=0,b.style.bottom=0},fakeEvent:function(b,a,d,f){var d=d||{},m=c[a];if(!m)throw Error("Event type "+a+" not supported.");var l=document.createEvent(m);switch(m){case "MouseEvents":l.initMouseEvent(a,d.bubbles||false,d.cancelable||true,window,d.clickCount||1,0,0,d.x||d.clientX||0,d.y||d.clientY||
0,false,false,false,false,0,null);break;case "KeyboardEvents":m=l.initKeyboardEvent||l.initKeyEvent;e.defaults(d,{cancelable:true,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false,keyCode:void 0,charCode:void 0});m(a,d.bubbles||false,d.cancelable,window,d.ctrlKey,d.altKey,d.shiftKey,d.metaKey,d.keyCode,d.charCode);break;default:l.initEvent(a,d.bubbles||false,d.cancelable||true)}e.defaults(l,f);b.dispatchEvent(l)},bind:function(b,a,d,c){b.addEventListener?b.addEventListener(a,d,c||false):b.attachEvent&&
b.attachEvent("on"+a,d);return f},unbind:function(b,a,d,c){b.removeEventListener?b.removeEventListener(a,d,c||false):b.detachEvent&&b.detachEvent("on"+a,d);return f},addClass:function(b,a){if(b.className===void 0)b.className=a;else if(b.className!==a){var d=b.className.split(/ +/);if(d.indexOf(a)==-1)d.push(a),b.className=d.join(" ").replace(/^\s+/,"").replace(/\s+$/,"")}return f},removeClass:function(b,a){if(a){if(b.className!==void 0)if(b.className===a)b.removeAttribute("class");else{var d=b.className.split(/ +/),
c=d.indexOf(a);if(c!=-1)d.splice(c,1),b.className=d.join(" ")}}else b.className=void 0;return f},hasClass:function(a,d){return RegExp("(?:^|\\s+)"+d+"(?:\\s+|$)").test(a.className)||false},getWidth:function(b){b=getComputedStyle(b);return a(b["border-left-width"])+a(b["border-right-width"])+a(b["padding-left"])+a(b["padding-right"])+a(b.width)},getHeight:function(b){b=getComputedStyle(b);return a(b["border-top-width"])+a(b["border-bottom-width"])+a(b["padding-top"])+a(b["padding-bottom"])+a(b.height)},
getOffset:function(a){var d={left:0,top:0};if(a.offsetParent){do d.left+=a.offsetLeft,d.top+=a.offsetTop;while(a=a.offsetParent)}return d},isActive:function(a){return a===document.activeElement&&(a.type||a.href)}};return f}(dat.utils.common);
dat.controllers.OptionController=function(e,a,c){var d=function(f,b,e){d.superclass.call(this,f,b);var h=this;this.__select=document.createElement("select");if(c.isArray(e)){var j={};c.each(e,function(a){j[a]=a});e=j}c.each(e,function(a,b){var d=document.createElement("option");d.innerHTML=b;d.setAttribute("value",a);h.__select.appendChild(d)});this.updateDisplay();a.bind(this.__select,"change",function(){h.setValue(this.options[this.selectedIndex].value)});this.domElement.appendChild(this.__select)};
d.superclass=e;c.extend(d.prototype,e.prototype,{setValue:function(a){a=d.superclass.prototype.setValue.call(this,a);this.__onFinishChange&&this.__onFinishChange.call(this,this.getValue());return a},updateDisplay:function(){this.__select.value=this.getValue();return d.superclass.prototype.updateDisplay.call(this)}});return d}(dat.controllers.Controller,dat.dom.dom,dat.utils.common);
dat.controllers.NumberController=function(e,a){var c=function(d,f,b){c.superclass.call(this,d,f);b=b||{};this.__min=b.min;this.__max=b.max;this.__step=b.step;d=this.__impliedStep=a.isUndefined(this.__step)?this.initialValue==0?1:Math.pow(10,Math.floor(Math.log(this.initialValue)/Math.LN10))/10:this.__step;d=d.toString();this.__precision=d.indexOf(".")>-1?d.length-d.indexOf(".")-1:0};c.superclass=e;a.extend(c.prototype,e.prototype,{setValue:function(a){if(this.__min!==void 0&&a<this.__min)a=this.__min;
else if(this.__max!==void 0&&a>this.__max)a=this.__max;this.__step!==void 0&&a%this.__step!=0&&(a=Math.round(a/this.__step)*this.__step);return c.superclass.prototype.setValue.call(this,a)},min:function(a){this.__min=a;return this},max:function(a){this.__max=a;return this},step:function(a){this.__step=a;return this}});return c}(dat.controllers.Controller,dat.utils.common);
dat.controllers.NumberControllerBox=function(e,a,c){var d=function(f,b,e){function h(){var a=parseFloat(l.__input.value);c.isNaN(a)||l.setValue(a)}function j(a){var b=o-a.clientY;l.setValue(l.getValue()+b*l.__impliedStep);o=a.clientY}function m(){a.unbind(window,"mousemove",j);a.unbind(window,"mouseup",m)}this.__truncationSuspended=false;d.superclass.call(this,f,b,e);var l=this,o;this.__input=document.createElement("input");this.__input.setAttribute("type","text");a.bind(this.__input,"change",h);
a.bind(this.__input,"blur",function(){h();l.__onFinishChange&&l.__onFinishChange.call(l,l.getValue())});a.bind(this.__input,"mousedown",function(b){a.bind(window,"mousemove",j);a.bind(window,"mouseup",m);o=b.clientY});a.bind(this.__input,"keydown",function(a){if(a.keyCode===13)l.__truncationSuspended=true,this.blur(),l.__truncationSuspended=false});this.updateDisplay();this.domElement.appendChild(this.__input)};d.superclass=e;c.extend(d.prototype,e.prototype,{updateDisplay:function(){var a=this.__input,
b;if(this.__truncationSuspended)b=this.getValue();else{b=this.getValue();var c=Math.pow(10,this.__precision);b=Math.round(b*c)/c}a.value=b;return d.superclass.prototype.updateDisplay.call(this)}});return d}(dat.controllers.NumberController,dat.dom.dom,dat.utils.common);
dat.controllers.NumberControllerSlider=function(e,a,c,d,f){var b=function(d,c,f,e,l){function o(b){b.preventDefault();var d=a.getOffset(g.__background),c=a.getWidth(g.__background);g.setValue(g.__min+(g.__max-g.__min)*((b.clientX-d.left)/(d.left+c-d.left)));return false}function y(){a.unbind(window,"mousemove",o);a.unbind(window,"mouseup",y);g.__onFinishChange&&g.__onFinishChange.call(g,g.getValue())}b.superclass.call(this,d,c,{min:f,max:e,step:l});var g=this;this.__background=document.createElement("div");
this.__foreground=document.createElement("div");a.bind(this.__background,"mousedown",function(b){a.bind(window,"mousemove",o);a.bind(window,"mouseup",y);o(b)});a.addClass(this.__background,"slider");a.addClass(this.__foreground,"slider-fg");this.updateDisplay();this.__background.appendChild(this.__foreground);this.domElement.appendChild(this.__background)};b.superclass=e;b.useDefaultStyles=function(){c.inject(f)};d.extend(b.prototype,e.prototype,{updateDisplay:function(){this.__foreground.style.width=
(this.getValue()-this.__min)/(this.__max-this.__min)*100+"%";return b.superclass.prototype.updateDisplay.call(this)}});return b}(dat.controllers.NumberController,dat.dom.dom,dat.utils.css,dat.utils.common,".slider {\n  box-shadow: inset 0 2px 4px rgba(0,0,0,0.15);\n  height: 1em;\n  border-radius: 1em;\n  background-color: #eee;\n  padding: 0 0.5em;\n  overflow: hidden;\n}\n\n.slider-fg {\n  padding: 1px 0 2px 0;\n  background-color: #aaa;\n  height: 1em;\n  margin-left: -0.5em;\n  padding-right: 0.5em;\n  border-radius: 1em 0 0 1em;\n}\n\n.slider-fg:after {\n  display: inline-block;\n  border-radius: 1em;\n  background-color: #fff;\n  border:  1px solid #aaa;\n  content: '';\n  float: right;\n  margin-right: -1em;\n  margin-top: -1px;\n  height: 0.9em;\n  width: 0.9em;\n}");
dat.controllers.FunctionController=function(e,a,c){var d=function(c,b,e){d.superclass.call(this,c,b);var h=this;this.__button=document.createElement("div");this.__button.innerHTML=e===void 0?"Fire":e;a.bind(this.__button,"click",function(a){a.preventDefault();h.fire();return false});a.addClass(this.__button,"button");this.domElement.appendChild(this.__button)};d.superclass=e;c.extend(d.prototype,e.prototype,{fire:function(){this.__onChange&&this.__onChange.call(this);this.__onFinishChange&&this.__onFinishChange.call(this,
this.getValue());this.getValue().call(this.object)}});return d}(dat.controllers.Controller,dat.dom.dom,dat.utils.common);
dat.controllers.BooleanController=function(e,a,c){var d=function(c,b){d.superclass.call(this,c,b);var e=this;this.__prev=this.getValue();this.__checkbox=document.createElement("input");this.__checkbox.setAttribute("type","checkbox");a.bind(this.__checkbox,"change",function(){e.setValue(!e.__prev)},false);this.domElement.appendChild(this.__checkbox);this.updateDisplay()};d.superclass=e;c.extend(d.prototype,e.prototype,{setValue:function(a){a=d.superclass.prototype.setValue.call(this,a);this.__onFinishChange&&
this.__onFinishChange.call(this,this.getValue());this.__prev=this.getValue();return a},updateDisplay:function(){this.getValue()===true?(this.__checkbox.setAttribute("checked","checked"),this.__checkbox.checked=true):this.__checkbox.checked=false;return d.superclass.prototype.updateDisplay.call(this)}});return d}(dat.controllers.Controller,dat.dom.dom,dat.utils.common);
dat.color.toString=function(e){return function(a){if(a.a==1||e.isUndefined(a.a)){for(a=a.hex.toString(16);a.length<6;)a="0"+a;return"#"+a}else return"rgba("+Math.round(a.r)+","+Math.round(a.g)+","+Math.round(a.b)+","+a.a+")"}}(dat.utils.common);
dat.color.interpret=function(e,a){var c,d,f=[{litmus:a.isString,conversions:{THREE_CHAR_HEX:{read:function(a){a=a.match(/^#([A-F0-9])([A-F0-9])([A-F0-9])$/i);return a===null?false:{space:"HEX",hex:parseInt("0x"+a[1].toString()+a[1].toString()+a[2].toString()+a[2].toString()+a[3].toString()+a[3].toString())}},write:e},SIX_CHAR_HEX:{read:function(a){a=a.match(/^#([A-F0-9]{6})$/i);return a===null?false:{space:"HEX",hex:parseInt("0x"+a[1].toString())}},write:e},CSS_RGB:{read:function(a){a=a.match(/^rgb\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\)/);
return a===null?false:{space:"RGB",r:parseFloat(a[1]),g:parseFloat(a[2]),b:parseFloat(a[3])}},write:e},CSS_RGBA:{read:function(a){a=a.match(/^rgba\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\,\s*(.+)\s*\)/);return a===null?false:{space:"RGB",r:parseFloat(a[1]),g:parseFloat(a[2]),b:parseFloat(a[3]),a:parseFloat(a[4])}},write:e}}},{litmus:a.isNumber,conversions:{HEX:{read:function(a){return{space:"HEX",hex:a,conversionName:"HEX"}},write:function(a){return a.hex}}}},{litmus:a.isArray,conversions:{RGB_ARRAY:{read:function(a){return a.length!=
3?false:{space:"RGB",r:a[0],g:a[1],b:a[2]}},write:function(a){return[a.r,a.g,a.b]}},RGBA_ARRAY:{read:function(a){return a.length!=4?false:{space:"RGB",r:a[0],g:a[1],b:a[2],a:a[3]}},write:function(a){return[a.r,a.g,a.b,a.a]}}}},{litmus:a.isObject,conversions:{RGBA_OBJ:{read:function(b){return a.isNumber(b.r)&&a.isNumber(b.g)&&a.isNumber(b.b)&&a.isNumber(b.a)?{space:"RGB",r:b.r,g:b.g,b:b.b,a:b.a}:false},write:function(a){return{r:a.r,g:a.g,b:a.b,a:a.a}}},RGB_OBJ:{read:function(b){return a.isNumber(b.r)&&
a.isNumber(b.g)&&a.isNumber(b.b)?{space:"RGB",r:b.r,g:b.g,b:b.b}:false},write:function(a){return{r:a.r,g:a.g,b:a.b}}},HSVA_OBJ:{read:function(b){return a.isNumber(b.h)&&a.isNumber(b.s)&&a.isNumber(b.v)&&a.isNumber(b.a)?{space:"HSV",h:b.h,s:b.s,v:b.v,a:b.a}:false},write:function(a){return{h:a.h,s:a.s,v:a.v,a:a.a}}},HSV_OBJ:{read:function(b){return a.isNumber(b.h)&&a.isNumber(b.s)&&a.isNumber(b.v)?{space:"HSV",h:b.h,s:b.s,v:b.v}:false},write:function(a){return{h:a.h,s:a.s,v:a.v}}}}}];return function(){d=
false;var b=arguments.length>1?a.toArray(arguments):arguments[0];a.each(f,function(e){if(e.litmus(b))return a.each(e.conversions,function(e,f){c=e.read(b);if(d===false&&c!==false)return d=c,c.conversionName=f,c.conversion=e,a.BREAK}),a.BREAK});return d}}(dat.color.toString,dat.utils.common);
dat.GUI=dat.gui.GUI=function(e,a,c,d,f,b,n,h,j,m,l,o,y,g,i){function q(a,b,r,c){if(b[r]===void 0)throw Error("Object "+b+' has no property "'+r+'"');c.color?b=new l(b,r):(b=[b,r].concat(c.factoryArgs),b=d.apply(a,b));if(c.before instanceof f)c.before=c.before.__li;t(a,b);g.addClass(b.domElement,"c");r=document.createElement("span");g.addClass(r,"property-name");r.innerHTML=b.property;var e=document.createElement("div");e.appendChild(r);e.appendChild(b.domElement);c=s(a,e,c.before);g.addClass(c,k.CLASS_CONTROLLER_ROW);
g.addClass(c,typeof b.getValue());p(a,c,b);a.__controllers.push(b);return b}function s(a,b,d){var c=document.createElement("li");b&&c.appendChild(b);d?a.__ul.insertBefore(c,params.before):a.__ul.appendChild(c);a.onResize();return c}function p(a,d,c){c.__li=d;c.__gui=a;i.extend(c,{options:function(b){if(arguments.length>1)return c.remove(),q(a,c.object,c.property,{before:c.__li.nextElementSibling,factoryArgs:[i.toArray(arguments)]});if(i.isArray(b)||i.isObject(b))return c.remove(),q(a,c.object,c.property,
{before:c.__li.nextElementSibling,factoryArgs:[b]})},name:function(a){c.__li.firstElementChild.firstElementChild.innerHTML=a;return c},listen:function(){c.__gui.listen(c);return c},remove:function(){c.__gui.remove(c);return c}});if(c instanceof j){var e=new h(c.object,c.property,{min:c.__min,max:c.__max,step:c.__step});i.each(["updateDisplay","onChange","onFinishChange"],function(a){var b=c[a],H=e[a];c[a]=e[a]=function(){var a=Array.prototype.slice.call(arguments);b.apply(c,a);return H.apply(e,a)}});
g.addClass(d,"has-slider");c.domElement.insertBefore(e.domElement,c.domElement.firstElementChild)}else if(c instanceof h){var f=function(b){return i.isNumber(c.__min)&&i.isNumber(c.__max)?(c.remove(),q(a,c.object,c.property,{before:c.__li.nextElementSibling,factoryArgs:[c.__min,c.__max,c.__step]})):b};c.min=i.compose(f,c.min);c.max=i.compose(f,c.max)}else if(c instanceof b)g.bind(d,"click",function(){g.fakeEvent(c.__checkbox,"click")}),g.bind(c.__checkbox,"click",function(a){a.stopPropagation()});
else if(c instanceof n)g.bind(d,"click",function(){g.fakeEvent(c.__button,"click")}),g.bind(d,"mouseover",function(){g.addClass(c.__button,"hover")}),g.bind(d,"mouseout",function(){g.removeClass(c.__button,"hover")});else if(c instanceof l)g.addClass(d,"color"),c.updateDisplay=i.compose(function(a){d.style.borderLeftColor=c.__color.toString();return a},c.updateDisplay),c.updateDisplay();c.setValue=i.compose(function(b){a.getRoot().__preset_select&&c.isModified()&&B(a.getRoot(),true);return b},c.setValue)}
function t(a,b){var c=a.getRoot(),d=c.__rememberedObjects.indexOf(b.object);if(d!=-1){var e=c.__rememberedObjectIndecesToControllers[d];e===void 0&&(e={},c.__rememberedObjectIndecesToControllers[d]=e);e[b.property]=b;if(c.load&&c.load.remembered){c=c.load.remembered;if(c[a.preset])c=c[a.preset];else if(c[w])c=c[w];else return;if(c[d]&&c[d][b.property]!==void 0)d=c[d][b.property],b.initialValue=d,b.setValue(d)}}}function I(a){var b=a.__save_row=document.createElement("li");g.addClass(a.domElement,
"has-save");a.__ul.insertBefore(b,a.__ul.firstChild);g.addClass(b,"save-row");var c=document.createElement("span");c.innerHTML="&nbsp;";g.addClass(c,"button gears");var d=document.createElement("span");d.innerHTML="Save";g.addClass(d,"button");g.addClass(d,"save");var e=document.createElement("span");e.innerHTML="New";g.addClass(e,"button");g.addClass(e,"save-as");var f=document.createElement("span");f.innerHTML="Revert";g.addClass(f,"button");g.addClass(f,"revert");var m=a.__preset_select=document.createElement("select");
a.load&&a.load.remembered?i.each(a.load.remembered,function(b,c){C(a,c,c==a.preset)}):C(a,w,false);g.bind(m,"change",function(){for(var b=0;b<a.__preset_select.length;b++)a.__preset_select[b].innerHTML=a.__preset_select[b].value;a.preset=this.value});b.appendChild(m);b.appendChild(c);b.appendChild(d);b.appendChild(e);b.appendChild(f);if(u){var b=document.getElementById("dg-save-locally"),l=document.getElementById("dg-local-explain");b.style.display="block";b=document.getElementById("dg-local-storage");
localStorage.getItem(document.location.href+".isLocal")==="true"&&b.setAttribute("checked","checked");var o=function(){l.style.display=a.useLocalStorage?"block":"none"};o();g.bind(b,"change",function(){a.useLocalStorage=!a.useLocalStorage;o()})}var h=document.getElementById("dg-new-constructor");g.bind(h,"keydown",function(a){a.metaKey&&(a.which===67||a.keyCode==67)&&x.hide()});g.bind(c,"click",function(){h.innerHTML=JSON.stringify(a.getSaveObject(),void 0,2);x.show();h.focus();h.select()});g.bind(d,
"click",function(){a.save()});g.bind(e,"click",function(){var b=prompt("Enter a new preset name.");b&&a.saveAs(b)});g.bind(f,"click",function(){a.revert()})}function J(a){function b(f){f.preventDefault();e=f.clientX;g.addClass(a.__closeButton,k.CLASS_DRAG);g.bind(window,"mousemove",c);g.bind(window,"mouseup",d);return false}function c(b){b.preventDefault();a.width+=e-b.clientX;a.onResize();e=b.clientX;return false}function d(){g.removeClass(a.__closeButton,k.CLASS_DRAG);g.unbind(window,"mousemove",
c);g.unbind(window,"mouseup",d)}a.__resize_handle=document.createElement("div");i.extend(a.__resize_handle.style,{width:"6px",marginLeft:"-3px",height:"200px",cursor:"ew-resize",position:"absolute"});var e;g.bind(a.__resize_handle,"mousedown",b);g.bind(a.__closeButton,"mousedown",b);a.domElement.insertBefore(a.__resize_handle,a.domElement.firstElementChild)}function D(a,b){a.domElement.style.width=b+"px";if(a.__save_row&&a.autoPlace)a.__save_row.style.width=b+"px";if(a.__closeButton)a.__closeButton.style.width=
b+"px"}function z(a,b){var c={};i.each(a.__rememberedObjects,function(d,e){var f={};i.each(a.__rememberedObjectIndecesToControllers[e],function(a,c){f[c]=b?a.initialValue:a.getValue()});c[e]=f});return c}function C(a,b,c){var d=document.createElement("option");d.innerHTML=b;d.value=b;a.__preset_select.appendChild(d);if(c)a.__preset_select.selectedIndex=a.__preset_select.length-1}function B(a,b){var c=a.__preset_select[a.__preset_select.selectedIndex];c.innerHTML=b?c.value+"*":c.value}function E(a){a.length!=
0&&o(function(){E(a)});i.each(a,function(a){a.updateDisplay()})}e.inject(c);var w="Default",u;try{u="localStorage"in window&&window.localStorage!==null}catch(K){u=false}var x,F=true,v,A=false,G=[],k=function(a){function b(){localStorage.setItem(document.location.href+".gui",JSON.stringify(d.getSaveObject()))}function c(){var a=d.getRoot();a.width+=1;i.defer(function(){a.width-=1})}var d=this;this.domElement=document.createElement("div");this.__ul=document.createElement("ul");this.domElement.appendChild(this.__ul);
g.addClass(this.domElement,"dg");this.__folders={};this.__controllers=[];this.__rememberedObjects=[];this.__rememberedObjectIndecesToControllers=[];this.__listening=[];a=a||{};a=i.defaults(a,{autoPlace:true,width:k.DEFAULT_WIDTH});a=i.defaults(a,{resizable:a.autoPlace,hideable:a.autoPlace});if(i.isUndefined(a.load))a.load={preset:w};else if(a.preset)a.load.preset=a.preset;i.isUndefined(a.parent)&&a.hideable&&G.push(this);a.resizable=i.isUndefined(a.parent)&&a.resizable;if(a.autoPlace&&i.isUndefined(a.scrollable))a.scrollable=
true;var e=u&&localStorage.getItem(document.location.href+".isLocal")==="true";Object.defineProperties(this,{parent:{get:function(){return a.parent}},scrollable:{get:function(){return a.scrollable}},autoPlace:{get:function(){return a.autoPlace}},preset:{get:function(){return d.parent?d.getRoot().preset:a.load.preset},set:function(b){d.parent?d.getRoot().preset=b:a.load.preset=b;for(b=0;b<this.__preset_select.length;b++)if(this.__preset_select[b].value==this.preset)this.__preset_select.selectedIndex=
b;d.revert()}},width:{get:function(){return a.width},set:function(b){a.width=b;D(d,b)}},name:{get:function(){return a.name},set:function(b){a.name=b;if(m)m.innerHTML=a.name}},closed:{get:function(){return a.closed},set:function(b){a.closed=b;a.closed?g.addClass(d.__ul,k.CLASS_CLOSED):g.removeClass(d.__ul,k.CLASS_CLOSED);this.onResize();if(d.__closeButton)d.__closeButton.innerHTML=b?k.TEXT_OPEN:k.TEXT_CLOSED}},load:{get:function(){return a.load}},useLocalStorage:{get:function(){return e},set:function(a){u&&
((e=a)?g.bind(window,"unload",b):g.unbind(window,"unload",b),localStorage.setItem(document.location.href+".isLocal",a))}}});if(i.isUndefined(a.parent)){a.closed=false;g.addClass(this.domElement,k.CLASS_MAIN);g.makeSelectable(this.domElement,false);if(u&&e){d.useLocalStorage=true;var f=localStorage.getItem(document.location.href+".gui");if(f)a.load=JSON.parse(f)}this.__closeButton=document.createElement("div");this.__closeButton.innerHTML=k.TEXT_CLOSED;g.addClass(this.__closeButton,k.CLASS_CLOSE_BUTTON);
this.domElement.appendChild(this.__closeButton);g.bind(this.__closeButton,"click",function(){d.closed=!d.closed})}else{if(a.closed===void 0)a.closed=true;var m=document.createTextNode(a.name);g.addClass(m,"controller-name");f=s(d,m);g.addClass(this.__ul,k.CLASS_CLOSED);g.addClass(f,"title");g.bind(f,"click",function(a){a.preventDefault();d.closed=!d.closed;return false});if(!a.closed)this.closed=false}a.autoPlace&&(i.isUndefined(a.parent)&&(F&&(v=document.createElement("div"),g.addClass(v,"dg"),g.addClass(v,
k.CLASS_AUTO_PLACE_CONTAINER),document.body.appendChild(v),F=false),v.appendChild(this.domElement),g.addClass(this.domElement,k.CLASS_AUTO_PLACE)),this.parent||D(d,a.width));g.bind(window,"resize",function(){d.onResize()});g.bind(this.__ul,"webkitTransitionEnd",function(){d.onResize()});g.bind(this.__ul,"transitionend",function(){d.onResize()});g.bind(this.__ul,"oTransitionEnd",function(){d.onResize()});this.onResize();a.resizable&&J(this);d.getRoot();a.parent||c()};k.toggleHide=function(){A=!A;i.each(G,
function(a){a.domElement.style.zIndex=A?-999:999;a.domElement.style.opacity=A?0:1})};k.CLASS_AUTO_PLACE="a";k.CLASS_AUTO_PLACE_CONTAINER="ac";k.CLASS_MAIN="main";k.CLASS_CONTROLLER_ROW="cr";k.CLASS_TOO_TALL="taller-than-window";k.CLASS_CLOSED="closed";k.CLASS_CLOSE_BUTTON="close-button";k.CLASS_DRAG="drag";k.DEFAULT_WIDTH=245;k.TEXT_CLOSED="Close Controls";k.TEXT_OPEN="Open Controls";g.bind(window,"keydown",function(a){document.activeElement.type!=="text"&&(a.which===72||a.keyCode==72)&&k.toggleHide()},
false);i.extend(k.prototype,{add:function(a,b){return q(this,a,b,{factoryArgs:Array.prototype.slice.call(arguments,2)})},addColor:function(a,b){return q(this,a,b,{color:true})},remove:function(a){this.__ul.removeChild(a.__li);this.__controllers.slice(this.__controllers.indexOf(a),1);var b=this;i.defer(function(){b.onResize()})},destroy:function(){this.autoPlace&&v.removeChild(this.domElement)},addFolder:function(a){if(this.__folders[a]!==void 0)throw Error('You already have a folder in this GUI by the name "'+
a+'"');var b={name:a,parent:this};b.autoPlace=this.autoPlace;if(this.load&&this.load.folders&&this.load.folders[a])b.closed=this.load.folders[a].closed,b.load=this.load.folders[a];b=new k(b);this.__folders[a]=b;a=s(this,b.domElement);g.addClass(a,"folder");return b},open:function(){this.closed=false},close:function(){this.closed=true},onResize:function(){var a=this.getRoot();if(a.scrollable){var b=g.getOffset(a.__ul).top,c=0;i.each(a.__ul.childNodes,function(b){a.autoPlace&&b===a.__save_row||(c+=
g.getHeight(b))});window.innerHeight-b-20<c?(g.addClass(a.domElement,k.CLASS_TOO_TALL),a.__ul.style.height=window.innerHeight-b-20+"px"):(g.removeClass(a.domElement,k.CLASS_TOO_TALL),a.__ul.style.height="auto")}a.__resize_handle&&i.defer(function(){a.__resize_handle.style.height=a.__ul.offsetHeight+"px"});if(a.__closeButton)a.__closeButton.style.width=a.width+"px"},remember:function(){if(i.isUndefined(x))x=new y,x.domElement.innerHTML=a;if(this.parent)throw Error("You can only call remember on a top level GUI.");
var b=this;i.each(Array.prototype.slice.call(arguments),function(a){b.__rememberedObjects.length==0&&I(b);b.__rememberedObjects.indexOf(a)==-1&&b.__rememberedObjects.push(a)});this.autoPlace&&D(this,this.width)},getRoot:function(){for(var a=this;a.parent;)a=a.parent;return a},getSaveObject:function(){var a=this.load;a.closed=this.closed;if(this.__rememberedObjects.length>0){a.preset=this.preset;if(!a.remembered)a.remembered={};a.remembered[this.preset]=z(this)}a.folders={};i.each(this.__folders,function(b,
c){a.folders[c]=b.getSaveObject()});return a},save:function(){if(!this.load.remembered)this.load.remembered={};this.load.remembered[this.preset]=z(this);B(this,false)},saveAs:function(a){if(!this.load.remembered)this.load.remembered={},this.load.remembered[w]=z(this,true);this.load.remembered[a]=z(this);this.preset=a;C(this,a,true)},revert:function(a){i.each(this.__controllers,function(b){this.getRoot().load.remembered?t(a||this.getRoot(),b):b.setValue(b.initialValue)},this);i.each(this.__folders,
function(a){a.revert(a)});a||B(this.getRoot(),false)},listen:function(a){var b=this.__listening.length==0;this.__listening.push(a);b&&E(this.__listening)}});return k}(dat.utils.css,'<div id="dg-save" class="dg dialogue">\n\n  Here\'s the new load parameter for your <code>GUI</code>\'s constructor:\n\n  <textarea id="dg-new-constructor"></textarea>\n\n  <div id="dg-save-locally">\n\n    <input id="dg-local-storage" type="checkbox"/> Automatically save\n    values to <code>localStorage</code> on exit.\n\n    <div id="dg-local-explain">The values saved to <code>localStorage</code> will\n      override those passed to <code>dat.GUI</code>\'s constructor. This makes it\n      easier to work incrementally, but <code>localStorage</code> is fragile,\n      and your friends may not see the same values you do.\n      \n    </div>\n    \n  </div>\n\n</div>',
".dg ul{list-style:none;margin:0;padding:0;width:100%;clear:both}.dg.ac{position:fixed;top:0;left:0;right:0;height:0;z-index:0}.dg:not(.ac) .main{overflow:hidden}.dg.main{-webkit-transition:opacity 0.1s linear;-o-transition:opacity 0.1s linear;-moz-transition:opacity 0.1s linear;transition:opacity 0.1s linear}.dg.main.taller-than-window{overflow-y:auto}.dg.main.taller-than-window .close-button{opacity:1;margin-top:-1px;border-top:1px solid #2c2c2c}.dg.main ul.closed .close-button{opacity:1 !important}.dg.main:hover .close-button,.dg.main .close-button.drag{opacity:1}.dg.main .close-button{-webkit-transition:opacity 0.1s linear;-o-transition:opacity 0.1s linear;-moz-transition:opacity 0.1s linear;transition:opacity 0.1s linear;border:0;position:absolute;line-height:19px;height:20px;cursor:pointer;text-align:center;background-color:#000}.dg.main .close-button:hover{background-color:#111}.dg.a{float:right;margin-right:15px;overflow-x:hidden}.dg.a.has-save ul{margin-top:27px}.dg.a.has-save ul.closed{margin-top:0}.dg.a .save-row{position:fixed;top:0;z-index:1002}.dg li{-webkit-transition:height 0.1s ease-out;-o-transition:height 0.1s ease-out;-moz-transition:height 0.1s ease-out;transition:height 0.1s ease-out}.dg li:not(.folder){cursor:auto;height:27px;line-height:27px;overflow:hidden;padding:0 4px 0 5px}.dg li.folder{padding:0;border-left:4px solid rgba(0,0,0,0)}.dg li.title{cursor:pointer;margin-left:-4px}.dg .closed li:not(.title),.dg .closed ul li,.dg .closed ul li > *{height:0;overflow:hidden;border:0}.dg .cr{clear:both;padding-left:3px;height:27px}.dg .property-name{cursor:default;float:left;clear:left;width:40%;overflow:hidden;text-overflow:ellipsis}.dg .c{float:left;width:60%}.dg .c input[type=text]{border:0;margin-top:4px;padding:3px;width:100%;float:right}.dg .has-slider input[type=text]{width:30%;margin-left:0}.dg .slider{float:left;width:66%;margin-left:-5px;margin-right:0;height:19px;margin-top:4px}.dg .slider-fg{height:100%}.dg .c input[type=checkbox]{margin-top:9px}.dg .c select{margin-top:5px}.dg .cr.function,.dg .cr.function .property-name,.dg .cr.function *,.dg .cr.boolean,.dg .cr.boolean *{cursor:pointer}.dg .selector{display:none;position:absolute;margin-left:-9px;margin-top:23px;z-index:10}.dg .c:hover .selector,.dg .selector.drag{display:block}.dg li.save-row{padding:0}.dg li.save-row .button{display:inline-block;padding:0px 6px}.dg.dialogue{background-color:#222;width:460px;padding:15px;font-size:13px;line-height:15px}#dg-new-constructor{padding:10px;color:#222;font-family:Monaco, monospace;font-size:10px;border:0;resize:none;box-shadow:inset 1px 1px 1px #888;word-wrap:break-word;margin:12px 0;display:block;width:440px;overflow-y:scroll;height:100px;position:relative}#dg-local-explain{display:none;font-size:11px;line-height:17px;border-radius:3px;background-color:#333;padding:8px;margin-top:10px}#dg-local-explain code{font-size:10px}#dat-gui-save-locally{display:none}.dg{color:#eee;font:11px 'Lucida Grande', sans-serif;text-shadow:0 -1px 0 #111}.dg.main::-webkit-scrollbar{width:5px;background:#1a1a1a}.dg.main::-webkit-scrollbar-corner{height:0;display:none}.dg.main::-webkit-scrollbar-thumb{border-radius:5px;background:#676767}.dg li:not(.folder){background:#1a1a1a;border-bottom:1px solid #2c2c2c}.dg li.save-row{line-height:25px;background:#dad5cb;border:0}.dg li.save-row select{margin-left:5px;width:108px}.dg li.save-row .button{margin-left:5px;margin-top:1px;border-radius:2px;font-size:9px;line-height:7px;padding:4px 4px 5px 4px;background:#c5bdad;color:#fff;text-shadow:0 1px 0 #b0a58f;box-shadow:0 -1px 0 #b0a58f;cursor:pointer}.dg li.save-row .button.gears{background:#c5bdad url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAANCAYAAAB/9ZQ7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQJJREFUeNpiYKAU/P//PwGIC/ApCABiBSAW+I8AClAcgKxQ4T9hoMAEUrxx2QSGN6+egDX+/vWT4e7N82AMYoPAx/evwWoYoSYbACX2s7KxCxzcsezDh3evFoDEBYTEEqycggWAzA9AuUSQQgeYPa9fPv6/YWm/Acx5IPb7ty/fw+QZblw67vDs8R0YHyQhgObx+yAJkBqmG5dPPDh1aPOGR/eugW0G4vlIoTIfyFcA+QekhhHJhPdQxbiAIguMBTQZrPD7108M6roWYDFQiIAAv6Aow/1bFwXgis+f2LUAynwoIaNcz8XNx3Dl7MEJUDGQpx9gtQ8YCueB+D26OECAAQDadt7e46D42QAAAABJRU5ErkJggg==) 2px 1px no-repeat;height:7px;width:8px}.dg li.save-row .button:hover{background-color:#bab19e;box-shadow:0 -1px 0 #b0a58f}.dg li.folder{border-bottom:0}.dg li.title{padding-left:16px;background:#000 url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.2)}.dg .closed li.title{background-image:url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlGIWqMCbWAEAOw==)}.dg .cr.boolean{border-left:3px solid #806787}.dg .cr.function{border-left:3px solid #e61d5f}.dg .cr.number{border-left:3px solid #2fa1d6}.dg .cr.number input[type=text]{color:#2fa1d6}.dg .cr.string{border-left:3px solid #1ed36f}.dg .cr.string input[type=text]{color:#1ed36f}.dg .cr.function:hover,.dg .cr.boolean:hover{background:#111}.dg .c input[type=text]{background:#303030;outline:none}.dg .c input[type=text]:hover{background:#3c3c3c}.dg .c input[type=text]:focus{background:#494949;color:#fff}.dg .c .slider{background:#303030;cursor:ew-resize}.dg .c .slider-fg{background:#2fa1d6}.dg .c .slider:hover{background:#3c3c3c}.dg .c .slider:hover .slider-fg{background:#44abda}\n",
dat.controllers.factory=function(e,a,c,d,f,b,n){return function(h,j,m,l){var o=h[j];if(n.isArray(m)||n.isObject(m))return new e(h,j,m);if(n.isNumber(o))return n.isNumber(m)&&n.isNumber(l)?new c(h,j,m,l):new a(h,j,{min:m,max:l});if(n.isString(o))return new d(h,j);if(n.isFunction(o))return new f(h,j,"");if(n.isBoolean(o))return new b(h,j)}}(dat.controllers.OptionController,dat.controllers.NumberControllerBox,dat.controllers.NumberControllerSlider,dat.controllers.StringController=function(e,a,c){var d=
function(c,b){function e(){h.setValue(h.__input.value)}d.superclass.call(this,c,b);var h=this;this.__input=document.createElement("input");this.__input.setAttribute("type","text");a.bind(this.__input,"keyup",e);a.bind(this.__input,"change",e);a.bind(this.__input,"blur",function(){h.__onFinishChange&&h.__onFinishChange.call(h,h.getValue())});a.bind(this.__input,"keydown",function(a){a.keyCode===13&&this.blur()});this.updateDisplay();this.domElement.appendChild(this.__input)};d.superclass=e;c.extend(d.prototype,
e.prototype,{updateDisplay:function(){if(!a.isActive(this.__input))this.__input.value=this.getValue();return d.superclass.prototype.updateDisplay.call(this)}});return d}(dat.controllers.Controller,dat.dom.dom,dat.utils.common),dat.controllers.FunctionController,dat.controllers.BooleanController,dat.utils.common),dat.controllers.Controller,dat.controllers.BooleanController,dat.controllers.FunctionController,dat.controllers.NumberControllerBox,dat.controllers.NumberControllerSlider,dat.controllers.OptionController,
dat.controllers.ColorController=function(e,a,c,d,f){function b(a,b,c,d){a.style.background="";f.each(j,function(e){a.style.cssText+="background: "+e+"linear-gradient("+b+", "+c+" 0%, "+d+" 100%); "})}function n(a){a.style.background="";a.style.cssText+="background: -moz-linear-gradient(top,  #ff0000 0%, #ff00ff 17%, #0000ff 34%, #00ffff 50%, #00ff00 67%, #ffff00 84%, #ff0000 100%);";a.style.cssText+="background: -webkit-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);";
a.style.cssText+="background: -o-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);";a.style.cssText+="background: -ms-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);";a.style.cssText+="background: linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);"}var h=function(e,l){function o(b){q(b);a.bind(window,"mousemove",q);a.bind(window,
"mouseup",j)}function j(){a.unbind(window,"mousemove",q);a.unbind(window,"mouseup",j)}function g(){var a=d(this.value);a!==false?(p.__color.__state=a,p.setValue(p.__color.toOriginal())):this.value=p.__color.toString()}function i(){a.unbind(window,"mousemove",s);a.unbind(window,"mouseup",i)}function q(b){b.preventDefault();var c=a.getWidth(p.__saturation_field),d=a.getOffset(p.__saturation_field),e=(b.clientX-d.left+document.body.scrollLeft)/c,b=1-(b.clientY-d.top+document.body.scrollTop)/c;b>1?b=
1:b<0&&(b=0);e>1?e=1:e<0&&(e=0);p.__color.v=b;p.__color.s=e;p.setValue(p.__color.toOriginal());return false}function s(b){b.preventDefault();var c=a.getHeight(p.__hue_field),d=a.getOffset(p.__hue_field),b=1-(b.clientY-d.top+document.body.scrollTop)/c;b>1?b=1:b<0&&(b=0);p.__color.h=b*360;p.setValue(p.__color.toOriginal());return false}h.superclass.call(this,e,l);this.__color=new c(this.getValue());this.__temp=new c(0);var p=this;this.domElement=document.createElement("div");a.makeSelectable(this.domElement,
false);this.__selector=document.createElement("div");this.__selector.className="selector";this.__saturation_field=document.createElement("div");this.__saturation_field.className="saturation-field";this.__field_knob=document.createElement("div");this.__field_knob.className="field-knob";this.__field_knob_border="2px solid ";this.__hue_knob=document.createElement("div");this.__hue_knob.className="hue-knob";this.__hue_field=document.createElement("div");this.__hue_field.className="hue-field";this.__input=
document.createElement("input");this.__input.type="text";this.__input_textShadow="0 1px 1px ";a.bind(this.__input,"keydown",function(a){a.keyCode===13&&g.call(this)});a.bind(this.__input,"blur",g);a.bind(this.__selector,"mousedown",function(){a.addClass(this,"drag").bind(window,"mouseup",function(){a.removeClass(p.__selector,"drag")})});var t=document.createElement("div");f.extend(this.__selector.style,{width:"122px",height:"102px",padding:"3px",backgroundColor:"#222",boxShadow:"0px 1px 3px rgba(0,0,0,0.3)"});
f.extend(this.__field_knob.style,{position:"absolute",width:"12px",height:"12px",border:this.__field_knob_border+(this.__color.v<0.5?"#fff":"#000"),boxShadow:"0px 1px 3px rgba(0,0,0,0.5)",borderRadius:"12px",zIndex:1});f.extend(this.__hue_knob.style,{position:"absolute",width:"15px",height:"2px",borderRight:"4px solid #fff",zIndex:1});f.extend(this.__saturation_field.style,{width:"100px",height:"100px",border:"1px solid #555",marginRight:"3px",display:"inline-block",cursor:"pointer"});f.extend(t.style,
{width:"100%",height:"100%",background:"none"});b(t,"top","rgba(0,0,0,0)","#000");f.extend(this.__hue_field.style,{width:"15px",height:"100px",display:"inline-block",border:"1px solid #555",cursor:"ns-resize"});n(this.__hue_field);f.extend(this.__input.style,{outline:"none",textAlign:"center",color:"#fff",border:0,fontWeight:"bold",textShadow:this.__input_textShadow+"rgba(0,0,0,0.7)"});a.bind(this.__saturation_field,"mousedown",o);a.bind(this.__field_knob,"mousedown",o);a.bind(this.__hue_field,"mousedown",
function(b){s(b);a.bind(window,"mousemove",s);a.bind(window,"mouseup",i)});this.__saturation_field.appendChild(t);this.__selector.appendChild(this.__field_knob);this.__selector.appendChild(this.__saturation_field);this.__selector.appendChild(this.__hue_field);this.__hue_field.appendChild(this.__hue_knob);this.domElement.appendChild(this.__input);this.domElement.appendChild(this.__selector);this.updateDisplay()};h.superclass=e;f.extend(h.prototype,e.prototype,{updateDisplay:function(){var a=d(this.getValue());
if(a!==false){var e=false;f.each(c.COMPONENTS,function(b){if(!f.isUndefined(a[b])&&!f.isUndefined(this.__color.__state[b])&&a[b]!==this.__color.__state[b])return e=true,{}},this);e&&f.extend(this.__color.__state,a)}f.extend(this.__temp.__state,this.__color.__state);this.__temp.a=1;var h=this.__color.v<0.5||this.__color.s>0.5?255:0,j=255-h;f.extend(this.__field_knob.style,{marginLeft:100*this.__color.s-7+"px",marginTop:100*(1-this.__color.v)-7+"px",backgroundColor:this.__temp.toString(),border:this.__field_knob_border+
"rgb("+h+","+h+","+h+")"});this.__hue_knob.style.marginTop=(1-this.__color.h/360)*100+"px";this.__temp.s=1;this.__temp.v=1;b(this.__saturation_field,"left","#fff",this.__temp.toString());f.extend(this.__input.style,{backgroundColor:this.__input.value=this.__color.toString(),color:"rgb("+h+","+h+","+h+")",textShadow:this.__input_textShadow+"rgba("+j+","+j+","+j+",.7)"})}});var j=["-moz-","-o-","-webkit-","-ms-",""];return h}(dat.controllers.Controller,dat.dom.dom,dat.color.Color=function(e,a,c,d){function f(a,
b,c){Object.defineProperty(a,b,{get:function(){if(this.__state.space==="RGB")return this.__state[b];n(this,b,c);return this.__state[b]},set:function(a){if(this.__state.space!=="RGB")n(this,b,c),this.__state.space="RGB";this.__state[b]=a}})}function b(a,b){Object.defineProperty(a,b,{get:function(){if(this.__state.space==="HSV")return this.__state[b];h(this);return this.__state[b]},set:function(a){if(this.__state.space!=="HSV")h(this),this.__state.space="HSV";this.__state[b]=a}})}function n(b,c,e){if(b.__state.space===
"HEX")b.__state[c]=a.component_from_hex(b.__state.hex,e);else if(b.__state.space==="HSV")d.extend(b.__state,a.hsv_to_rgb(b.__state.h,b.__state.s,b.__state.v));else throw"Corrupted color state";}function h(b){var c=a.rgb_to_hsv(b.r,b.g,b.b);d.extend(b.__state,{s:c.s,v:c.v});if(d.isNaN(c.h)){if(d.isUndefined(b.__state.h))b.__state.h=0}else b.__state.h=c.h}var j=function(){this.__state=e.apply(this,arguments);if(this.__state===false)throw"Failed to interpret color arguments";this.__state.a=this.__state.a||
1};j.COMPONENTS="r,g,b,h,s,v,hex,a".split(",");d.extend(j.prototype,{toString:function(){return c(this)},toOriginal:function(){return this.__state.conversion.write(this)}});f(j.prototype,"r",2);f(j.prototype,"g",1);f(j.prototype,"b",0);b(j.prototype,"h");b(j.prototype,"s");b(j.prototype,"v");Object.defineProperty(j.prototype,"a",{get:function(){return this.__state.a},set:function(a){this.__state.a=a}});Object.defineProperty(j.prototype,"hex",{get:function(){if(!this.__state.space!=="HEX")this.__state.hex=
a.rgb_to_hex(this.r,this.g,this.b);return this.__state.hex},set:function(a){this.__state.space="HEX";this.__state.hex=a}});return j}(dat.color.interpret,dat.color.math=function(){var e;return{hsv_to_rgb:function(a,c,d){var e=a/60-Math.floor(a/60),b=d*(1-c),n=d*(1-e*c),c=d*(1-(1-e)*c),a=[[d,c,b],[n,d,b],[b,d,c],[b,n,d],[c,b,d],[d,b,n]][Math.floor(a/60)%6];return{r:a[0]*255,g:a[1]*255,b:a[2]*255}},rgb_to_hsv:function(a,c,d){var e=Math.min(a,c,d),b=Math.max(a,c,d),e=b-e;if(b==0)return{h:NaN,s:0,v:0};
a=a==b?(c-d)/e:c==b?2+(d-a)/e:4+(a-c)/e;a/=6;a<0&&(a+=1);return{h:a*360,s:e/b,v:b/255}},rgb_to_hex:function(a,c,d){a=this.hex_with_component(0,2,a);a=this.hex_with_component(a,1,c);return a=this.hex_with_component(a,0,d)},component_from_hex:function(a,c){return a>>c*8&255},hex_with_component:function(a,c,d){return d<<(e=c*8)|a&~(255<<e)}}}(),dat.color.toString,dat.utils.common),dat.color.interpret,dat.utils.common),dat.utils.requestAnimationFrame=function(){return window.webkitRequestAnimationFrame||
window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(e){window.setTimeout(e,1E3/60)}}(),dat.dom.CenteredDiv=function(e,a){var c=function(){this.backgroundElement=document.createElement("div");a.extend(this.backgroundElement.style,{backgroundColor:"rgba(0,0,0,0.8)",top:0,left:0,display:"none",zIndex:"1000",opacity:0,WebkitTransition:"opacity 0.2s linear"});e.makeFullscreen(this.backgroundElement);this.backgroundElement.style.position="fixed";this.domElement=
document.createElement("div");a.extend(this.domElement.style,{position:"fixed",display:"none",zIndex:"1001",opacity:0,WebkitTransition:"-webkit-transform 0.2s ease-out, opacity 0.2s linear"});document.body.appendChild(this.backgroundElement);document.body.appendChild(this.domElement);var c=this;e.bind(this.backgroundElement,"click",function(){c.hide()})};c.prototype.show=function(){var c=this;this.backgroundElement.style.display="block";this.domElement.style.display="block";this.domElement.style.opacity=
0;this.domElement.style.webkitTransform="scale(1.1)";this.layout();a.defer(function(){c.backgroundElement.style.opacity=1;c.domElement.style.opacity=1;c.domElement.style.webkitTransform="scale(1)"})};c.prototype.hide=function(){var a=this,c=function(){a.domElement.style.display="none";a.backgroundElement.style.display="none";e.unbind(a.domElement,"webkitTransitionEnd",c);e.unbind(a.domElement,"transitionend",c);e.unbind(a.domElement,"oTransitionEnd",c)};e.bind(this.domElement,"webkitTransitionEnd",
c);e.bind(this.domElement,"transitionend",c);e.bind(this.domElement,"oTransitionEnd",c);this.backgroundElement.style.opacity=0;this.domElement.style.opacity=0;this.domElement.style.webkitTransform="scale(1.1)"};c.prototype.layout=function(){this.domElement.style.left=window.innerWidth/2-e.getWidth(this.domElement)/2+"px";this.domElement.style.top=window.innerHeight/2-e.getHeight(this.domElement)/2+"px"};return c}(dat.dom.dom,dat.utils.common),dat.dom.dom,dat.utils.common);
