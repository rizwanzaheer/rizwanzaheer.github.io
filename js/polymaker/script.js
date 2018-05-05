function initPolygon() {
    var pt = new PathTris();
    pt.init();
    //setTimeout(function(){
      $('#particles1').particleground({
        dotColor: '#999999',
        lineColor: '#666666',
        density:20000,
        particleRadius:2.5,
        lineWidth:0.1,
        curvedLines:false,
        parallax:true,
        minSpeedX:0.1,
        maxSpeedX:0.2,
        minSpeedY:0.1,
        maxSpeedY:0.2,
        proximity:200,
      });
    //},5000);

}